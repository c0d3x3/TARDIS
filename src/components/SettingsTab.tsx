import React, { useState } from "react";
import {
  Settings,
  Shield,
  HardDrive,
  FolderTree,
  Package,
  Download,
  Check,
  Save,
  Trash2,
  Plus,
  FileCode,
  Terminal,
  Database
} from "lucide-react";
import { TardisDatabaseState, TardisSettings } from "../types";
import { formatBytes } from "../utils";

interface SettingsTabProps {
  data: TardisDatabaseState;
  onUpdateSettings: (newSettings: Partial<TardisSettings>) => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ data, onUpdateSettings }) => {
  const { settings } = data;
  const [tdarrUrl, setTdarrUrl] = useState(settings.tdarrUrl);
  const [safeDeleteMode, setSafeDeleteMode] = useState(settings.safeDeleteMode);
  const [autoSyncSec, setAutoSyncSec] = useState(settings.autoSyncIntervalSec);
  const [drives, setDrives] = useState(settings.monitoredDrives);
  const [libraries, setLibraries] = useState(settings.libraries);

  const [newDriveLetter, setNewDriveLetter] = useState("");
  const [newDriveLabel, setNewDriveLabel] = useState("");
  const [newDriveTb, setNewDriveTb] = useState(14);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    await onUpdateSettings({
      tdarrUrl,
      safeDeleteMode,
      autoSyncIntervalSec: autoSyncSec,
      monitoredDrives: drives,
      libraries
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddDrive = () => {
    if (!newDriveLetter) return;
    const letter = newDriveLetter.toUpperCase().replace(":", "") + ":";
    const totalBytes = newDriveTb * 1000 * 1000 * 1000 * 1000;
    const newDrive = {
      driveLetter: letter,
      label: newDriveLabel || `Media Storage (${newDriveTb}TB)`,
      totalBytes,
      usedBytes: totalBytes * 0.7,
      freeBytes: totalBytes * 0.3
    };
    setDrives([...drives, newDrive]);
    setNewDriveLetter("");
    setNewDriveLabel("");
  };

  const handleRemoveDrive = (letter: string) => {
    setDrives(drives.filter((d) => d.driveLetter !== letter));
  };

  const handleDownloadBackup = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TARDIS_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="tab-settings" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <span>Settings &amp; System Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Storage drives, duplicate removal policy, local database backup, and Windows 11 packaging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="settings-save-btn"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? "Saved Settings" : "Save All Settings"}</span>
          </button>
        </div>
      </div>

      {/* Safety & Deletion Mode */}
      <div className="p-5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>File Safety &amp; Duplicate Removal Policy</span>
        </div>

        <div className="space-y-3">
          <label className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="safeDelete"
              value="recycle_bin"
              checked={safeDeleteMode === "recycle_bin"}
              onChange={() => setSafeDeleteMode("recycle_bin")}
              className="mt-0.5 text-blue-600 focus:ring-0"
            />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-slate-200 block">
                Move to Windows Recycle Bin (Safe &amp; Recoverable) [Recommended]
              </span>
              <p className="text-slate-400 leading-relaxed">
                Uses the native Windows Shell API (SHFileOperationW / send2trash) so discarded duplicates can be restored from the Recycle Bin if needed.
              </p>
            </div>
          </label>

          <label className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="safeDelete"
              value="permanent"
              checked={safeDeleteMode === "permanent"}
              onChange={() => setSafeDeleteMode("permanent")}
              className="mt-0.5 text-blue-600 focus:ring-0"
            />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-rose-300 block">
                Permanent Filesystem Unlink (Direct Delete)
              </span>
              <p className="text-slate-400 leading-relaxed">
                Immediately deletes files from the drive volume without moving to the Recycle Bin. Still requires explicit button confirmation for every file.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Monitored Hard Drives Configuration */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Monitored Storage Drives (Multiple Volumes)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {drives.length} drives registered
          </span>
        </div>

        <div className="space-y-2.5">
          {drives.map((d) => (
            <div
              key={d.driveLetter}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold border border-blue-700">
                  {d.driveLetter}\
                </span>
                <div>
                  <span className="text-slate-200 font-bold block">{d.label}</span>
                  <span className="text-slate-400 text-[11px]">
                    Total: {formatBytes(d.totalBytes, 1)} • Used: {formatBytes(d.usedBytes, 1)} • Free: {formatBytes(d.freeBytes, 1)}
                  </span>
                </div>
              </div>

              {drives.length > 1 && (
                <button
                  onClick={() => handleRemoveDrive(d.driveLetter)}
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Remove drive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add new drive row */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Letter (e.g. F:)"
            value={newDriveLetter}
            onChange={(e) => setNewDriveLetter(e.target.value)}
            className="w-24 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
          />
          <input
            type="text"
            placeholder="Label (e.g. Media Vault 3)"
            value={newDriveLabel}
            onChange={(e) => setNewDriveLabel(e.target.value)}
            className="flex-1 min-w-[160px] px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs"
          />
          <input
            type="number"
            placeholder="TB Capacity"
            value={newDriveTb}
            onChange={(e) => setNewDriveTb(Number(e.target.value))}
            className="w-24 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs"
          />
          <button
            onClick={handleAddDrive}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Drive</span>
          </button>
        </div>
      </div>

      {/* Database Backup & Export */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <Database className="w-4 h-4 text-purple-400" />
            <span>Local Database Maintenance &amp; Backup</span>
          </div>
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Database JSON</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          TARDIS records all sessions, historical benchmarks, and duplicate results in a local, self-contained database in{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-950 text-blue-300 font-mono text-[11px]">
            %APPDATA%\TARDIS\data\
          </code>
          . It will never be overwritten or erased when upgrading or reinstalling TARDIS.
        </p>
      </div>

      {/* Windows 11 Packaging & Installer Distribution Section */}
      <div className="p-5 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Package className="w-4.5 h-4.5 text-blue-400" />
            <span>Windows 11 Standalone Installer (TARDIS-Setup.exe)</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
            Ready for PyInstaller &amp; Inno Setup
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          TARDIS has been architected to compile into a single <strong>TARDIS-Setup.exe</strong> installer for Windows 11.
          It bundles all Python + PySide6 runtime dependencies so end users do not need Python, Node, Git, or compilers.
        </p>

        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
          <div className="text-slate-400 text-[11px] font-bold">Files prepared in workspace for Windows:</div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-300">
            <li>
              <code className="text-blue-300">windows_desktop/tardis.py</code> - Complete PySide6 / Python GUI implementation
            </li>
            <li>
              <code className="text-blue-300">windows_desktop/tardis.spec</code> - PyInstaller standalone build configuration
            </li>
            <li>
              <code className="text-blue-300">windows_desktop/installer.iss</code> - Inno Setup 6 compiler script generating <strong>TARDIS-Setup.exe</strong>
            </li>
            <li>
              <code className="text-blue-300">windows_desktop/build_installer.bat</code> - One-click compilation script
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
