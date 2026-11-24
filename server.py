#!/usr/bin/env python3
"""
Ledgerly Dev Server
Loads environment variables from .env (via python-dotenv or built-in parser),
generates config.js for the client PWA, and starts a local HTTP server.
"""

import os
import sys
import http.server
import socketserver

def load_env(env_file=".env"):
    """Loads key-value pairs from .env into os.environ."""
    # Try python-dotenv if installed
    try:
        from dotenv import load_dotenv
        load_dotenv(env_file)
        return
    except ImportError:
        pass

    # Built-in lightweight fallback parser
    if not os.path.exists(env_file):
        return

    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                os.environ[key] = val

def sync_config_js():
    """Generates config.js for the frontend PWA from environment variables."""
    pwa_api_url = os.environ.get("PWA_API_URL", "")
    gsheet_url = os.environ.get("GSHEET_URL", "")

    content = f"""// Local client configuration - automatically synchronized from .env by server.py
// DO NOT COMMIT THIS FILE TO GITHUB
window.__ENV__ = {{
  PWA_API_URL: "{pwa_api_url}",
  GSHEET_URL: "{gsheet_url}"
}};
"""
    with open("config.js", "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[Ledgerly] Synced environment to config.js (API: {'Configured' if pwa_api_url else 'Empty'})")

def run():
    # 1. Load environment
    load_env()

    # 2. Sync to client config
    sync_config_js()

    # 3. Start HTTP server
    port = int(os.environ.get("PORT", 8080))
    handler = http.server.SimpleHTTPRequestHandler

    # Ensure correct MIME type for PWA manifests and SVGs
    handler.extensions_map.update({
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".js": "application/javascript",
        ".css": "text/css",
    })

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), handler) as httpd:
        print(f"[Ledgerly] Server running at http://localhost:{port}/")
        print("[Ledgerly] Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[Ledgerly] Server stopped.")

if __name__ == "__main__":
    run()
