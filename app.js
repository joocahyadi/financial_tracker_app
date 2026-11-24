// Ledgerly Minimalist PWA Finance Tracker

// 1. Configuration & API URL
// Reads from window.__ENV__ (loaded via config.js / .env)
const API_URL = (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.PWA_API_URL)
  ? window.__ENV__.PWA_API_URL.trim()
  : "";

// Clean up any legacy dummy cache
try {
  localStorage.removeItem("ledgerly_txs");
} catch (e) { }

// 1. Initial State & Category Schema
const INITIAL_CATEGORIES = [
  {
    id: "daily-expense",
    name: "Daily Expense",
    icon: "shopping_bag",
    spent: 0,
    budget: 4000000,
    subtitle: "Groceries, Meals & Coffee",
    caution: false,
    subitems: [
      { name: "Groceries & Supermarket", spent: 0, budget: 2000000 },
      { name: "Meals & Dinners", spent: 0, budget: 1400000 },
      { name: "Coffee & Snacks", spent: 0, budget: 600000 },
    ]
  },
  {
    id: "transport",
    name: "Transport",
    icon: "directions_car",
    spent: 0,
    budget: 1500000,
    subtitle: "Fuel, Tolls & Parking",
    caution: false,
    subitems: [
      { name: "Petrol (Pertamax)", spent: 0, budget: 1000000 },
      { name: "Parking & Grab", spent: 0, budget: 500000 },
    ]
  },
  {
    id: "subscription",
    name: "Subscription",
    icon: "subscriptions",
    spent: 0,
    budget: 1200000,
    subtitle: "Streaming, Gym & Memberships",
    caution: false,
    subitems: [
      { name: "Digital Services & Cloud", spent: 0, budget: 450000 },
    ]
  },
  {
    id: "general",
    name: "General",
    icon: "payments",
    spent: 0,
    budget: 3500000,
    subtitle: "Shopping & Miscellaneous",
    caution: false,
    subitems: [
      { name: "Online Shopping", spent: 0, budget: 2000000 },
      { name: "Other Outflows", spent: 0, budget: 1500000 },
    ]
  }
];

function getStoredTransactions() {
  try {
    const data = localStorage.getItem("ledgerly_sheet_records");
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading localStorage:", e);
  }
  return [];
}

let transactions = getStoredTransactions();
let categories = INITIAL_CATEGORIES;
let currentTab = "records"; // Focus on records tab
let isSyncing = false;
let selectedSalaryMonth = "2026-11"; // Default active salary month

// Keypad & Add Form State
let newTxType = "expense";
let newTxAmountStr = "45000";
let newTxCategory = "Daily Expense";
let newTxChannel = "Credit Card";

// Helpers
function formatRupiah(num) {
  const rounded = Math.round(Number(num) || 0);
  return "Rp " + rounded.toLocaleString("id-ID");
}

function getAvailableSalaryMonths() {
  const set = new Set();
  transactions.forEach((tx) => {
    const sm = tx.salary_month || (tx.date ? tx.date.substring(0, 7) : "");
    if (sm && sm.length >= 7) set.add(sm.substring(0, 7));
  });
  const arr = Array.from(set).sort();
  return arr.length > 0 ? arr : ["2026-11"];
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey.length < 7) return { full: monthKey, short: monthKey };
  const parts = monthKey.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const d = new Date(year, month, 1);
  return {
    full: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    short: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase()
  };
}

function changeMonth(direction) {
  const available = getAvailableSalaryMonths();
  let currentIndex = available.indexOf(selectedSalaryMonth);
  if (currentIndex === -1) currentIndex = available.length - 1;

  let newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < available.length) {
    selectedSalaryMonth = available[newIndex];
    updateCategoryBudgets();
    renderOverview();
    renderRecords();
  }
}

function getCategoryIcon(catName = "", payee = "") {
  const text = (catName + " " + payee).toLowerCase();
  if (text.includes("coffee") || text.includes("sbux") || text.includes("tuku") || text.includes("jus")) return "coffee";
  if (text.includes("grab") || text.includes("mrt") || text.includes("petrol") || text.includes("spbu") || text.includes("transport")) return "directions_car";
  if (text.includes("tokopedia") || text.includes("shopee") || text.includes("uniqlo") || text.includes("shopping")) return "shopping_bag";
  if (text.includes("bakmi") || text.includes("restaurant") || text.includes("ramen") || text.includes("nasi") || text.includes("food")) return "restaurant";
  if (text.includes("gym") || text.includes("ftl") || text.includes("fitness")) return "fitness_center";
  if (text.includes("google") || text.includes("spotv") || text.includes("vidio") || text.includes("subscrip") || text.includes("cloud")) return "subscriptions";
  if (text.includes("barber") || text.includes("captain")) return "content_cut";
  if (text.includes("clean") || text.includes("fres")) return "local_laundry_service";
  if (text.includes("giveback") || text.includes("perpuluhan") || text.includes("tithe") || text.includes("donation") || text.includes("gereja")) return "volunteer_activism";
  if (text.includes("income") || text.includes("payroll") || text.includes("salary") || text.includes("reversal") || text.includes("refund")) return "payments";
  return "receipt_long";
}

