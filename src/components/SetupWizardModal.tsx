import React, { useState } from "react";
import {
  Server,
  FolderTree,
  HardDrive,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Check
} from "lucide-react";
import { TardisDatabaseState, TardisSettings } from "../types";

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TardisDatabaseState;
  onSave: (newSettings: Partial<TardisSettings>) => Promise<void>;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);

  // Form state
  const [tdarrUrl, setTdarrUrl] = useState(data.settings.tdarrUrl || "http://localhost:8265");
  const [testingTdarr, setTestingTdarr] = useState(false);
  const [tdarrTestResult, setTdarrTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [libraries, setLibraries] = useState<string[]>(
    data.settings.libraries.map((l) => l.path)
  );
  const [newLibPath, setNewLibPath] = useState("");
  const [libError, setLibError] = useState("");

  const [drives, setDrives] = useState<string[]>(
    data.settings.monitoredDrives.map((d) => d.driveLetter)
  );
  const [newDrivePath, setNewDrivePath] = useState("");
  const [driveError, setDriveError] = useState("");

  const [discordEnabled, setDiscordEnabled] = useState(
    Boolean(data.settings.discordWebhookUrl)
  );
  const [discordUrl, setDiscordUrl] = useState(data.settings.discordWebhookUrl || "");
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [saving, setSaving] = useState(false);

  // 1. Test Tdarr Connection
  const handleTestTdarr = async () => {
    setTestingTdarr(true);
    setTdarrTestResult(null);
    try {
      const resp = await fetch("/api/tdarr/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: tdarrUrl })
      });
      const res = await resp.json();
      if (res.connected) {
        setTdarrTestResult({ ok: true, msg: `Verified: ${res.message}` });
      } else {
        setTdarrTestResult({ ok: false, msg: `Connection failed: ${res.message}` });
      }
    } catch (err: any) {
      setTdarrTestResult({ ok: false, msg: `Network error: ${err.message}` });
    } finally {
      setTestingTdarr(false);
    }
  };

  // 2. Add Library
  const handleAddLibrary = () => {
    const trimmed = newLibPath.trim();
    if (!trimmed) {
      setLibError("Path cannot be empty.");
      return;
    }
    if (libraries.includes(trimmed)) {
      setLibError("This library path is already added.");
      return;
    }
    setLibError("");
    setLibraries([...libraries, trimmed]);
    setNewLibPath("");
  };

  const handleRemoveLibrary = (index: number) => {
    setLibraries(libraries.filter((_, i) => i !== index));
  };

  // 3. Add Drive
  const handleAddDrive = () => {
    let trimmed = newDrivePath.trim();
    if (!trimmed) {
      setDriveError("Drive letter or path cannot be empty.");
      return;
    }
    // Normalize format like "D" -> "D:"
    if (trimmed.length === 1 && /^[a-zA-Z]$/.test(trimmed)) {
      trimmed = trimmed.toUpperCase() + ":";
    } else if (trimmed.length === 2 && trimmed[1] === ":") {
      trimmed = trimmed.toUpperCase();
    }
    if (drives.includes(trimmed)) {
      setDriveError("This drive is already in the list.");
      return;
    }
    setDriveError("");
    setDrives([...drives, trimmed]);
    setNewDrivePath("");
  };

  const handleRemoveDrive = (index: number) => {
    setDrives(drives.filter((_, i) => i !== index));
  };

  // 4. Test Discord
  const handleTestDiscord = async () => {
    if (!discordUrl) {
      setDiscordTestResult({ ok: false, msg: "Please enter a Discord Webhook URL" });
      return;
    }
    setTestingDiscord(true);
    setDiscordTestResult(null);
    try {
      const resp = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: discordUrl })
      });
      const res = await resp.json();
      if (res.success) {
        setDiscordTestResult({ ok: true, msg: "Test alert delivered to Discord successfully!" });
      } else {
        setDiscordTestResult({ ok: false, msg: res.error || "Discord rejected webhook request." });
      }
    } catch (err: any) {
      setDiscordTestResult({ ok: false, msg: `Error: ${err.message}` });
    } finally {
      setTestingDiscord(false);
    }
  };

  // 5. Save & Finish
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const formattedLibraries = libraries.map((p, idx) => ({
        id: `lib_${idx + 1}`,
        name: p.split(/[\\/]/).filter(Boolean).pop() || `Library ${idx + 1}`,
        path: p,
        drive: p.slice(0, 2)
      }));

      const formattedDrives = drives.map((d) => ({
        driveLetter: d.slice(0, 2),
        label: `Storage Volume (${d.slice(0, 2)})`,
        totalBytes: null,
        usedBytes: null,
        freeBytes: null,
        status: "unavailable" as const,
        error: "Awaiting measurement from Windows host"
      }));

      await onSave({
        firstRunCompleted: true,
        tdarrUrl,
        discordWebhookUrl: discordEnabled ? discordUrl : "",
        libraries: formattedLibraries,
        monitoredDrives: formattedDrives
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                Setup Wizard • Step {step} of 5
              </span>
              <h2 className="text-base font-bold text-slate-100">
                {step === 1 && "Tdarr Server Connection"}
                {step === 2 && "Media Library Paths"}
                {step === 3 && "Monitored Storage Drives"}
                {step === 4 && "Discord Notifications (Optional)"}
                {step === 5 && "Review & Confirm Configuration"}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {step === 1 && "Configure the endpoint where your Tdarr Server is running."}
              {step === 2 && "Add your media directories for duplicate scanning and monitoring."}
              {step === 3 && "Specify the Windows drives or root volumes to track free space changes."}
              {step === 4 && "Receive automatic webhook notifications when transcoding sessions complete."}
              {step === 5 && "Review your configuration before saving to the persistent database."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Step 1: Tdarr Server */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tdarr Server URL
                </label>
                <input
                  type="text"
                  value={tdarrUrl}
                  onChange={(e) => setTdarrUrl(e.target.value)}
                  placeholder="http://localhost:8265"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestTdarr}
                  disabled={testingTdarr}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
                >
                  {testingTdarr ? "Testing..." : "Test Connection"}
                </button>
                {tdarrTestResult && (
                  <span
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      tdarrTestResult.ok ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {tdarrTestResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{tdarrTestResult.msg}</span>
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  <span>Non-Invasive Architecture</span>
                </div>
                <p>
                  TARDIS connects as a truthful, read-only analytics companion. It will never modify your Tdarr server, pause nodes, or alter plugins.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Media Libraries */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">Configured Media Libraries ({libraries.length})</span>
                <span className="text-slate-500">Add any number of paths</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {libraries.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No library paths added yet. Add paths like <code>D:\Movies</code> or <code>E:\TV</code> below.
                  </div>
                ) : (
                  libraries.map((lib, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-slate-200 truncate">{lib}</span>
                      <button
                        onClick={() => handleRemoveLibrary(i)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove library"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLibPath}
                    onChange={(e) => setNewLibPath(e.target.value)}
                    placeholder="Enter folder path (e.g. D:\Media\Movies or /mnt/media)"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono"
                  />
                  <button
                    onClick={handleAddLibrary}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Path</span>
                  </button>
                </div>
                {libError && <p className="text-xs text-rose-400">{libError}</p>}
              </div>
            </div>
          )}

          {/* Step 3: Monitored Drives */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold">Monitored Storage Drives ({drives.length})</span>
                <span className="text-slate-500">Windows volume roots</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {drives.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    No drives registered yet. Enter drive letters below (e.g. <code>C:</code>, <code>D:</code>).
                  </div>
                ) : (
                  drives.map((d, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                          {d}
                        </span>
                        <span className="text-slate-300">Volume Root</span>
                      </div>
                      <button
                        onClick={() => handleRemoveDrive(i)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDrivePath}
                    onChange={(e) => setNewDrivePath(e.target.value)}
                    placeholder="Drive letter (e.g. D: or E:)"
                    className="w-48 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono"
                  />
                  <button
                    onClick={handleAddDrive}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Drive</span>
                  </button>
                </div>
                {driveError && <p className="text-xs text-rose-400">{driveError}</p>}
              </div>
            </div>
          )}

          {/* Step 4: Discord */}
          {step === 4 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={discordEnabled}
                  onChange={(e) => setDiscordEnabled(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Enable Discord Webhook Notifications (Optional)</span>
              </label>

              {discordEnabled && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Discord Webhook URL
                    </label>
                    <input
                      type="text"
                      value={discordUrl}
                      onChange={(e) => setDiscordUrl(e.target.value)}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTestDiscord}
                      disabled={testingDiscord}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
                    >
                      {testingDiscord ? "Sending..." : "Send Test Webhook"}
                    </button>
                    {discordTestResult && (
                      <span
                        className={`text-xs font-medium flex items-center gap-1.5 ${
                          discordTestResult.ok ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {discordTestResult.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{discordTestResult.msg}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Discord notifications are completely optional. You can skip this step and configure it later in Settings.
              </p>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <span className="text-slate-400 block text-[11px]">TDARR SERVER:</span>
                  <span className="text-slate-100 font-bold">{tdarrUrl}</span>
                </div>

                <div className="border-b border-slate-800 pb-2">
                  <span className="text-slate-400 block text-[11px]">
                    CONFIGURED LIBRARIES ({libraries.length}):
                  </span>
                  {libraries.length > 0 ? (
                    <ul className="list-disc pl-4 text-slate-200 mt-1 space-y-0.5">
                      {libraries.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-500 italic">None configured yet</span>
                  )}
                </div>

                <div className="border-b border-slate-800 pb-2">
                  <span className="text-slate-400 block text-[11px]">
                    MONITORED DRIVES ({drives.length}):
                  </span>
                  {drives.length > 0 ? (
                    <div className="flex gap-2 mt-1">
                      {drives.map((d, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded border border-blue-800">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">None configured yet</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">DISCORD NOTIFICATIONS:</span>
                  <span className={discordEnabled ? "text-emerald-400" : "text-slate-400"}>
                    {discordEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/80">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save & Finish"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
