import React, { useState } from "react";
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Clock,
  Sparkles,
  Info
} from "lucide-react";
import { TardisDatabaseState } from "../types";
import { formatDate, formatBytes } from "../utils";

interface DiscordTabProps {
  data: TardisDatabaseState;
  onUpdateSettings: (newSettings: any) => Promise<void>;
}

export const DiscordTab: React.FC<DiscordTabProps> = ({ data, onUpdateSettings }) => {
  const { settings, discordLogs, historicalSync, duplicates } = data;
  const [webhookUrl, setWebhookUrl] = useState(settings.discordWebhookUrl);
  const [notifyOnComplete, setNotifyOnComplete] = useState(settings.discordNotifyOnComplete);
  const [notifyOnError, setNotifyOnError] = useState(settings.discordNotifyOnError);
  const [notifyOnDuplicates, setNotifyOnDuplicates] = useState(settings.discordNotifyOnDuplicates);

  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveSettings = async () => {
    await onUpdateSettings({
      discordWebhookUrl: webhookUrl,
      discordNotifyOnComplete: notifyOnComplete,
      discordNotifyOnError: notifyOnError,
      discordNotifyOnDuplicates: notifyOnDuplicates
    });
    setTestResult({ success: true, message: "Discord settings saved locally in SQLite." });
  };

  const handleSendTest = async (type: "test" | "session_completed" | "error" | "duplicate_scan") => {
    if (!webhookUrl) {
      setTestResult({
        success: false,
        message: "Please enter a Discord Webhook URL first."
      });
      return;
    }

    setIsSending(true);
    setTestResult(null);
    try {
      const resp = await fetch("/api/discord/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl,
          notificationType: type
        })
      });
      const res = await resp.json();
      if (res.success) {
        setTestResult({ success: true, message: res.message });
      } else {
        setTestResult({ success: false, message: res.error || "Failed to deliver webhook." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div id="tab-discord" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <span>Discord Webhook Notifications</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Lightweight, bot-free alerts delivered straight to your personal Discord channel
          </p>
        </div>

        <button
          id="discord-save-settings-btn"
          onClick={handleSaveSettings}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm"
        >
          Save Discord Settings
        </button>
      </div>

      {/* Webhook Configuration Card */}
      <div className="p-5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>Webhook URL &amp; Delivery Rules</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {webhookUrl ? "Configured" : "Disabled (Optional)"}
          </span>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 block">
            Discord Webhook URL:
          </label>
          <input
            id="discord-webhook-input"
            type="password"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/1234567890/abcdef..."
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
          />
          <p className="text-[11px] text-slate-400">
            Stored locally on your Windows machine in SQLite. Never sent to any cloud server.
          </p>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <label className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnComplete}
              onChange={(e) => setNotifyOnComplete(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Session Completed</span>
              <span className="text-slate-400 text-[11px]">Space saved &amp; stats</span>
            </div>
          </label>

          <label className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnError}
              onChange={(e) => setNotifyOnError(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Tdarr Errors</span>
              <span className="text-slate-400 text-[11px]">Failed job alerts</span>
            </div>
          </label>

          <label className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyOnDuplicates}
              onChange={(e) => setNotifyOnDuplicates(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Duplicate Scans</span>
              <span className="text-slate-400 text-[11px]">Summary of findings</span>
            </div>
          </label>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              testResult.success
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                : "bg-rose-950/40 border-rose-800 text-rose-200"
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* Live Dispatch Preview & Test Triggers */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Notification Format &amp; Embed Preview
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real Discord Webhook Payloads</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Card 1: Session Completed (Green) */}
          <div className="p-4 rounded-lg bg-slate-950 border-l-4 border-emerald-500 border-t border-r border-b border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>🟢 TARDIS: Tdarr session completed</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>Files processed: {historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null ? historicalSync.totalProcessedFiles : "[Count]"}</div>
              <div>Space saved: {historicalSync.isLiveVerified && historicalSync.totalSpaceSavedBytes !== null ? formatBytes(historicalSync.totalSpaceSavedBytes, 2) : "[Reclaimed GB]"}</div>
              <div>Drives monitored: D:\, E:\</div>
              <div className="text-emerald-400 pt-1 font-semibold">
                Status: Completed successfully
              </div>
            </div>
            <button
              id="test-webhook-session-btn"
              onClick={() => handleSendTest("session_completed")}
              disabled={isSending}
              className="w-full mt-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              Dispatch Test to Discord
            </button>
          </div>

          {/* Card 2: Errors Alert (Red) */}
          <div className="p-4 rounded-lg bg-slate-950 border-l-4 border-rose-500 border-t border-r border-b border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-rose-400 font-bold">
              <span>🔴 TARDIS: Tdarr processing errors</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div className="text-rose-300 font-bold">Transcode failure detected</div>
              <div>Libraries: {settings.libraries.map(l => l.name).join(", ") || "Active Libraries"}</div>
              <div>Error code: Handbrake/FFmpeg non-zero exit</div>
              <div className="text-slate-400 pt-1">Open TARDIS for details.</div>
            </div>
            <button
              id="test-webhook-error-btn"
              onClick={() => handleSendTest("error")}
              disabled={isSending}
              className="w-full mt-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              Dispatch Test to Discord
            </button>
          </div>

          {/* Card 3: Duplicate Scan (Yellow) */}
          <div className="p-4 rounded-lg bg-slate-950 border-l-4 border-amber-500 border-t border-r border-b border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>🟡 TARDIS: Duplicate scan completed</span>
            </div>
            <div className="text-slate-300 space-y-1 text-[11px]">
              <div>Total candidates: {duplicates.length}</div>
              <div>Exact duplicates: {duplicates.filter(d => d.confidence === "EXACT").length}</div>
              <div>Probable: {duplicates.filter(d => d.confidence === "PROBABLE").length}</div>
              <div className="text-amber-300 pt-1">No files were deleted automatically.</div>
            </div>
            <button
              id="test-webhook-dup-btn"
              onClick={() => handleSendTest("duplicate_scan")}
              disabled={isSending}
              className="w-full mt-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
            >
              Dispatch Test to Discord
            </button>
          </div>
        </div>
      </div>

      {/* Dispatch History Log */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Recent Webhook Deliveries</h2>
        {discordLogs.length > 0 ? (
          <div className="space-y-2">
            {discordLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-semibold text-slate-200">{log.title}</span>
                  <span className="text-slate-400 text-[11px] block">{formatDate(log.timestamp)}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 rounded-lg bg-slate-950/40 border border-dashed border-slate-800">
            No webhook deliveries logged yet. Test your webhook or wait for transcode events.
          </div>
        )}
      </div>
    </div>
  );
};
