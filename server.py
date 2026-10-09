#!/usr/bin/env python3
"""
PlannerHub Dashboard Local Server with Live pCloud Sync Engine
Serves static dashboard assets and provides /api/sync to pull directly from pCloud.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys
import io
import datetime
import csv

try:
    import openpyxl
except ImportError:
    openpyxl = None

PORT = 3000
PCLOUD_DEFAULT_CODE = "XZonTYJZHVtopfBfvtyoR2DmV4ctcfrfOPBX"
LOCAL_PCLOUD_FILE = "/Users/arden/pCloud Drive/- Ai software/planner_tasks_consolidated.xlsx"
FALLBACK_LOCAL_FILE = "planner_tasks_consolidated.xlsx"

def fetch_from_pcloud(code=PCLOUD_DEFAULT_CODE):
    """Fetches the latest xlsx from pCloud public link API, with local fallback."""
    try:
        api_url = f"https://api.pcloud.com/getpublinkdownload?code={code}"
        req = urllib.request.Request(api_url, headers={"User-Agent": "PlannerDashboard/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            meta = json.loads(resp.read().decode())
        
        if meta.get("result") == 0 and meta.get("hosts") and meta.get("path"):
            host = meta["hosts"][0]
            path = meta["path"]
            dl_url = f"https://{host}{path}"
            dl_req = urllib.request.Request(dl_url, headers={"User-Agent": "PlannerDashboard/1.0"})
            with urllib.request.urlopen(dl_req, timeout=15) as dl_resp:
                content = dl_resp.read()
                if len(content) > 1000:
                    return content, "pCloud Live API"
    except Exception as e:
        print(f"[pCloud Sync] Warning: remote fetch failed ({e}), checking local file...", file=sys.stderr)

    # Fallback to local drive sync
    for path in [LOCAL_PCLOUD_FILE, FALLBACK_LOCAL_FILE]:
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read(), f"Local File ({path})"

    raise RuntimeError("Could not fetch from pCloud or find local Excel file.")

def parse_xlsx_tasks(xlsx_bytes):
    """Parses Excel bytes into list of task dictionaries and CSV rows."""
    if not openpyxl:
        raise RuntimeError("openpyxl is not installed.")
    
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes))
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return [], []
    
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    task_dict = {}
    
    for r in rows[1:]:
        if not r or r[1] is None:
            continue
        row_dict = {}
        for i, h in enumerate(headers):
            val = r[i] if i < len(r) else None
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            row_dict[h] = val
            
        tid = row_dict.get("TaskId")
        if tid:
            # Keep or update with latest run
            task_dict[tid] = row_dict
    
    raw_tasks = list(task_dict.values())
    return raw_tasks, headers, rows

class PlannerDashboardHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for all local requests and prevent browser caching of code during development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed_path = self.path.split("?")[0]
        
        # API: Save Text Overrides to disk permanently
        if parsed_path in ("/api/save-text", "/api/save-text-overrides"):
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_length).decode("utf-8")
                data = json.loads(body)
                
                if isinstance(data, dict):
                    base_dir = os.path.dirname(os.path.abspath(__file__))
                    target_file = os.path.join(base_dir, "data", "text_overrides.json")
                    os.makedirs(os.path.dirname(target_file), exist_ok=True)
                    
                    with open(target_file, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    resp = json.dumps({
                        "success": True, 
                        "savedKeys": len(data), 
                        "file": "data/text_overrides.json",
                        "message": "Text overrides saved permanently to disk."
                    }).encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Length", str(len(resp)))
                    self.end_headers()
                    self.wfile.write(resp)
                    print(f"💾 [Permanent Save] Saved {len(data)} text overrides to data/text_overrides.json")
                    return
                else:
                    raise ValueError("Payload must be a JSON object")
            except Exception as e:
                err = json.dumps({"success": False, "error": str(e)}).encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(err)))
                self.end_headers()
                self.wfile.write(err)
                return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        parsed_path = self.path.split("?")[0]
        
        # API: Sync Live from pCloud
        if parsed_path in ("/api/sync", "/api/sync-pcloud"):
            query_code = PCLOUD_DEFAULT_CODE
            if "?" in self.path:
                params = urllib.parse.parse_qs(self.path.split("?")[1])
                if "code" in params and params["code"][0]:
                    query_code = params["code"][0]

            try:
                content, source_label = fetch_from_pcloud(query_code)
                tasks, headers, all_rows = parse_xlsx_tasks(content)
                
                # Save data cache locally
                os.makedirs("data", exist_ok=True)
                sync_payload = {
                    "success": True,
                    "source": "pCloud",
                    "sourceDetail": source_label,
                    "code": query_code,
                    "syncedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "count": len(tasks),
                    "tasks": tasks
                }
                
                with open("data/planner_tasks.json", "w", encoding="utf-8") as f:
                    json.dump(sync_payload, f, indent=2)
                
                with open("planner_tasks_consolidated.xlsx", "wb") as f:
                    f.write(content)
                
                # Also save CSV for legacy fallbacks
                if all_rows:
                    with open("data/planner_sheet.csv", "w", newline="", encoding="utf-8") as f:
                        writer = csv.writer(f)
                        for r in all_rows:
                            writer.writerow([str(v) if v is not None else "" for v in r])

                response_bytes = json.dumps(sync_payload).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(response_bytes)))
                self.end_headers()
                self.wfile.write(response_bytes)
                return

            except Exception as e:
                err_payload = json.dumps({"success": False, "error": str(e)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(err_payload)))
                self.end_headers()
                self.wfile.write(err_payload)
                return

        # API: Status
        if parsed_path == "/api/status":
            status_payload = json.dumps({
                "status": "online",
                "defaultCode": PCLOUD_DEFAULT_CODE,
                "localDrivePath": LOCAL_PCLOUD_FILE,
                "localExists": os.path.exists(LOCAL_PCLOUD_FILE)
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(status_payload)))
            self.end_headers()
            self.wfile.write(status_payload)
            return

        return super().do_GET()

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), PlannerDashboardHandler) as httpd:
        print(f"🚀 PlannerHub Server with live pCloud Sync running at http://localhost:{PORT}")
        print(f"   pCloud Public Code: {PCLOUD_DEFAULT_CODE}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run_server()
