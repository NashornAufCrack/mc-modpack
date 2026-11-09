#!/usr/bin/env python3
"""
Lokaler Live-Server für die Foto- & Video-Prüfseite.
Speichert alle Benutzerentscheidungen (Bilder abwählen, Videos bewerten)
sofort live in data/media-urteile.json, ohne dass der Benutzer manuell
Dateien kopieren, exportieren oder Skripte ausführen muss.
"""

import http.server
import json
import os
import sys
from pathlib import Path

PORT = 8765
REPO_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_DIR / "data"
URTEILE_PATH = DATA_DIR / "media-urteile.json"

class PruefHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_DIR), **kwargs)

    def end_headers(self):
        # CORS & Kein Caching fuer Entwicklungs-/Pruefdaten
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if self.path.startswith("/api/") or self.path.endswith(".json") or self.path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        # Weiterleitung von / auf /pruefung/
        if self.path in ("/", ""):
            self.send_response(302)
            self.send_header("Location", "/pruefung/")
            self.end_headers()
            return

        # API: Aktuellen Stand der Urteile abrufen
        if self.path == "/api/urteile":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            if URTEILE_PATH.exists():
                with open(URTEILE_PATH, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b'{"rejected_imgs": {}, "video_status": {}}')
            return

        # API: Server-Statuspruefung
        if self.path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "running", "port": PORT}).encode("utf-8"))
            return

        return super().do_GET()

    def do_POST(self):
        # API: Speichern der Urteile direkt aus der Web-UI
        if self.path == "/api/save":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(length)
                data = json.loads(body.decode("utf-8"))

                rejected_imgs = data.get("rejected_imgs", {})
                video_status = data.get("video_status", {})

                URTEILE_PATH.parent.mkdir(parents=True, exist_ok=True)
                with open(URTEILE_PATH, "w", encoding="utf-8") as f:
                    json.dump({
                        "rejected_imgs": rejected_imgs,
                        "video_status": video_status
                    }, f, ensure_ascii=False, indent=2)

                total_bad = sum(len(v) for v in rejected_imgs.values())
                total_vids = len(video_status)

                print(f"[Live-Server] Gespeichert: {total_bad} Bilder als 'Raus' markiert, {total_vids} Video-Urteile.")

                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "ok": True,
                    "bad_imgs_count": total_bad,
                    "video_status_count": total_vids
                }).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

def main():
    server_address = ("127.0.0.1", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, PruefHandler)
    print(f"=== Antigravity Foto- & Video-Prüfserver ===")
    print(f"URL: http://127.0.0.1:{PORT}/pruefung/")
    print(f"Speicherpfad: {URTEILE_PATH}")
    print("Druecke Strg+C zum Beenden.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")

if __name__ == "__main__":
    main()