function formatDateGroup(dateStr) {
  if (!dateStr) return { label: "Earlier", sub: "" };
  try {
    const cleanStr = String(dateStr).split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      return {
        label: `${dayOfWeek}, ${monthName} ${day} ${year}`,
        sub: ""
      };
    }
  } catch (e) { }
  return { label: dateStr, sub: "" };
}

// 2. DOM Elements
const views = {
  overview: document.getElementById("view-overview"),
  add: document.getElementById("view-add"),
  records: document.getElementById("view-records"),
};

const navButtons = {
  overview: document.getElementById("nav-btn-overview"),
  add: document.getElementById("nav-btn-add"),
  records: document.getElementById("nav-btn-records"),
};

const headerSubtitle = document.getElementById("header-subtitle");
const themeToggleBtn = document.getElementById("theme-toggle-btn");
const themeIcon = document.getElementById("theme-icon");
const syncNowBtn = document.getElementById("sync-now-btn");
const syncNowIcon = document.getElementById("sync-now-icon");
const syncStatusBadge = document.getElementById("sync-status-badge");
const syncStatusText = document.getElementById("sync-status-text");
const syncStatusDot = document.getElementById("sync-status-dot");

// 3. Tab Switching
function switchTab(target) {
  currentTab = target;
  Object.keys(views).forEach((key) => {
    if (key === target) {
      views[key].classList.add("active");
    } else {
      views[key].classList.remove("active");
    }
  });

  if (target === "overview") {
    headerSubtitle.textContent = "Overview";
    navButtons.overview.className = "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-primary transition-all group";
    navButtons.overview.querySelector("div").className = "w-10 h-7 rounded-full flex items-center justify-center bg-primary/10 transition-colors";
    navButtons.records.className = "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-all group";
    navButtons.records.querySelector("div").className = "w-10 h-7 rounded-full flex items-center justify-center transition-colors";
  } else if (target === "records") {
    headerSubtitle.textContent = "Records";
    navButtons.records.className = "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-primary transition-all group";
    navButtons.records.querySelector("div").className = "w-10 h-7 rounded-full flex items-center justify-center bg-primary/10 transition-colors";
    navButtons.overview.className = "flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-all group";
    navButtons.overview.querySelector("div").className = "w-10 h-7 rounded-full flex items-center justify-center transition-colors";
  } else if (target === "add") {
    headerSubtitle.textContent = "Add Transaction";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navButtons.overview.addEventListener("click", () => switchTab("overview"));
navButtons.add.addEventListener("click", () => switchTab("add"));
navButtons.records.addEventListener("click", () => switchTab("records"));

document.getElementById("back-to-overview-btn").addEventListener("click", () => switchTab("records"));
document.getElementById("add-quick-tx-btn").addEventListener("click", () => switchTab("add"));

// Month Navigation Listeners
document.getElementById("prev-month-btn")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("next-month-btn")?.addEventListener("click", () => changeMonth(1));
document.getElementById("records-prev-month-btn")?.addEventListener("click", () => changeMonth(-1));
document.getElementById("records-next-month-btn")?.addEventListener("click", () => changeMonth(1));

// 4. Fetch Google Sheet Transactions
async function fetchSheetData(isManual = false) {
  if (!API_URL) {
    console.warn("API_URL is not configured. Please define PWA_API_URL in .env or config.js");
    if (syncStatusText) syncStatusText.textContent = "CONFIG REQUIRED";
    if (syncStatusDot) syncStatusDot.className = "w-1.5 h-1.5 rounded-full bg-amber-400";
    if (isManual) {
      showToast("PWA_API_URL is not configured. Set it in .env or config.js", "error");
    }
    return;
  }

  if (isSyncing) return;
  isSyncing = true;

  if (syncNowIcon) syncNowIcon.classList.add("animate-spin");
  if (syncStatusText) syncStatusText.textContent = "SYNCING...";
  if (syncStatusDot) {
    syncStatusDot.className = "w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping";
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP error " + res.status);
    const data = await res.json();

    if (data.status === "success" && Array.isArray(data.records)) {
      // Sort newest first
      transactions = data.records.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      // Ensure salary_month is present
      transactions.forEach(t => {
        if (!t.salary_month) {
          t.salary_month = t.date ? t.date.substring(0, 7) : "2026-11";
        }
      });

      // Save to localStorage for offline cache
      localStorage.setItem("ledgerly_sheet_records", JSON.stringify(transactions));
      localStorage.setItem("ledgerly_last_sync", new Date().toISOString());

      // Update active month to latest available if not in list
      const available = getAvailableSalaryMonths();
      if (!available.includes(selectedSalaryMonth) && available.length > 0) {
        selectedSalaryMonth = available[available.length - 1];
      }

      updateCategoryBudgets();
      renderRecords();
      renderOverview();

      if (syncStatusText) syncStatusText.textContent = `SYNCED LIVE (${transactions.length})`;
      if (syncStatusDot) syncStatusDot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse";
      if (syncStatusBadge) {
        syncStatusBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-semibold tracking-wider uppercase w-fit mt-1 cursor-pointer";
      }

      if (isManual) {
        showToast(`Synced ${transactions.length} records from Google Sheet`);
      }
    } else {
      throw new Error(data.message || "Failed to parse records");
    }
  } catch (err) {
    console.warn("Sheet fetch error (using cache):", err);
    if (syncStatusText) syncStatusText.textContent = `OFFLINE (${transactions.length})`;
    if (syncStatusDot) syncStatusDot.className = "w-1.5 h-1.5 rounded-full bg-amber-400";
    if (isManual) {
      showToast("Unable to reach Google Sheet. Showing offline records.", "error");
    }
  } finally {
    isSyncing = false;
    if (syncNowIcon) syncNowIcon.classList.remove("animate-spin");
  }
}

// Calculate Categories Spent from Month Transactions
function updateCategoryBudgets() {
  categories.forEach((cat) => {
    cat.spent = 0;
    cat.subitems.forEach((sub) => (sub.spent = 0));
  });

  const monthTxs = transactions.filter((tx) => {
    const sm = tx.salary_month || (tx.date ? tx.date.substring(0, 7) : "");
    return sm === selectedSalaryMonth;
  });

  monthTxs.forEach((tx) => {
    if (tx.type !== "expense") return;
    const catName = (tx.category || "").toLowerCase();
    const matched = categories.find((c) => catName.includes(c.id) || c.name.toLowerCase().includes(catName));

    if (matched) {
      matched.spent += tx.amount;
    } else {
      const general = categories.find((c) => c.id === "general");
      if (general) general.spent += tx.amount;
    }
  });
}

// 5. Render Overview View (Filtered by selectedSalaryMonth)
function renderOverview() {
  const monthMeta = formatMonthLabel(selectedSalaryMonth);
  const overviewMonthLabel = document.getElementById("selected-month-label");
  if (overviewMonthLabel) {
    overviewMonthLabel.textContent = `Salary Month: ${monthMeta.full}`;
  }

  const monthTxs = transactions.filter((tx) => {
    const sm = tx.salary_month || (tx.date ? tx.date.substring(0, 7) : "");
    return sm === selectedSalaryMonth;
  });

  const totalCap = 14000000;
  let totalSpent = 0;
  let totalIncome = 0;

  monthTxs.forEach((tx) => {
    if (tx.type === "expense") {
      totalSpent += tx.amount;
    } else if (tx.type === "income") {
      totalIncome += tx.amount;
    }
  });

  const remaining = Math.max(0, totalCap - totalSpent);
  const percentLeft = Math.max(0, Math.min(100, Math.round((remaining / totalCap) * 100)));
  const percentSpent = Math.max(0, Math.min(100, Math.round((totalSpent / totalCap) * 100)));

  document.getElementById("hero-remaining-amount").textContent = formatRupiah(remaining);
  document.getElementById("budget-left-badge").textContent = `${percentLeft}% LEFT`;
  document.getElementById("hero-circle-percent").textContent = `${percentLeft}%`;

  const offset = 175.93 * (1 - percentLeft / 100);
  const circleEl = document.getElementById("hero-circle-progress");
  if (circleEl) {
    circleEl.style.strokeDashoffset = offset.toFixed(1);
  }

  document.getElementById("hero-gauge-spent").style.width = `${percentSpent}%`;
  document.getElementById("hero-gauge-rem").style.width = `${100 - percentSpent}%`;
  document.getElementById("hero-spent-summary").textContent = `${formatRupiah(totalSpent)} SPENT`;
  document.getElementById("hero-remaining-summary").textContent = `${formatRupiah(remaining)} REMAINING`;

  document.getElementById("stat-total-spent").textContent = formatRupiah(totalSpent);
  document.getElementById("stat-total-income").textContent = formatRupiah(totalIncome);

  // Render Accordion
  const accordionContainer = document.getElementById("category-accordion-list");
  accordionContainer.innerHTML = "";

  categories.forEach((cat, index) => {
    const percent = Math.min(100, Math.round((cat.spent / (cat.budget || 1)) * 100));
    const isCaution = percent >= 75;
    const barColor = isCaution ? "bg-secondary-fixed-dim" : "bg-primary";
    const percentTextColor = isCaution ? "text-secondary" : "text-primary";

    const detailsEl = document.createElement("details");
    detailsEl.className = "group bg-surface-container rounded-xl shadow-sm hover:bg-surface-container-high transition-colors overflow-hidden border border-white/5";
    if (index === 0) detailsEl.open = true;

    detailsEl.innerHTML = `
      <summary class="list-none cursor-pointer p-3.5 flex flex-col gap-2.5 select-none">
        <div class="flex items-start gap-3">
          <div class="w-9 h-9 rounded-lg bg-surface-bright/50 text-primary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[18px]">${cat.icon}</span>
          </div>
          <div class="flex flex-col flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-sm font-semibold text-on-surface">${cat.name}</span>
                ${isCaution ? '<span class="bg-secondary/15 text-secondary text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold uppercase">Caution</span>' : ''}
              </div>
              <div class="flex items-center gap-1">
                <span class="font-mono text-xs ${percentTextColor} font-semibold shrink-0">${percent}%</span>
                <span class="material-symbols-outlined text-[16px] text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span>
              </div>
            </div>
            <div class="font-mono text-xs text-on-surface font-semibold mt-0.5">
              ${formatRupiah(cat.spent)} <span class="text-on-surface-variant font-normal text-[11px]">/ ${formatRupiah(cat.budget)}</span>
            </div>
            <span class="text-xs text-on-surface-variant mt-0.5">${cat.subtitle}</span>
          </div>
        </div>
        <div class="w-full h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
          <div class="h-full ${barColor} rounded-full" style="width: ${percent}%"></div>
        </div>
      </summary>
    `;

    accordionContainer.appendChild(detailsEl);
  });
}

// 6. Render Records View (Strictly for selectedSalaryMonth, grouped by transaction_date)
function renderRecords(query = "", filterType = "all") {
  const feed = document.getElementById("records-transaction-feed");
  feed.innerHTML = "";

  // Filter transactions strictly for the active salary_month
  const monthTxs = transactions.filter((tx) => {
    const sm = tx.salary_month || (tx.date ? tx.date.substring(0, 7) : "");
    return sm === selectedSalaryMonth;
  });

  // Apply Search & Filter Pills
  let filtered = monthTxs.filter((tx) => {
    if (filterType === "expense" && tx.type !== "expense") return false;
    if (filterType === "income" && tx.type !== "income") return false;
    if (filterType === "Credit Card" && !tx.channel.toLowerCase().includes("credit")) return false;
    if (filterType === "Debit Card" && !tx.channel.toLowerCase().includes("debit")) return false;

    if (query) {
      const q = query.toLowerCase();
      const matchPayee = (tx.payee || "").toLowerCase().includes(q);
      const matchCat = (tx.category || "").toLowerCase().includes(q);
      const matchAcc = (tx.account || "").toLowerCase().includes(q);
      const matchChannel = (tx.channel || "").toLowerCase().includes(q);
      if (!matchPayee && !matchCat && !matchAcc && !matchChannel) return false;
    }
    return true;
  });

  // 1. Update Month Header & Top Cadence Card
  const monthMeta = formatMonthLabel(selectedSalaryMonth);
  const salaryBadge = document.getElementById("records-salary-month-badge");
  const monthTitle = document.getElementById("records-month-title");
  const txCountSub = document.getElementById("records-tx-count-sub");
  const dateRangeEl = document.getElementById("records-month-date-range");

  if (salaryBadge) salaryBadge.textContent = `SALARY MONTH: ${monthMeta.short}`;
  if (monthTitle) monthTitle.textContent = monthMeta.full;
  if (txCountSub) txCountSub.textContent = `${monthTxs.length} verified transactions from sheet`;

  // Calculate Date range from transactions in this month
  if (dateRangeEl) {
    if (monthTxs.length > 0) {
      const dates = monthTxs.map(t => t.date).filter(Boolean).sort();
      const first = formatDateGroup(dates[0]);
      const last = formatDateGroup(dates[dates.length - 1]);
      if (first.label === last.label) {
        dateRangeEl.textContent = first.label;
      } else {
        dateRangeEl.textContent = `${first.label} – ${last.label}`;
      }
    } else {
      dateRangeEl.textContent = monthMeta.full;
    }
  }

  // 2. Update Filter Pill Badges for this month
  const expenseCount = monthTxs.filter((t) => t.type === "expense").length;
  const incomeCount = monthTxs.filter((t) => t.type === "income").length;
  document.getElementById("badge-count-all").textContent = monthTxs.length;
  document.getElementById("badge-count-expense").textContent = expenseCount;
  document.getElementById("badge-count-income").textContent = incomeCount;

  // 3. Calculate Inflow, Outflow, Total Spending for this month (Positive POV for outflow)
  let totalIn = 0;
  let totalOut = 0;
  monthTxs.forEach((t) => {
    if (t.type === "income") totalIn += t.amount;
    else totalOut += t.amount;
  });

  // POV Positive for Outflow: Total Spending = Outflow - Inflow (Red for spending, Green for net income)
  const netSpending = totalOut - totalIn;
  const spendingPrefix = netSpending >= 0 ? "+Rp " : "-Rp ";
  const spendingColor = netSpending >= 0 ? "text-secondary" : "text-primary";
  const netEl = document.getElementById("records-net-cashflow");
  if (netEl) {
    netEl.textContent = spendingPrefix + Math.round(Math.abs(netSpending)).toLocaleString("id-ID");
    netEl.className = `text-sm font-mono font-semibold tracking-tight ${spendingColor}`;
  }

  // Reverse sign for In and Out (Positive for outflow)
  const outEl = document.getElementById("records-cadence-out");
  const inEl = document.getElementById("records-cadence-in");
  if (outEl) outEl.textContent = `+${formatRupiah(totalOut)} Out`;
  if (inEl) inEl.textContent = `-${formatRupiah(totalIn)} In`;

  // Pulse Bar ratio: Outflow is primary
  const totalVolume = totalIn + totalOut;
  const outPercent = totalVolume > 0 ? Math.round((totalOut / totalVolume) * 100) : 50;
  const inPercent = totalVolume > 0 ? (100 - outPercent) : 50;
  const barOut = document.getElementById("records-bar-out");
  const barIn = document.getElementById("records-bar-in");
  if (barOut) barOut.style.width = `${outPercent}%`;
  if (barIn) barIn.style.width = `${inPercent}%`;

  // Empty state handling
  if (filtered.length === 0) {
    if (isSyncing && transactions.length === 0) {
      feed.innerHTML = `
        <div class="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <span class="material-symbols-outlined text-[32px] text-primary animate-spin">refresh</span>
          <span class="text-xs font-mono text-on-surface">Syncing live records from Google Sheet...</span>
        </div>
      `;
    } else {
      feed.innerHTML = `
        <div class="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[36px] text-outline">search_off</span>
          <span class="text-sm">No transactions in ${monthMeta.full} matching filter.</span>
        </div>
      `;
    }
    return;
  }

  // Sort transactions strictly descending by transaction_date (newest first)
  filtered.sort((a, b) => {
    const dateA = a.date ? a.date.split("T")[0] : "";
    const dateB = b.date ? b.date.split("T")[0] : "";
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Newest date first
    }
    return (b.amount || 0) - (a.amount || 0);
  });

  // Group strictly by transaction_date, preserving descending order
  const dateMap = new Map();
  filtered.forEach((tx) => {
    const dateKey = tx.date ? tx.date.split("T")[0] : "Earlier";
    if (!dateMap.has(dateKey)) {
      const groupInfo = formatDateGroup(dateKey);
      dateMap.set(dateKey, {
        dateKey: dateKey,
        label: groupInfo.label,
        sub: groupInfo.sub,
        items: []
      });
    }
    dateMap.get(dateKey).items.push(tx);
  });

  // Sort groups strictly from newest to oldest date
  const sortedGroups = Array.from(dateMap.values()).sort((a, b) => {
    return b.dateKey.localeCompare(a.dateKey);
  });

  sortedGroups.forEach((group) => {
    const groupEl = document.createElement("div");
    groupEl.className = "flex flex-col gap-2 w-full";

    let groupOutflow = 0;
    let groupInflow = 0;
    group.items.forEach((item) => {
      if (item.type === "income") groupInflow += item.amount;
      else groupOutflow += item.amount;
    });
    const netGroupSpending = groupOutflow - groupInflow;
    const groupSpendingFormatted = (netGroupSpending >= 0 ? "+" : "-") + formatRupiah(Math.abs(netGroupSpending));

    groupEl.innerHTML = `
      <div class="flex items-center justify-between px-1 py-0.5">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-on-surface">${group.label}</span>
          ${group.sub ? `<span class="text-xs text-on-surface-variant font-normal">${group.sub}</span>` : ""}
        </div>
        <span class="font-mono text-[10px] text-outline uppercase font-medium">${group.items.length} TXS • ${groupSpendingFormatted}</span>
      </div>
      <div class="flex flex-col gap-1.5 w-full cards-container"></div>
    `;

    const cardsContainer = groupEl.querySelector(".cards-container");
    group.items.forEach((tx) => {
      const isIncome = tx.type === "income";
      const card = document.createElement("div");
      card.className = "group w-full bg-surface-container hover:bg-surface-container-high rounded-xl p-3 flex items-center justify-between transition-all duration-150 active:scale-[0.98] cursor-pointer shadow-sm border border-white/5";

      const amountColor = isIncome ? "text-primary" : "text-secondary-fixed-dim";
      const amountPrefix = isIncome ? "+" : "-";
      const icon = getCategoryIcon(tx.category, tx.payee);

      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-surface-container-high ${isIncome ? "text-primary" : "text-secondary"} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[18px]">${icon}</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-medium text-on-surface truncate">${tx.payee}</span>
            <div class="flex items-center gap-1.5 text-[11px] mt-0.5">
              <span class="text-primary-fixed-dim font-medium">${tx.category}</span>
              <span class="text-outline/50">•</span>
              <span class="font-mono text-[10px] text-on-surface-variant uppercase font-medium">${tx.channel}</span>
            </div>
            ${tx.account ? `<span class="font-mono text-[10px] text-outline truncate max-w-[220px] mt-0.5">${tx.account}</span>` : ""}
          </div>
        </div>
        <div class="flex flex-col items-end shrink-0 pl-2">
          <span class="font-mono text-xs font-semibold ${amountColor}">${amountPrefix}${formatRupiah(tx.amount)}</span>
        </div>
      `;

      card.addEventListener("click", () => openTransactionModal(tx));
      cardsContainer.appendChild(card);
    });

    feed.appendChild(groupEl);
  });
}

// 7. Transaction Detail Modal
const modalBackdrop = document.getElementById("tx-modal-backdrop");
const modalCard = document.getElementById("tx-modal-card");

function openTransactionModal(tx) {
  const isIncome = tx.type === "income";
  document.getElementById("modal-payee").textContent = tx.payee;
  document.getElementById("modal-meta").textContent = `${isIncome ? "Income Record" : "Expense Record"} • ${tx.date || ""}`;
  document.getElementById("modal-amount").textContent = (isIncome ? "+" : "-") + formatRupiah(tx.amount);
  document.getElementById("modal-amount").className = `text-2xl font-mono font-semibold tracking-tight ${isIncome ? "text-primary" : "text-secondary"}`;
  document.getElementById("modal-method").textContent = `${tx.channel} • ${tx.account}`;
  document.getElementById("modal-category").textContent = tx.category;
  document.getElementById("modal-icon").textContent = getCategoryIcon(tx.category, tx.payee);

  modalBackdrop.classList.remove("hidden");
  modalBackdrop.classList.add("flex");
  setTimeout(() => {
    modalCard.classList.remove("translate-y-full");
  }, 10);
}

function closeTransactionModal() {
  modalCard.classList.add("translate-y-full");
  setTimeout(() => {
    modalBackdrop.classList.add("hidden");
    modalBackdrop.classList.remove("flex");
  }, 250);
}

document.getElementById("modal-close-btn").addEventListener("click", closeTransactionModal);
document.getElementById("modal-done-btn").addEventListener("click", closeTransactionModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeTransactionModal();
});
document.getElementById("modal-receipt-btn").addEventListener("click", () => {
  showToast("Record exported");
  closeTransactionModal();
});

// 8. Search & Filters in Records
const searchInput = document.getElementById("records-search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
let activeFilter = "all";

searchInput.addEventListener("input", () => {
  const val = searchInput.value.trim();
  clearSearchBtn.classList.toggle("hidden", val.length === 0);
  clearSearchBtn.classList.toggle("flex", val.length > 0);
  renderRecords(val, activeFilter);
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");
  clearSearchBtn.classList.remove("flex");
  renderRecords("", activeFilter);
  searchInput.focus();
});

document.querySelectorAll(".records-filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".records-filter-pill").forEach((p) => {
      p.className = "records-filter-pill flex-shrink-0 h-8 px-3 rounded-full font-mono text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 bg-surface-container-high text-on-surface-variant hover:text-on-surface active:scale-95";
    });
    pill.className = "records-filter-pill flex-shrink-0 h-8 px-3 rounded-full font-mono text-[11px] uppercase tracking-wider transition-all flex items-center gap-1 bg-primary text-on-primary shadow-sm font-semibold active:scale-95";

    activeFilter = pill.getAttribute("data-filter");
    renderRecords(searchInput.value.trim(), activeFilter);
  });
});

// 9. Manual Sync Triggers
if (syncNowBtn) {
  syncNowBtn.addEventListener("click", () => fetchSheetData(true));
}
if (syncStatusBadge) {
  syncStatusBadge.addEventListener("click", () => fetchSheetData(true));
}

// 10. Add Transaction Handler
function initAddView() {
  const chipsGrid = document.getElementById("category-chips-grid");
  chipsGrid.innerHTML = "";

  const categoryOptions = [
    { name: "Daily Expense", icon: "shopping_bag", short: "Daily" },
    { name: "Food & Dining", icon: "restaurant", short: "Food" },
    { name: "Transport", icon: "directions_car", short: "Transport" },
    { name: "Subscription", icon: "subscriptions", short: "Subs" },
    { name: "General", icon: "payments", short: "General" },
    { name: "Income", icon: "arrow_downward", short: "Income" },
  ];

  categoryOptions.forEach((opt) => {
    const isSelected = opt.name === newTxCategory;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `category-chip flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 ${isSelected
      ? "bg-surface-container-high text-primary shadow-sm border border-primary/30"
      : "bg-surface-container text-on-surface-variant border border-transparent"
      }`;
    btn.innerHTML = `
      <div class="w-8 h-8 rounded-lg ${isSelected ? "bg-primary/20 text-primary" : "bg-surface-container-high text-on-surface"} flex items-center justify-center mb-1">
        <span class="material-symbols-outlined text-[18px]">${opt.icon}</span>
      </div>
      <span class="text-[10px] font-mono text-center truncate w-full">${opt.short}</span>
    `;

    btn.addEventListener("click", () => {
      newTxCategory = opt.name;
      document.getElementById("add-selected-cat-label").textContent = opt.name;
      document.querySelectorAll(".category-chip").forEach((c) => {
        c.className = "category-chip flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 bg-surface-container text-on-surface-variant border border-transparent";
        c.querySelector("div").className = "w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center mb-1";
      });
      btn.className = "category-chip flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-95 bg-surface-container-high text-primary shadow-sm border border-primary/30";
      btn.querySelector("div").className = "w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-1";
    });

    chipsGrid.appendChild(btn);
  });

  // Type Toggle (Expense / Income)
  const btnExpense = document.getElementById("btn-type-expense");
  const btnIncome = document.getElementById("btn-type-income");
  const currencySymbol = document.getElementById("input-currency-symbol");

  btnExpense.addEventListener("click", () => {
    newTxType = "expense";
    btnExpense.className = "flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 bg-secondary-container text-on-secondary-container shadow-sm active:scale-98";
    btnIncome.className = "flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 text-on-surface-variant hover:text-on-surface active:scale-98";
    currencySymbol.className = "text-xl font-mono text-secondary select-none";
  });

  btnIncome.addEventListener("click", () => {
    newTxType = "income";
    btnIncome.className = "flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 bg-primary-container text-on-primary-container shadow-sm active:scale-98";
    btnExpense.className = "flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 text-on-surface-variant hover:text-on-surface active:scale-98";
    currencySymbol.className = "text-xl font-mono text-primary select-none";
  });

  // Channel Pills
  document.querySelectorAll(".channel-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".channel-pill").forEach((p) => {
        p.className = "channel-pill py-2 px-1 rounded-lg bg-surface-container text-on-surface-variant font-mono text-[11px] text-center font-medium active:scale-95 transition-all hover:text-on-surface border border-transparent";
      });
      pill.className = "channel-pill py-2 px-1 rounded-lg bg-primary/20 text-primary font-mono text-[11px] text-center font-medium border border-primary/30 active:scale-95 transition-all";
      newTxChannel = pill.getAttribute("data-channel");
      document.getElementById("amount-channel-preview").innerHTML = `
        <span class="material-symbols-outlined text-[12px] text-primary">swap_horiz</span>
        <span>IDR • ${newTxChannel}</span>
      `;
    });
  });

  // Keypad
  const amountDisplay = document.getElementById("keypad-amount-display");
  amountDisplay.textContent = Number(newTxAmountStr).toLocaleString("id-ID");

  document.querySelectorAll(".keypad-key").forEach((keyEl) => {
    keyEl.addEventListener("click", () => {
      const key = keyEl.getAttribute("data-key");
      if (key === "backspace") {
        if (newTxAmountStr.length > 1) {
          newTxAmountStr = newTxAmountStr.slice(0, -1);
        } else {
          newTxAmountStr = "0";
        }
      } else if (key === "000") {
        if (newTxAmountStr !== "0" && newTxAmountStr.length <= 7) {
          newTxAmountStr += "000";
        }
      } else {
        if (newTxAmountStr === "0") {
          newTxAmountStr = key;
        } else if (newTxAmountStr.length < 9) {
          newTxAmountStr += key;
        }
      }
      amountDisplay.textContent = Number(newTxAmountStr).toLocaleString("id-ID");
    });
  });

  // Save Transaction
  const saveBtn = document.getElementById("save-transaction-btn");
  saveBtn.addEventListener("click", () => {
    const amountNum = parseInt(newTxAmountStr, 10);
    if (!amountNum || amountNum <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    const merchant = document.getElementById("form-merchant-input").value.trim() || "Transaction";
    const account = document.getElementById("form-account-select").value;

    const newTx = {
      id: "local-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      salary_month: selectedSalaryMonth,
      payee: merchant,
      note: "",
      channel: newTxChannel,
      account: account,
      category: newTxCategory,
      type: newTxType,
      amount: amountNum
    };

    saveBtn.disabled = true;
    saveBtn.innerHTML = `
      <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
      <span>Saving...</span>
    `;

    setTimeout(() => {
      transactions.unshift(newTx);
      localStorage.setItem("ledgerly_sheet_records", JSON.stringify(transactions));

      renderOverview();
      renderRecords();

      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
        <span>Save Transaction</span>
      `;

      showToast(`Added: ${formatRupiah(amountNum)} to ${merchant}`);
      switchTab("records");
    }, 400);
  });
}

// 11. CSV Export Action (for selected month)
document.getElementById("export-csv-btn").addEventListener("click", () => {
  const monthTxs = transactions.filter((tx) => {
    const sm = tx.salary_month || (tx.date ? tx.date.substring(0, 7) : "");
    return sm === selectedSalaryMonth;
  });

  let csvContent = "data:text/csv;charset=utf-8,ID,Date,Merchant,Type,Category,Channel,Account,Amount\n";
  monthTxs.forEach((tx) => {
    const row = [
      tx.id,
      tx.date,
      `"${(tx.payee || "").replace(/"/g, '""')}"`,
      tx.type,
      `"${(tx.category || "").replace(/"/g, '""')}"`,
      tx.channel,
      `"${(tx.account || "").replace(/"/g, '""')}"`,
      tx.amount
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ledgerly_${selectedSalaryMonth}_records.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${monthTxs.length} records for ${formatMonthLabel(selectedSalaryMonth).full}`);
});

// 12. Toast Notification
let toastTimer = null;
function showToast(message, type = "success") {
  const toast = document.getElementById("toast-notification");
  const msgEl = document.getElementById("toast-message");
  const iconEl = document.getElementById("toast-icon");

  msgEl.textContent = message;
  iconEl.textContent = type === "error" ? "error" : "check_circle";
  iconEl.className = type === "error" ? "material-symbols-outlined text-secondary text-[18px]" : "material-symbols-outlined text-primary text-[18px]";

  clearTimeout(toastTimer);
  toast.classList.remove("opacity-0", "translate-y-3");
  toast.classList.add("opacity-100", "translate-y-0");

  toastTimer = setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0");
    toast.classList.add("opacity-0", "translate-y-3");
  }, 2200);
}

// 13. Theme Switcher (Dark / Light)
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.documentElement.classList.toggle("light");
  if (isLight) {
    document.documentElement.classList.remove("dark");
    themeIcon.textContent = "light_mode";
  } else {
    document.documentElement.classList.add("dark");
    themeIcon.textContent = "dark_mode";
  }
});

// 14. PWA Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").then(
      (reg) => console.log("PWA Service Worker registered:", reg.scope),
      (err) => console.log("PWA Service Worker registration failed:", err)
    );
  });
}

// Initial Boot
updateCategoryBudgets();
renderRecords();
initAddView();
renderOverview();
switchTab("records");

// Start Live Fetch from Google Sheet
fetchSheetData(false);
