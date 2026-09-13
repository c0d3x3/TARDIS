"""
TARDIS: Tdarr Analytics, Reports, Duplicates & Integration System
Standalone Windows 11 Desktop Companion Application
Target: Windows 11 64-bit | Python 3.10+ | PySide6 | SQLite Local Engine
No LLM, No Cloud Backend, 100% Deterministic, Truthful & Safe
"""

import sys
import os
import json
import sqlite3
import hashlib
import shutil
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Safe Windows Recycle Bin support
try:
    from send2trash import send2trash
    HAS_SEND2TRASH = True
except ImportError:
    HAS_SEND2TRASH = False

# PySide6 imports for native Windows 11 desktop GUI
try:
    from PySide6.QtWidgets import (
        QApplication, QMainWindow, QDialog, QWidget, QVBoxLayout, QHBoxLayout,
        QTabWidget, QLabel, QPushButton, QLineEdit, QCheckBox, QListWidget,
        QListWidgetItem, QTableWidget, QTableWidgetItem, QHeaderView, QMessageBox,
        QProgressBar, QGroupBox, QFileDialog, QStackedWidget, QTextEdit, QFrame
    )
    from PySide6.QtCore import Qt, QTimer, QThread, Signal
    from PySide6.QtGui import QFont, QColor, QIcon
    HAS_PYSIDE = True
except ImportError:
    HAS_PYSIDE = False


APP_NAME = "TARDIS"
APP_VERSION = "1.0.0"


def format_bytes(bytes_val: int | float | None, precision: int = 1) -> str:
    """Format bytes into human-readable representation without fabrication."""
    if bytes_val is None:
        return "Not available yet"
    units = ["B", "KB", "MB", "GB", "TB", "PB"]
    size = float(bytes_val)
    idx = 0
    while size >= 1024.0 and idx < len(units) - 1:
        size /= 1024.0
        idx += 1
    return f"{size:.{precision}f} {units[idx]}"


def get_app_data_dir() -> Path:
    """Determine persistent AppData location on Windows (%APPDATA%\\TARDIS)."""
    if os.name == 'nt':
        base = Path(os.environ.get('APPDATA', Path.home()))
    else:
        base = Path.home() / ".config"
    app_dir = base / "TARDIS"
    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


DB_PATH = get_app_data_dir() / "tardis_local.db"


def verify_appdata_writable() -> tuple[bool, str]:
    """Verify that TARDIS can write to its persistent AppData directory."""
    try:
        app_dir = get_app_data_dir()
        test_file = app_dir / ".write_test"
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(f"tardis_probe_{datetime.utcnow().isoformat()}")
        if test_file.exists():
            test_file.unlink()
            return True, f"Verified write access to {app_dir}"
        return False, f"Test file could not be created in {app_dir}"
    except Exception as e:
        return False, f"AppData write error: {str(e)}"


def validate_library_path(path: str) -> tuple[bool, str]:
    """Validate that a user-specified media library path exists and is readable."""
    trimmed = path.strip().strip('"').strip("'")
    if not trimmed:
        return False, "Path cannot be empty."
    p = Path(trimmed)
    if not p.exists():
        return False, f"Directory does not exist: {trimmed}"
    if not p.is_dir():
        return False, f"Specified path is a file, not a directory: {trimmed}"
    if not os.access(str(p), os.R_OK):
        return False, f"Directory is not accessible/readable: {trimmed}"
    return True, str(p.resolve())


def validate_drive_path(path: str) -> tuple[bool, str, dict]:
    """Validate a Windows drive/root path and obtain real filesystem measurements."""
    trimmed = path.strip().strip('"').strip("'")
    if not trimmed:
        return False, "Drive/root path cannot be empty.", {}

    # Handle drive letters like "D:" or "D:\"
    target = trimmed
    if len(target) == 2 and target[1] == ':':
        target = target + "\\"

    p = Path(target)
    if not p.exists():
        return False, f"Drive/path does not exist: {trimmed}", {}

    try:
        usage = shutil.disk_usage(str(p))
        return True, f"Measured {format_bytes(usage.free)} free of {format_bytes(usage.total)}", {
            "path": target,
            "total": usage.total,
            "used": usage.used,
            "free": usage.free
        }
    except Exception as e:
        return False, f"Cannot read filesystem usage for {trimmed}: {str(e)}", {}


class TardisDatabase:
    """Local SQLite database manager for TARDIS (%APPDATA%\\TARDIS\\tardis_local.db)."""
    def __init__(self, db_path=DB_PATH):
        self.db_path = str(db_path)
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Settings table (key-value)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            ''')
            # Historical Transcode Records
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transcode_jobs (
                    file_id TEXT PRIMARY KEY,
                    file_path TEXT,
                    original_size INTEGER,
                    resulting_size INTEGER,
                    space_saved INTEGER,
                    codec_before TEXT,
                    codec_after TEXT,
                    resolution TEXT,
                    library_id TEXT,
                    status TEXT,
                    processed_at TEXT
                )
            ''')
            # Sessions Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    start_time TEXT,
                    end_time TEXT,
                    status TEXT,
                    drive TEXT,
                    files_processed INTEGER,
                    successful_jobs INTEGER,
                    skipped_jobs INTEGER,
                    failed_jobs INTEGER,
                    original_bytes INTEGER,
                    resulting_bytes INTEGER,
                    space_saved_bytes INTEGER,
                    reduction_percent REAL
                )
            ''')
            # Duplicate Candidates Table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS duplicates (
                    id TEXT PRIMARY KEY,
                    confidence TEXT,
                    title TEXT,
                    file_a_path TEXT,
                    file_a_size INTEGER,
                    file_b_path TEXT,
                    file_b_size INTEGER,
                    reason TEXT,
                    status TEXT
                )
            ''')
            conn.commit()

    def get_setting(self, key: str, default: str = "") -> str:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row[0] if row else default

    def set_setting(self, key: str, value: str):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
            conn.commit()

    # First-run state detection
    def is_first_run(self) -> bool:
        return self.get_setting("first_run_completed", "false") != "true"

    def set_first_run_completed(self, completed: bool = True):
        self.set_setting("first_run_completed", "true" if completed else "false")

    # Tdarr Server URL
    def get_tdarr_url(self) -> str:
        return self.get_setting("tdarr_url", "http://localhost:8265")

    def set_tdarr_url(self, url: str):
        self.set_setting("tdarr_url", url.strip())

    # Media Libraries configuration
    def get_libraries(self) -> list[str]:
        raw = self.get_setting("libraries", "[]")
        try:
            return json.loads(raw)
        except Exception:
            return []

    def set_libraries(self, libraries: list[str]):
        self.set_setting("libraries", json.dumps(libraries))

    # Monitored Drives configuration
    def get_monitored_drives(self) -> list[dict]:
        raw = self.get_setting("monitored_drives", "[]")
        try:
            return json.loads(raw)
        except Exception:
            return []

    def set_monitored_drives(self, drives: list[dict]):
        self.set_setting("monitored_drives", json.dumps(drives))

    # Discord Webhook configuration
    def get_discord_config(self) -> tuple[bool, str]:
        enabled = self.get_setting("discord_enabled", "false") == "true"
        url = self.get_setting("discord_webhook_url", "")
        return enabled, url

    def set_discord_config(self, enabled: bool, url: str):
        self.set_setting("discord_enabled", "true" if enabled else "false")
        self.set_setting("discord_webhook_url", url.strip())


