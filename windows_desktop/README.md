# TARDIS - Windows 11 Standalone Application

**Tdarr Analytics, Reports, Duplicates & Integration System**

Target Platform: Windows 11 (64-bit)  
Architecture: Standalone Desktop Companion • Local SQLite Engine • Zero Cloud Dependency • Zero LLM

---

## Architecture Overview

TARDIS operates as an independent companion for your local Tdarr cluster:
1. **Read-Only / Sidecar Connection**: Queries Tdarr via its local HTTP API (`/api/v2/status`, `/api/v2/cruddb`, `/api/v2/stats/get-pies`, `/api/v2/search-db`) or direct local file system reads. It never modifies Tdarr's binary or database.
2. **Local Storage**: Stores all session benchmarks, drive states, and duplicate candidate decisions in `%APPDATA%\TARDIS\tardis_local.db` (SQLite). Upgrading or reinstalling TARDIS will never erase your data.
3. **Safe Duplicate Management**: Deletion is never automated. When approved by the user, files are safely sent to the **Windows Recycle Bin** (`send2trash`) by default, with an optional toggle for permanent file system unlinking.
4. **Discord Webhook Notifications**: Optional, bot-free alerts delivered straight to your Discord channel.

---

## How to Build `TARDIS-Setup.exe` on Windows 11

### Prerequisites
- Python 3.10 or higher for Windows (64-bit)
- (Optional) [Inno Setup 6](https://jrsoftware.org/isinfo.php) to compile the single installer executable

### One-Click Build
Run the provided batch script:
```cmd
build_installer.bat
```

This will automatically:
1. Install PySide6, Requests, Send2Trash, and PyInstaller
2. Package `tardis.py` into `dist\TARDIS.exe` (Windowed, no console window)
3. Compile `installer.iss` into `dist_installer\TARDIS-Setup.exe`

### Running the Application Directly
To run without building an installer:
```cmd
pip install -r requirements.txt
python tardis.py
```
