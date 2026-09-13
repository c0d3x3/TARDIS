import React, { useState } from "react";
import {
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  FolderTree,
  Activity,
  AlertTriangle,
  Info
} from "lucide-react";
import { TardisDatabaseState } from "../types";
import { formatBytes, formatPercent, formatDate } from "../utils";

interface TdarrTabProps {
  data: TardisDatabaseState;
  onSync: () => void;
  isSyncing: boolean;
  onUpdateSettings: (newSettings: any) => void;
}

export const TdarrTab: React.FC<TdarrTabProps> = ({
  data,
  onSync,
  isSyncing,
  onUpdateSettings
}) => {
  const { settings, userBaseline, historicalSync, connectionStatus } = data;
  const [targetUrl, setTargetUrl] = useState(settings.tdarrUrl);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    version?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch("/api/tdarr/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl })
      });
      const res = await resp.json();
      setTestResult({
        tested: true,
        connected: res.connected,
        message: res.message,
        version: res.version
      });
      if (targetUrl !== settings.tdarrUrl) {
        onUpdateSettings({ tdarrUrl: targetUrl });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        connected: false,
        message: `Network probe error: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="tab-tdarr" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            <span>Tdarr Integration &amp; Diagnostic</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Non-invasive read-only interface connecting to your active Tdarr server without interrupting ongoing transcodes
          </p>
        </div>

        <button
          id="tdarr-sync-btn"
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Synchronizing Data..." : "Run Historical Sync"}</span>
        </button>
      </div>

      {/* Connection & Diagnostic Banner */}
      <div className="p-5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${connectionStatus.connected ? "text-emerald-400" : "text-amber-400"}`} />
            <h2 className="text-sm font-semibold text-slate-200">
              Tdarr Connection &amp; Telemetry Status
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
              connectionStatus.connected
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-800"
                : "bg-amber-950/80 text-amber-300 border-amber-800"
            }`}
          >
            {connectionStatus.connected ? "Status: Connected / Live" : "Status: Disconnected / Baseline Mode"}
          </span>
        </div>

        {/* Diagnostic Status Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Live Connection:</span>
            {connectionStatus.connected ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Awaiting Connection
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Server &amp; Port:</span>
            <span className="text-slate-200 font-semibold truncate block">
              {settings.tdarrUrl.replace("http://", "")}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Libraries Configured:</span>
            <span className="text-blue-400 font-bold">{settings.libraries.length} Libraries</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 text-[11px] block">Active Nodes:</span>
            <span className={historicalSync.nodes.length > 0 ? "text-purple-400 font-bold" : "text-slate-400"}>
              {historicalSync.nodes.length} Detected
            </span>
          </div>

          <div className="space-y-0.5 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Queued Jobs:</span>
            {historicalSync.isLiveVerified && historicalSync.queuedFiles !== null ? (
              <span className="text-amber-400 font-bold">{historicalSync.queuedFiles.toLocaleString()} (Verified)</span>
            ) : userBaseline.enabled ? (
              <span className="text-amber-300 font-bold">~{userBaseline.queuedFiles.toLocaleString()} (Baseline)</span>
            ) : (
              <span className="text-slate-500 font-bold">--</span>
            )}
          </div>

          <div className="space-y-0.5 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Historical Jobs:</span>
            {historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null ? (
              <span className="text-emerald-400 font-bold">
                {historicalSync.totalProcessedFiles.toLocaleString()} (Verified)
              </span>
            ) : userBaseline.enabled ? (
              <span className="text-blue-300 font-bold">
                ~{userBaseline.totalProcessedFiles.toLocaleString()} (Baseline)
              </span>
            ) : (
              <span className="text-slate-500 font-bold">--</span>
            )}
          </div>

          <div className="space-y-0.5 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Historical Space Saved:</span>
            {historicalSync.isLiveVerified && historicalSync.totalSpaceSavedBytes !== null ? (
              <span className="text-emerald-300 font-bold">
                {formatBytes(historicalSync.totalSpaceSavedBytes, 2)}
              </span>
            ) : (
              <span className="text-slate-500 font-bold">-- (Awaiting Sync)</span>
            )}
          </div>

          <div className="space-y-0.5 pt-2 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px] block">Last Sync Attempt:</span>
            <span className="text-slate-300">{formatDate(historicalSync.lastSyncTime)}</span>
          </div>
        </div>

        {/* Server URL Input & Live Probe Form */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-700 text-xs">
            <Server className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 shrink-0">Tdarr Server URL:</span>
            <input
              id="tdarr-url-input"
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="http://localhost:8265"
              className="w-full bg-transparent text-slate-100 focus:outline-none font-mono text-xs"
            />
          </div>
          <button
            id="tdarr-test-btn"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
          >
            {isTesting ? "Probing..." : "Test Connection"}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              testResult.connected
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-200"
                : "bg-amber-950/40 border-amber-800 text-amber-200"
            }`}
          >
            <div className="font-semibold">{testResult.message}</div>
            {!testResult.connected && (
              <div className="mt-2 text-[11px] text-slate-300 space-y-1">
                <div>Troubleshooting tips:</div>
                <ul className="list-disc pl-5 space-y-0.5 text-slate-400">
                  <li>Verify Tdarr Server service is running on your Windows 11 host.</li>
                  <li>Check that port 8265 is not blocked by Windows Defender Firewall.</li>
                  <li>If running Tdarr in Docker or WSL, verify the host IP or bridge port mapping.</li>
                  <li>TARDIS will continue operating in User Baseline mode until connected.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two Columns: Monitored Libraries & Tdarr Transcode Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitored Libraries */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Configured Media Libraries</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Target Drives D:\ and E:\
            </span>
          </div>

          <div className="space-y-2.5">
            {settings.libraries.map((lib) => (
              <div
                key={lib.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{lib.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 font-mono text-[10px] border border-blue-800">
                    Drive {lib.drive}
                  </span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] truncate">
                  Path: {lib.path}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcoding Nodes & Hardware */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Tdarr Transcoding Nodes</h3>
            </div>
            {historicalSync.nodes.length > 0 && (
              <span className="text-xs text-emerald-400 font-medium">
                {historicalSync.nodes.length} Online
              </span>
            )}
          </div>

          {historicalSync.nodes.length > 0 ? (
            <div className="space-y-3">
              {historicalSync.nodes.map((node) => (
                <div
                  key={node.name}
                  className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-bold text-slate-100">{node.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 font-mono text-[11px] border border-emerald-800">
                      {node.fps} FPS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                    <div>IP Address: {node.ip}</div>
                    <div>Workers: {node.activeWorkers} active</div>
                    <div className="col-span-2 text-purple-300">Acceleration: {node.gpu}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-2">
              <Cpu className="w-6 h-6 text-slate-500 mx-auto" />
              <div className="text-slate-300 font-medium">No Live Workers Detected</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Nodes report GPU hardware acceleration (e.g. NVENC, QSV) and real-time FPS rates once TARDIS connects to your running Tdarr Server instance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Deep Architecture Clarification Box */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-2">
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Zero-Impact Read-Only Architecture</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          TARDIS connects as an independent, non-invasive observer. It communicates through Tdarr’s standard HTTP API (
          <code className="px-1 py-0.5 bg-slate-900 rounded text-blue-300">/api/v2/status</code>,{" "}
          <code className="px-1 py-0.5 bg-slate-900 rounded text-blue-300">/api/v2/get-nodes</code>, and{" "}
          <code className="px-1 py-0.5 bg-slate-900 rounded text-blue-300">/api/v2/stats/get-pies</code>
          ). TARDIS does not modify Tdarr’s databases, never alters plugin stacks, and will not disrupt active transcode queues.
        </p>
      </div>
    </div>
  );
};