class TdarrClient:
    """Non-invasive Tdarr Server API Client (Truthful Probe)."""
    def __init__(self, base_url="http://localhost:8265"):
        self.base_url = base_url.rstrip('/')

    @staticmethod
    def test_connection(url: str) -> tuple[bool, str, dict]:
        """Validate live connectivity to Tdarr server. Does NOT claim success unless HTTP 200."""
        target = url.strip().rstrip('/')
        if not target.startswith("http://") and not target.startswith("https://"):
            return False, "URL must start with http:// or https://", {}

        req_url = f"{target}/api/v2/status"
        try:
            req = urllib.request.Request(
                req_url,
                headers={"User-Agent": "TARDIS-Windows-Companion"}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    body = resp.read().decode('utf-8', errors='ignore')
                    data = json.loads(body) if body else {}
                    version = data.get("version", "Active")
                    return True, f"Connection verified: Tdarr server responded OK (Status 200, Version: {version})", data
                else:
                    return False, f"Server responded with non-OK status: {resp.status}", {}
        except urllib.error.HTTPError as e:
            return False, f"HTTP Error {e.code}: {e.reason}", {}
        except urllib.error.URLError as e:
            return False, f"Could not reach {target}: {e.reason}", {}
        except Exception as e:
            return False, f"Connection error: {str(e)}", {}

    def check_status(self):
        ok, msg, data = self.test_connection(self.base_url)
        if ok:
            return data
        return {"error": msg}

    def get_nodes(self):
        try:
            req = urllib.request.Request(f"{self.base_url}/api/v2/get-nodes", headers={"User-Agent": "TARDIS-Windows-Companion"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    return json.loads(resp.read().decode('utf-8', errors='ignore'))
        except Exception:
            return {}
        return {}


class DiscordNotifier:
    """Sends rich Discord Webhook notifications without requiring a bot."""
    @staticmethod
    def send_notification(webhook_url: str, title: str, description: str, color: int = 0x5865F2) -> tuple[bool, str]:
        trimmed = webhook_url.strip()
        if not trimmed or not trimmed.startswith("https://discord.com/api/webhooks/"):
            return False, "Invalid Discord Webhook URL. Must begin with https://discord.com/api/webhooks/"

        payload = {
            "username": "TARDIS Monitor",
            "embeds": [{
                "title": title,
                "description": description,
                "color": color,
                "footer": {"text": f"TARDIS v{APP_VERSION} • Windows 11 Companion"},
                "timestamp": datetime.utcnow().isoformat()
            }]
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            trimmed,
            data=data,
            headers={'Content-Type': 'application/json', 'User-Agent': 'TARDIS-Windows-Companion'}
        )
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status in (200, 204):
                    return True, "Test notification delivered successfully to Discord"
                return False, f"Discord returned status {resp.status}"
        except Exception as e:
            return False, f"Discord Webhook delivery error: {str(e)}"


class DuplicateScanner:
    """Multi-level deterministic duplicate media scanner."""
    @staticmethod
    def calculate_file_hash(filepath: str, blocksize: int = 65536) -> str:
        hasher = hashlib.sha256()
        try:
            with open(filepath, 'rb') as f:
                buf = f.read(blocksize)
                while len(buf) > 0:
                    hasher.update(buf)
                    buf = f.read(blocksize)
            return hasher.hexdigest()
        except Exception:
            return ""

    @staticmethod
    def safe_delete_file(filepath: str, mode: str = "recycle_bin") -> tuple[bool, str]:
        if not os.path.exists(filepath):
            return False, "File does not exist"
        try:
            if mode == "recycle_bin" and HAS_SEND2TRASH:
                send2trash(filepath)
                return True, "Moved file to Windows Recycle Bin"
            else:
                os.remove(filepath)
                return True, "Permanently unlinked file"
        except Exception as e:
            return False, f"Failed to delete: {str(e)}"


# =============================================================================
# PySide6 GUI Implementation for Windows 11
# =============================================================================
if HAS_PYSIDE:

    class FirstRunWizard(QDialog):
        """
        First-Run Setup Wizard for TARDIS on Windows 11.
        Walks the user through:
          1. Tdarr Server URL + Test Connection
          2. Arbitrary Media Libraries configuration (Browse / Add / Validate)
          3. Monitored Storage Drives configuration (Browse / Add / Disk Usage)
          4. Optional Discord Webhook
          5. Review and Save
        """
        def __init__(self, db: TardisDatabase, parent=None):
            super().__init__(parent)
            self.db = db
            self.setWindowTitle("TARDIS - Initial Setup Wizard")
            self.resize(750, 580)
            self.setModal(True)

            self.libraries_list = list(self.db.get_libraries())
            self.drives_list = list(self.db.get_monitored_drives())
            self.current_step = 0

            main_layout = QVBoxLayout(self)
            main_layout.setContentsMargins(24, 20, 24, 20)
            main_layout.setSpacing(16)

            # Header / Step Indicator
            self.step_header = QLabel("Step 1 of 5: Tdarr Server Connection")
            self.step_header.setFont(QFont("Segoe UI", 12, QFont.Bold))
            self.step_header.setStyleSheet("color: #38bdf8;")
            main_layout.addWidget(self.step_header)

            self.step_desc = QLabel("Enter the address where your Tdarr server is running.")
            self.step_desc.setFont(QFont("Segoe UI", 9))
            self.step_desc.setStyleSheet("color: #94a3b8;")
            main_layout.addWidget(self.step_desc)

            # Stacked Widget for pages
            self.stack = QStackedWidget()
            main_layout.addWidget(self.stack, 1)

            # Build individual step pages
            self.init_page_tdarr()
            self.init_page_libraries()
            self.init_page_drives()
            self.init_page_discord()
            self.init_page_review()

            # Bottom Navigation Buttons
            btn_layout = QHBoxLayout()
            self.btn_back = QPushButton("← Back")
            self.btn_back.clicked.connect(self.go_back)
            self.btn_back.setEnabled(False)
            self.btn_back.setStyleSheet("padding: 8px 16px;")

            self.btn_next = QPushButton("Next →")
            self.btn_next.clicked.connect(self.go_next)
            self.btn_next.setStyleSheet("padding: 8px 20px; font-weight: bold; background-color: #0284c7; color: white;")

            btn_layout.addWidget(self.btn_back)
            btn_layout.addStretch()
            btn_layout.addWidget(self.btn_next)
            main_layout.addLayout(btn_layout)

        # ---------------------------------------------------------------------
        # Step 1: Tdarr Server
        # ---------------------------------------------------------------------
        def init_page_tdarr(self):
            page = QWidget()
            layout = QVBoxLayout(page)
            layout.setSpacing(12)

            lbl = QLabel("Tdarr Server URL:")
            lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
            layout.addWidget(lbl)

            self.input_tdarr_url = QLineEdit(self.db.get_tdarr_url())
            self.input_tdarr_url.setPlaceholderText("http://localhost:8265")
            self.input_tdarr_url.setStyleSheet("padding: 8px; font-size: 13px;")
            layout.addWidget(self.input_tdarr_url)

            btn_test = QPushButton("Test Connection")
            btn_test.setStyleSheet("padding: 6px 14px; background-color: #334155; color: white;")
            btn_test.clicked.connect(self.test_tdarr_connection)
            layout.addWidget(btn_test, alignment=Qt.AlignLeft)

            self.lbl_tdarr_status = QLabel("Click 'Test Connection' to verify server reachability.")
            self.lbl_tdarr_status.setStyleSheet("color: #64748b; font-size: 11px;")
            self.lbl_tdarr_status.setWordWrap(True)
            layout.addWidget(self.lbl_tdarr_status)

            info_box = QFrame()
            info_box.setStyleSheet("background-color: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 12px;")
            ib_layout = QVBoxLayout(info_box)
            ib_lbl = QLabel(
                "• TARDIS connects in read-only sidecar mode.\n"
                "• It will never modify your Tdarr server or alter transcode settings.\n"
                "• If Tdarr is not running yet, you can still proceed and connect later."
            )
            ib_lbl.setStyleSheet("color: #cbd5e1; font-size: 11px; line-height: 1.4;")
            ib_layout.addWidget(ib_lbl)
            layout.addWidget(info_box)

            layout.addStretch()
            self.stack.addWidget(page)

        def test_tdarr_connection(self):
            url = self.input_tdarr_url.text().strip()
            self.lbl_tdarr_status.setText("Testing connection to Tdarr server...")
            self.lbl_tdarr_status.setStyleSheet("color: #38bdf8;")
            QApplication.processEvents()

            ok, msg, _ = TdarrClient.test_connection(url)
            if ok:
                self.lbl_tdarr_status.setText(f"✔ {msg}")
                self.lbl_tdarr_status.setStyleSheet("color: #4ade80; font-weight: bold;")
            else:
                self.lbl_tdarr_status.setText(f"✖ {msg}")
                self.lbl_tdarr_status.setStyleSheet("color: #f87171;")

        # ---------------------------------------------------------------------
        # Step 2: Libraries / Media Paths
        # ---------------------------------------------------------------------
        def init_page_libraries(self):
            page = QWidget()
            layout = QVBoxLayout(page)
            layout.setSpacing(10)

            lbl = QLabel("Configured Media Libraries (Any number of paths):")
            lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
            layout.addWidget(lbl)

            self.list_libraries = QListWidget()
            self.list_libraries.setStyleSheet("background-color: #0f172a; border: 1px solid #334155; padding: 4px;")
            self.refresh_libraries_list()
            layout.addWidget(self.list_libraries, 1)

            add_layout = QHBoxLayout()
            self.input_lib_path = QLineEdit()
            self.input_lib_path.setPlaceholderText("Enter or browse folder path (e.g. D:\\Movies)")
            self.input_lib_path.setStyleSheet("padding: 6px;")

            btn_browse = QPushButton("Browse...")
            btn_browse.clicked.connect(self.browse_library)
            btn_browse.setStyleSheet("padding: 6px 12px;")

            btn_add = QPushButton("Add Library")
            btn_add.clicked.connect(self.add_library)
            btn_add.setStyleSheet("padding: 6px 14px; background-color: #10b981; color: white; font-weight: bold;")

            add_layout.addWidget(self.input_lib_path, 1)
            add_layout.addWidget(btn_browse)
            add_layout.addWidget(btn_add)
            layout.addLayout(add_layout)

            btn_remove = QPushButton("Remove Selected Library")
            btn_remove.clicked.connect(self.remove_library)
            btn_remove.setStyleSheet("padding: 4px 10px; background-color: #7f1d1d; color: white;")
            layout.addWidget(btn_remove, alignment=Qt.AlignLeft)

            self.lbl_lib_error = QLabel("")
            self.lbl_lib_error.setStyleSheet("color: #f87171; font-size: 11px;")
            layout.addWidget(self.lbl_lib_error)

            self.stack.addWidget(page)

        def refresh_libraries_list(self):
            self.list_libraries.clear()
            for path in self.libraries_list:
                item = QListWidgetItem(f"📁  {path}")
                self.list_libraries.addItem(item)

        def browse_library(self):
            folder = QFileDialog.getExistingDirectory(self, "Select Media Library Directory")
            if folder:
                self.input_lib_path.setText(folder)

        def add_library(self):
            raw = self.input_lib_path.text().strip()
            ok, res = validate_library_path(raw)
            if not ok:
                self.lbl_lib_error.setText(res)
                return
            self.lbl_lib_error.setText("")
            if res in self.libraries_list:
                self.lbl_lib_error.setText("This library path is already added.")
                return
            self.libraries_list.append(res)
            self.input_lib_path.clear()
            self.refresh_libraries_list()

        def remove_library(self):
            row = self.list_libraries.currentRow()
            if 0 <= row < len(self.libraries_list):
                self.libraries_list.pop(row)
                self.refresh_libraries_list()

        # ---------------------------------------------------------------------
        # Step 3: Storage / Monitored Drives
        # ---------------------------------------------------------------------
        def init_page_drives(self):
            page = QWidget()
            layout = QVBoxLayout(page)
            layout.setSpacing(10)

            lbl = QLabel("Monitored Drives & Storage Roots:")
            lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
            layout.addWidget(lbl)

            self.list_drives = QListWidget()
            self.list_drives.setStyleSheet("background-color: #0f172a; border: 1px solid #334155; padding: 4px;")
            self.refresh_drives_list()
            layout.addWidget(self.list_drives, 1)

            add_layout = QHBoxLayout()
            self.input_drive_path = QLineEdit()
            self.input_drive_path.setPlaceholderText("Enter drive root (e.g. C:\\, D:\\, E:\\)")
            self.input_drive_path.setStyleSheet("padding: 6px;")

            btn_browse_drive = QPushButton("Browse...")
            btn_browse_drive.clicked.connect(self.browse_drive)
            btn_browse_drive.setStyleSheet("padding: 6px 12px;")

            btn_add_drive = QPushButton("Add Drive")
            btn_add_drive.clicked.connect(self.add_drive)
            btn_add_drive.setStyleSheet("padding: 6px 14px; background-color: #8b5cf6; color: white; font-weight: bold;")

            add_layout.addWidget(self.input_drive_path, 1)
            add_layout.addWidget(btn_browse_drive)
            add_layout.addWidget(btn_add_drive)
            layout.addLayout(add_layout)

            btn_remove_drive = QPushButton("Remove Selected Drive")
            btn_remove_drive.clicked.connect(self.remove_drive)
            btn_remove_drive.setStyleSheet("padding: 4px 10px; background-color: #7f1d1d; color: white;")
            layout.addWidget(btn_remove_drive, alignment=Qt.AlignLeft)

            self.lbl_drive_error = QLabel("")
            self.lbl_drive_error.setStyleSheet("color: #f87171; font-size: 11px;")
            layout.addWidget(self.lbl_drive_error)

            self.stack.addWidget(page)

        def refresh_drives_list(self):
            self.list_drives.clear()
            for d in self.drives_list:
                p = d.get("path", "")
                free_str = format_bytes(d.get("free"))
                total_str = format_bytes(d.get("total"))
                item = QListWidgetItem(f"💽  {p}  —  {free_str} free of {total_str}")
                self.list_drives.addItem(item)

        def browse_drive(self):
            folder = QFileDialog.getExistingDirectory(self, "Select Monitored Drive or Root Directory")
            if folder:
                self.input_drive_path.setText(folder)

        def add_drive(self):
            raw = self.input_drive_path.text().strip()
            ok, msg, data = validate_drive_path(raw)
            if not ok:
                self.lbl_drive_error.setText(msg)
                return
            self.lbl_drive_error.setText("")
            # Avoid duplicate paths
            for existing in self.drives_list:
                if existing.get("path") == data["path"]:
                    self.lbl_drive_error.setText("This drive is already being monitored.")
                    return
            self.drives_list.append(data)
            self.input_drive_path.clear()
            self.refresh_drives_list()

        def remove_drive(self):
            row = self.list_drives.currentRow()
            if 0 <= row < len(self.drives_list):
                self.drives_list.pop(row)
                self.refresh_drives_list()

        # ---------------------------------------------------------------------
        # Step 4: Optional Discord Webhook
        # ---------------------------------------------------------------------
        def init_page_discord(self):
            page = QWidget()
            layout = QVBoxLayout(page)
            layout.setSpacing(12)

            enabled, url = self.db.get_discord_config()
            self.chk_discord = QCheckBox("Enable Discord Webhook Notifications (Optional)")
            self.chk_discord.setChecked(enabled)
            self.chk_discord.setFont(QFont("Segoe UI", 10, QFont.Bold))
            layout.addWidget(self.chk_discord)

            lbl_url = QLabel("Discord Webhook URL:")
            layout.addWidget(lbl_url)

            self.input_discord_url = QLineEdit(url)
            self.input_discord_url.setPlaceholderText("https://discord.com/api/webhooks/...")
            self.input_discord_url.setStyleSheet("padding: 8px;")
            layout.addWidget(self.input_discord_url)

            btn_test_discord = QPushButton("Send Test Webhook")
            btn_test_discord.clicked.connect(self.test_discord)
            btn_test_discord.setStyleSheet("padding: 6px 14px; background-color: #4f46e5; color: white;")
            layout.addWidget(btn_test_discord, alignment=Qt.AlignLeft)

            self.lbl_discord_status = QLabel("")
            self.lbl_discord_status.setStyleSheet("font-size: 11px;")
            layout.addWidget(self.lbl_discord_status)

            info_lbl = QLabel(
                "• Discord alerts are completely optional.\n"
                "• When enabled, TARDIS notifies your channel when a transcoding session completes.\n"
                "• You can change this at any time in the Settings tab."
            )
            info_lbl.setStyleSheet("color: #64748b; font-size: 11px;")
            layout.addWidget(info_lbl)

            layout.addStretch()
            self.stack.addWidget(page)

        def test_discord(self):
            url = self.input_discord_url.text().strip()
            self.lbl_discord_status.setText("Sending test webhook notification...")
            self.lbl_discord_status.setStyleSheet("color: #38bdf8;")
            QApplication.processEvents()

            ok, msg = DiscordNotifier.send_notification(
                url,
                "TARDIS Setup Test",
                "Testing Discord integration from the TARDIS Setup Wizard. Connection is functioning correctly!"
            )
            if ok:
                self.lbl_discord_status.setText(f"✔ {msg}")
                self.lbl_discord_status.setStyleSheet("color: #4ade80; font-weight: bold;")
            else:
                self.lbl_discord_status.setText(f"✖ {msg}")
                self.lbl_discord_status.setStyleSheet("color: #f87171;")

        # ---------------------------------------------------------------------
        # Step 5: Review & Save
        # ---------------------------------------------------------------------
        def init_page_review(self):
            page = QWidget()
            layout = QVBoxLayout(page)
            layout.setSpacing(12)

            lbl = QLabel("Review Configuration Before Saving:")
            lbl.setFont(QFont("Segoe UI", 10, QFont.Bold))
            layout.addWidget(lbl)

            self.text_review = QTextEdit()
            self.text_review.setReadOnly(True)
            self.text_review.setStyleSheet("background-color: #0f172a; border: 1px solid #334155; font-family: monospace; font-size: 11px; padding: 8px;")
            layout.addWidget(self.text_review, 1)

            self.lbl_save_status = QLabel("")
            self.lbl_save_status.setStyleSheet("font-size: 11px;")
            layout.addWidget(self.lbl_save_status)

            self.stack.addWidget(page)

        def update_review_text(self):
            url = self.input_tdarr_url.text().strip()
            discord_on = self.chk_discord.isChecked()
            discord_url = self.input_discord_url.text().strip()

            rev = "========================================================================\n"
            rev += f"TARDIS CONFIGURATION SUMMARY\n"
            rev += f"Storage Location: {DB_PATH}\n"
            rev += "========================================================================\n\n"
            rev += f"1. TDARR SERVER:\n   {url}\n\n"

            rev += f"2. CONFIGURED MEDIA LIBRARIES ({len(self.libraries_list)}):\n"
            if self.libraries_list:
                for lib in self.libraries_list:
                    rev += f"   • {lib}\n"
            else:
                rev += "   (No libraries configured yet - you can add them later in Settings)\n"
            rev += "\n"

            rev += f"3. MONITORED DRIVES ({len(self.drives_list)}):\n"
            if self.drives_list:
                for d in self.drives_list:
                    rev += f"   • {d.get('path')} (Capacity: {format_bytes(d.get('total'))}, Free: {format_bytes(d.get('free'))})\n"
            else:
                rev += "   (No drives configured yet - you can add them later in Settings)\n"
            rev += "\n"

            rev += f"4. DISCORD NOTIFICATIONS:\n"
            rev += f"   Status: {'ENABLED' if discord_on else 'DISABLED'}\n"
            if discord_on:
                rev += f"   Webhook: {discord_url[:30]}...\n"
            rev += "\n"
            rev += "Click 'Save & Finish' to write configuration and launch TARDIS.\n"
            self.text_review.setPlainText(rev)

        # ---------------------------------------------------------------------
        # Wizard Navigation
        # ---------------------------------------------------------------------
        def go_next(self):
            if self.current_step == 0:
                # Step 1: Validate Tdarr URL format
                url = self.input_tdarr_url.text().strip()
                if not url.startswith("http://") and not url.startswith("https://"):
                    QMessageBox.warning(self, "Invalid URL", "Please enter a valid URL starting with http:// or https://")
                    return
                self.current_step = 1
            elif self.current_step == 1:
                # Step 2: Libraries
                self.current_step = 2
            elif self.current_step == 2:
                # Step 3: Drives
                self.current_step = 3
            elif self.current_step == 3:
                # Step 4: Discord
                self.current_step = 4
                self.update_review_text()
            elif self.current_step == 4:
                # Step 5: Save & Finish
                self.save_and_finish()
                return

            self.update_step_ui()

        def go_back(self):
            if self.current_step > 0:
                self.current_step -= 1
                self.update_step_ui()

        def update_step_ui(self):
            self.stack.setCurrentIndex(self.current_step)
            self.btn_back.setEnabled(self.current_step > 0)

            steps_meta = [
                ("Step 1 of 5: Tdarr Server Connection", "Enter the address where your Tdarr server is running."),
                ("Step 2 of 5: Media Libraries", "Add the folders containing your media files for duplicate analysis."),
                ("Step 3 of 5: Storage & Monitored Drives", "Specify the Windows drives or root volumes to monitor for free space changes."),
                ("Step 4 of 5: Discord Notifications (Optional)", "Configure optional webhook notifications."),
                ("Step 5 of 5: Review & Save Configuration", "Review all parameters and save your settings.")
            ]
            header, desc = steps_meta[self.current_step]
            self.step_header.setText(header)
            self.step_desc.setText(desc)

            if self.current_step == 4:
                self.btn_next.setText("Save & Finish")
                self.btn_next.setStyleSheet("padding: 8px 24px; font-weight: bold; background-color: #16a34a; color: white;")
            else:
                self.btn_next.setText("Next →")
                self.btn_next.setStyleSheet("padding: 8px 20px; font-weight: bold; background-color: #0284c7; color: white;")

        def save_and_finish(self):
            # 1. Verify AppData write permissions
            writable, write_msg = verify_appdata_writable()
            if not writable:
                QMessageBox.critical(self, "Storage Error", f"Cannot write to AppData directory:\n{write_msg}")
                return

            # 2. Re-validate configured media library paths
            for lib in self.libraries_list:
                if not os.path.exists(lib):
                    QMessageBox.warning(
                        self, "Path Not Accessible",
                        f"Media library path '{lib}' does not appear to exist.\nPlease go back to Step 2 and correct or remove it."
                    )
                    return

            # 3. Save into SQLite
            url = self.input_tdarr_url.text().strip()
            self.db.set_tdarr_url(url)
            self.db.set_libraries(self.libraries_list)
            self.db.set_monitored_drives(self.drives_list)
            self.db.set_discord_config(self.chk_discord.isChecked(), self.input_discord_url.text().strip())
            self.db.set_first_run_completed(True)

            QMessageBox.information(
                self, "Setup Completed",
                f"TARDIS configuration has been successfully saved to:\n{DB_PATH}\n\nLaunching TARDIS now."
            )
            self.accept()


    # =========================================================================
    # Main Application Window
    # =========================================================================
    class TardisMainWindow(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle(f"{APP_NAME} v{APP_VERSION} - Tdarr Companion (Windows 11)")
            self.resize(1120, 740)
            self.db = TardisDatabase()
            self.tdarr = TdarrClient(self.db.get_tdarr_url())

            # Central Widget & Tab Container
            central = QWidget()
            self.setCentralWidget(central)
            layout = QVBoxLayout(central)
            layout.setContentsMargins(12, 12, 12, 12)

            self.tabs = QTabWidget()
            self.tabs.setStyleSheet("""
                QTabWidget::pane { border: 1px solid #1e293b; background: #0f172a; }
                QTabBar::tab { background: #1e293b; color: #94a3b8; padding: 10px 18px; margin-right: 2px; }
                QTabBar::tab:selected { background: #0284c7; color: white; font-weight: bold; }
            """)
            layout.addWidget(self.tabs)

            self.init_dashboard_tab()
            self.init_tdarr_tab()
            self.init_duplicates_tab()
            self.init_history_tab()
            self.init_discord_tab()
            self.init_settings_tab()

            # First-Run Check: prompt wizard if not yet configured
            if self.db.is_first_run():
                QTimer.singleShot(250, self.launch_setup_wizard)

        def launch_setup_wizard(self):
            wizard = FirstRunWizard(self.db, self)
            if wizard.exec() == QDialog.Accepted:
                self.refresh_from_database()

        def refresh_from_database(self):
            """Reload UI views after configuration updates."""
            self.tdarr.base_url = self.db.get_tdarr_url()
            self.update_dashboard_view()
            self.load_settings_view()

        # ---------------------------------------------------------------------
        # Tab 1: Dashboard
        # ---------------------------------------------------------------------
        def init_dashboard_tab(self):
            self.tab_dash = QWidget()
            l = QVBoxLayout(self.tab_dash)
            l.setContentsMargins(20, 20, 20, 20)
            l.setSpacing(16)

            title = QLabel("TARDIS System Dashboard")
            title.setFont(QFont("Segoe UI", 15, QFont.Bold))
            l.addWidget(title)

            # Not configured warning banner
            self.dash_warning = QFrame()
            self.dash_warning.setStyleSheet("background-color: #451a03; border: 1px solid #b45309; border-radius: 6px; padding: 12px;")
            dw_layout = QHBoxLayout(self.dash_warning)
            dw_lbl = QLabel("⚠ TARDIS has not been configured yet. Please complete initial setup.")
            dw_lbl.setStyleSheet("color: #fde68a; font-weight: bold;")
            btn_run_setup = QPushButton("Run Setup Wizard")
            btn_run_setup.clicked.connect(self.launch_setup_wizard)
            btn_run_setup.setStyleSheet("background-color: #d97706; color: white; font-weight: bold; padding: 6px 12px;")
            dw_layout.addWidget(dw_lbl, 1)
            dw_layout.addWidget(btn_run_setup)
            l.addWidget(self.dash_warning)

            # Metrics Box
            self.dash_metrics_box = QGroupBox("Active Configuration & Status")
            mb_layout = QVBoxLayout(self.dash_metrics_box)
            mb_layout.setSpacing(8)

            self.lbl_dash_tdarr = QLabel("Tdarr Server: Loading...")
            self.lbl_dash_libs = QLabel("Configured Libraries: 0")
            self.lbl_dash_drives = QLabel("Monitored Storage Drives: 0")
            self.lbl_dash_mode = QLabel("Truthful Engine: Zero simulated stats. Real Windows measurements only.")
            self.lbl_dash_mode.setStyleSheet("color: #10b981; font-weight: bold;")

            mb_layout.addWidget(self.lbl_dash_tdarr)
            mb_layout.addWidget(self.lbl_dash_libs)
            mb_layout.addWidget(self.lbl_dash_drives)
            mb_layout.addWidget(self.lbl_dash_mode)
            l.addWidget(self.dash_metrics_box)

            l.addStretch()
            self.tabs.addTab(self.tab_dash, "Dashboard")
            self.update_dashboard_view()

        def update_dashboard_view(self):
            is_first = self.db.is_first_run()
            self.dash_warning.setVisible(is_first)

            libs = self.db.get_libraries()
            drives = self.db.get_monitored_drives()
            tdarr_url = self.db.get_tdarr_url()

            self.lbl_dash_tdarr.setText(f"Tdarr Server: {tdarr_url}")

            if libs:
                self.lbl_dash_libs.setText(f"Configured Media Libraries: {len(libs)} paths ({', '.join([os.path.basename(p) or p for p in libs[:3]])})")
            else:
                self.lbl_dash_libs.setText("Configured Media Libraries: Not configured yet")

            if drives:
                d_strs = [f"{d.get('path')} ({format_bytes(d.get('free'))} free)" for d in drives]
                self.lbl_dash_drives.setText(f"Monitored Storage Drives: {', '.join(d_strs)}")
            else:
                self.lbl_dash_drives.setText("Monitored Storage Drives: Not configured yet")

        # ---------------------------------------------------------------------
        # Tab 2: Tdarr Diagnostics
        # ---------------------------------------------------------------------
        def init_tdarr_tab(self):
            w = QWidget()
            l = QVBoxLayout(w)
            l.setContentsMargins(20, 20, 20, 20)
            l.addWidget(QLabel("Tdarr Server Diagnostic & Live Monitoring"))
            self.tabs.addTab(w, "Tdarr")

        # ---------------------------------------------------------------------
        # Tab 3: Duplicates
        # ---------------------------------------------------------------------
        def init_duplicates_tab(self):
            w = QWidget()
            l = QVBoxLayout(w)
            l.setContentsMargins(20, 20, 20, 20)
            l.addWidget(QLabel("Duplicate Media Review Interface (Level 1 SHA-256 & Level 2 Title Matches)"))
            self.tabs.addTab(w, "Duplicates")

        # ---------------------------------------------------------------------
        # Tab 4: History
        # ---------------------------------------------------------------------
        def init_history_tab(self):
            w = QWidget()
            l = QVBoxLayout(w)
            l.setContentsMargins(20, 20, 20, 20)
            l.addWidget(QLabel("Historical Transcode Sessions & Drive Deltas"))
            self.tabs.addTab(w, "History")

        # ---------------------------------------------------------------------
        # Tab 5: Discord
        # ---------------------------------------------------------------------
        def init_discord_tab(self):
            w = QWidget()
            l = QVBoxLayout(w)
            l.setContentsMargins(20, 20, 20, 20)
            l.addWidget(QLabel("Discord Notifications & Logs"))
            self.tabs.addTab(w, "Discord")

        # ---------------------------------------------------------------------
        # Tab 6: Settings
        # ---------------------------------------------------------------------
        def init_settings_tab(self):
            self.tab_settings = QWidget()
            l = QVBoxLayout(self.tab_settings)
            l.setContentsMargins(20, 20, 20, 20)
            l.setSpacing(14)

            # Re-run Setup Wizard action button
            wizard_row = QHBoxLayout()
            wz_lbl = QLabel("Need to re-configure TARDIS from scratch?")
            btn_rerun = QPushButton("Re-run First-Run Setup Wizard")
            btn_rerun.clicked.connect(self.launch_setup_wizard)
            btn_rerun.setStyleSheet("background-color: #0284c7; color: white; font-weight: bold; padding: 6px 14px;")
            wizard_row.addWidget(wz_lbl)
            wizard_row.addStretch()
            wizard_row.addWidget(btn_rerun)
            l.addLayout(wizard_row)

            # Tdarr URL field
            l.addWidget(QLabel("Tdarr Server Address:"))
            self.set_input_url = QLineEdit()
            self.set_input_url.setStyleSheet("padding: 6px;")
            l.addWidget(self.set_input_url)

            # Media Libraries list
            l.addWidget(QLabel("Configured Media Libraries:"))
            self.set_list_libs = QListWidget()
            self.set_list_libs.setStyleSheet("background-color: #0f172a; border: 1px solid #334155; padding: 4px;")
            l.addWidget(self.set_list_libs)

            lib_btns = QHBoxLayout()
            btn_add_lib = QPushButton("Add Folder...")
            btn_add_lib.clicked.connect(self.settings_add_library)
            btn_del_lib = QPushButton("Remove Selected Folder")
            btn_del_lib.clicked.connect(self.settings_del_library)
            lib_btns.addWidget(btn_add_lib)
            lib_btns.addWidget(btn_del_lib)
            lib_btns.addStretch()
            l.addLayout(lib_btns)

            # Monitored Drives list
            l.addWidget(QLabel("Monitored Storage Drives:"))
            self.set_list_drives = QListWidget()
            self.set_list_drives.setStyleSheet("background-color: #0f172a; border: 1px solid #334155; padding: 4px;")
            l.addWidget(self.set_list_drives)

            drive_btns = QHBoxLayout()
            btn_add_drv = QPushButton("Add Drive/Root...")
            btn_add_drv.clicked.connect(self.settings_add_drive)
            btn_del_drv = QPushButton("Remove Selected Drive")
            btn_del_drv.clicked.connect(self.settings_del_drive)
            drive_btns.addWidget(btn_add_drv)
            drive_btns.addWidget(btn_del_drv)
            drive_btns.addStretch()
            l.addLayout(drive_btns)

            # Save Button
            btn_save = QPushButton("Save Settings")
            btn_save.clicked.connect(self.settings_save_all)
            btn_save.setStyleSheet("background-color: #10b981; color: white; font-weight: bold; padding: 8px 18px;")
            l.addWidget(btn_save, alignment=Qt.AlignLeft)

            self.load_settings_view()
            self.tabs.addTab(self.tab_settings, "Settings")

        def load_settings_view(self):
            self.set_input_url.setText(self.db.get_tdarr_url())
            self.set_list_libs.clear()
            for lib in self.db.get_libraries():
                self.set_list_libs.addItem(QListWidgetItem(f"📁 {lib}"))
            self.set_list_drives.clear()
            for d in self.db.get_monitored_drives():
                self.set_list_drives.addItem(QListWidgetItem(f"💽 {d.get('path')} ({format_bytes(d.get('free'))} free)"))

        def settings_add_library(self):
            folder = QFileDialog.getExistingDirectory(self, "Add Media Library Folder")
            if folder:
                ok, path = validate_library_path(folder)
                if not ok:
                    QMessageBox.warning(self, "Invalid Folder", path)
                    return
                libs = self.db.get_libraries()
                if path not in libs:
                    libs.append(path)
                    self.db.set_libraries(libs)
                    self.load_settings_view()
                    self.update_dashboard_view()

        def settings_del_library(self):
            row = self.set_list_libs.currentRow()
            libs = self.db.get_libraries()
            if 0 <= row < len(libs):
                libs.pop(row)
                self.db.set_libraries(libs)
                self.load_settings_view()
                self.update_dashboard_view()

        def settings_add_drive(self):
            folder = QFileDialog.getExistingDirectory(self, "Add Monitored Drive / Root Folder")
            if folder:
                ok, msg, data = validate_drive_path(folder)
                if not ok:
                    QMessageBox.warning(self, "Invalid Drive", msg)
                    return
                drives = self.db.get_monitored_drives()
                for d in drives:
                    if d.get("path") == data["path"]:
                        QMessageBox.information(self, "Already Monitored", "This drive is already in the list.")
                        return
                drives.append(data)
                self.db.set_monitored_drives(drives)
                self.load_settings_view()
                self.update_dashboard_view()

        def settings_del_drive(self):
            row = self.set_list_drives.currentRow()
            drives = self.db.get_monitored_drives()
            if 0 <= row < len(drives):
                drives.pop(row)
                self.db.set_monitored_drives(drives)
                self.load_settings_view()
                self.update_dashboard_view()

        def settings_save_all(self):
            url = self.set_input_url.text().strip()
            self.db.set_tdarr_url(url)
            self.refresh_from_database()
            QMessageBox.information(self, "Saved", "Settings updated successfully.")


# =============================================================================
# Automated Verification & CLI Test Engine
# =============================================================================
def run_cli_tests() -> bool:
    """Execute complete validation of TARDIS database, path validator, and first-run logic."""
    print("==========================================================================")
    print("TARDIS AUTOMATED CLI TEST & VALIDATION SUITE")
    print("Target: Windows 11 Desktop Companion Core Engine")
    print("==========================================================================")

    # 1. Test AppData Directory and write access
    app_dir = get_app_data_dir()
    print(f"[1/8] Verifying AppData Directory: {app_dir}")
    writable, write_msg = verify_appdata_writable()
    assert writable, f"AppData write check failed: {write_msg}"
    print(f"      ✔ {write_msg}")

    # 2. Test SQLite Database Initialization
    print(f"[2/8] Testing SQLite Database Initialization at: {DB_PATH}")
    db = TardisDatabase(DB_PATH)
    test_val = f"probe_{datetime.utcnow().timestamp()}"
    db.set_setting("unit_test_key", test_val)
    read_back = db.get_setting("unit_test_key")
    assert read_back == test_val, f"DB write/read mismatch: {read_back} != {test_val}"
    print("      ✔ SQLite connection and settings table verified.")

    # 3. Test First-Run State Management
    print("[3/8] Testing First-Run State Detection...")
    initial_first_run = db.is_first_run()
    print(f"      Initial first_run state: {initial_first_run}")
    db.set_first_run_completed(True)
    assert not db.is_first_run(), "Failed to set first_run_completed = True"
    print("      ✔ first_run_completed = True persisted correctly.")
    db.set_first_run_completed(False)
    assert db.is_first_run(), "Failed to reset first_run_completed = False"
    print("      ✔ first_run reset to True verified.")

    # 4. Test Media Library Path Validation
    print("[4/8] Testing Library Path Validation...")
    # Current directory should be valid
    cur_dir = os.path.abspath(".")
    ok, res = validate_library_path(cur_dir)
    assert ok, f"Expected current directory to be valid: {res}"
    print(f"      ✔ Valid directory correctly accepted: {res}")
    # Non-existent path should fail with clear error
    fake_path = os.path.join(cur_dir, "non_existent_folder_xyz_999")
    ok, err = validate_library_path(fake_path)
    assert not ok, "Non-existent path was incorrectly accepted"
    print(f"      ✔ Non-existent path correctly rejected: {err}")

    # 5. Test Drive / Storage Root Measurement
    print("[5/8] Testing Storage / Drive Validation & Measurement...")
    ok, msg, data = validate_drive_path(cur_dir)
    assert ok, f"Drive measurement failed: {msg}"
    assert data["total"] > 0, "Total bytes must be > 0"
    assert data["free"] > 0, "Free bytes must be > 0"
    print(f"      ✔ Real filesystem measurement: {msg}")

    # 6. Test Arbitrary Library Configuration Persistence
    print("[6/8] Testing Arbitrary Library Paths Persistence...")
    test_libs = [cur_dir, os.path.abspath("./windows_desktop")]
    db.set_libraries(test_libs)
    loaded_libs = db.get_libraries()
    assert loaded_libs == test_libs, f"Libraries mismatch: {loaded_libs} != {test_libs}"
    print(f"      ✔ Successfully persisted {len(loaded_libs)} arbitrary media libraries.")

    # 7. Test Tdarr Connection Validation (Truthful probe)
    print("[7/8] Testing Tdarr Connection Probe (Truthful Failure on Unreachable Port)...")
    ok, msg, _ = TdarrClient.test_connection("http://127.0.0.1:9999")
    assert not ok, "Connection to unreachable port 9999 should not claim success"
    print(f"      ✔ Truthful refusal: {msg}")

    # 8. Test Discord Webhook Validation
    print("[8/8] Testing Discord Webhook Validation...")
    ok, msg = DiscordNotifier.send_notification("https://invalid-domain.com", "Test", "Msg")
    assert not ok, "Invalid webhook domain should fail"
    print(f"      ✔ Invalid webhook correctly rejected: {msg}")

    print("==========================================================================")
    print("[SUCCESS] All TARDIS core engine tests PASSED without fabrication.")
    print("==========================================================================")
    return True


def main():
    if "--test" in sys.argv or "--verify" in sys.argv or not HAS_PYSIDE:
        success = run_cli_tests()
        if not HAS_PYSIDE:
            print("\nNote: PySide6 GUI runtime is not installed in the current environment.")
            print("The core Windows companion engine has been verified and is ready for packaging via PyInstaller.")
        sys.exit(0 if success else 1)

    app = QApplication(sys.argv)
    window = TardisMainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
