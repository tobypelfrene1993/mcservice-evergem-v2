#!/usr/bin/env python3
"""Privacy-friendly, same-origin analytics API for MC Service Evergem."""

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import posixpath
import re
import sqlite3
from urllib.parse import parse_qs, urlsplit
from uuid import UUID

HOST = "127.0.0.1"
PORT = int(os.environ.get("MCSERVICE_ANALYTICS_PORT", "8765"))
DATABASE = os.environ.get("MCSERVICE_ANALYTICS_DB", "/var/lib/mcservice-analytics/analytics.sqlite3")
MAX_BODY_BYTES = 2048
ALLOWED_EVENTS = {"page_view", "whatsapp_click", "email_click", "phone_click", "trustpilot_click"}
RANGES = {"today": 0, "7d": 6, "30d": 29, "all": None}
SAFE_PATH = re.compile(r"^/[A-Za-z0-9/_-]*$")


def connect():
    connection = sqlite3.connect(DATABASE, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    os.makedirs(os.path.dirname(DATABASE), exist_ok=True)
    with connect() as database:
        database.execute("PRAGMA journal_mode=WAL")
        database.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL CHECK(event_type IN ('page_view','whatsapp_click','email_click','phone_click','trustpilot_click')),
                path TEXT NOT NULL,
                session_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        database.execute("CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)")
        database.execute("CREATE INDEX IF NOT EXISTS idx_events_type_path ON events(event_type, path)")


def normalize_path(value):
    if not isinstance(value, str) or len(value) > 160:
        raise ValueError("invalid path")
    path = urlsplit(value).path
    if not path.startswith("/") or not SAFE_PATH.fullmatch(path):
        raise ValueError("invalid path")
    normalized = posixpath.normpath(path)
    if path.endswith("/") and normalized != "/":
        normalized += "/"
    if normalized == "/admin" or normalized.startswith("/admin/"):
        raise ValueError("dashboard is not tracked")
    return normalized


def validate_session(value):
    if not isinstance(value, str) or len(value) != 36:
        raise ValueError("invalid session")
    session = UUID(value)
    if session.version != 4:
        raise ValueError("invalid session")
    return sha256(value.encode("ascii")).hexdigest()


def period_start(range_name):
    days = RANGES[range_name]
    if days is None:
        return None
    today = datetime.now(timezone.utc).date()
    return datetime.combine(today - timedelta(days=days), datetime.min.time(), tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def where_clause(start):
    return (" WHERE created_at >= ?", [start]) if start else ("", [])


def aggregate_summary(range_name):
    start = period_start(range_name)
    where, params = where_clause(start)
    with connect() as database:
        totals = {row["event_type"]: row["total"] for row in database.execute(
            f"SELECT event_type, COUNT(*) AS total FROM events{where} GROUP BY event_type", params
        )}
        unique_sessions = database.execute(
            f"SELECT COUNT(DISTINCT session_hash) FROM events{where}", params
        ).fetchone()[0]
        top_pages = [dict(row) for row in database.execute(
            f"SELECT path, COUNT(*) AS pageviews FROM events{where}{' AND' if where else ' WHERE'} event_type = ? GROUP BY path ORDER BY pageviews DESC, path ASC LIMIT 10",
            [*params, "page_view"],
        )]
        daily_rows = {row["date"]: dict(row) for row in database.execute(
            f"""SELECT substr(created_at, 1, 10) AS date,
                SUM(event_type = 'page_view') AS pageviews,
                COUNT(DISTINCT session_hash) AS unique_sessions,
                SUM(event_type = 'whatsapp_click') AS whatsapp_clicks,
                SUM(event_type = 'email_click') AS email_clicks,
                SUM(event_type = 'phone_click') AS phone_clicks,
                SUM(event_type = 'trustpilot_click') AS trustpilot_clicks
                FROM events{where} GROUP BY date ORDER BY date""", params
        )}

    if range_name == "all":
        dates = sorted(daily_rows)
    else:
        days = RANGES[range_name]
        first = datetime.now(timezone.utc).date() - timedelta(days=days)
        dates = [(first + timedelta(days=index)).isoformat() for index in range(days + 1)]
    zero_day = {"pageviews": 0, "unique_sessions": 0, "whatsapp_clicks": 0, "email_clicks": 0, "phone_clicks": 0, "trustpilot_clicks": 0}
    daily_stats = [{"date": date, **daily_rows.get(date, zero_day)} for date in dates]
    return {
        "range": range_name,
        "pageviews": totals.get("page_view", 0),
        "unique_sessions": unique_sessions,
        "whatsapp_clicks": totals.get("whatsapp_click", 0),
        "email_clicks": totals.get("email_click", 0),
        "phone_clicks": totals.get("phone_click", 0),
        "trustpilot_clicks": totals.get("trustpilot_click", 0),
        "top_pages": top_pages,
        "daily_stats": daily_stats,
    }


class AnalyticsHandler(BaseHTTPRequestHandler):
    server_version = "MCServiceAnalytics/1.0"

    def log_message(self, format_string, *args):
        # Deliberately omit client addresses and request details from application logs.
        return

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/analytics/event":
            self.send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 2 or length > MAX_BODY_BYTES:
                raise ValueError("invalid body size")
            payload = json.loads(self.rfile.read(length))
            event_type = payload.get("event_type")
            if event_type not in ALLOWED_EVENTS:
                raise ValueError("invalid event")
            path = normalize_path(payload.get("path"))
            session_hash = validate_session(payload.get("session_id"))
            created_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
            with connect() as database:
                database.execute(
                    "INSERT INTO events (event_type, path, session_hash, created_at) VALUES (?, ?, ?, ?)",
                    (event_type, path, session_hash, created_at),
                )
            self.send_response(204)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
        except (ValueError, TypeError, json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "invalid request"})
        except sqlite3.Error:
            self.send_json(503, {"error": "temporarily unavailable"})

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path != "/api/analytics/summary":
            self.send_json(404, {"error": "not found"})
            return
        range_name = parse_qs(parsed.query).get("range", ["30d"])[0]
        if range_name not in RANGES:
            self.send_json(400, {"error": "invalid range"})
            return
        try:
            self.send_json(200, aggregate_summary(range_name))
        except sqlite3.Error:
            self.send_json(503, {"error": "temporarily unavailable"})

    def do_HEAD(self):
        self.send_json(405, {"error": "method not allowed"})


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer((HOST, PORT), AnalyticsHandler)
    server.daemon_threads = True
    server.serve_forever()
