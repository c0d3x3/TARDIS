import React from "react";
import {
  HardDrive,
  CheckCircle2,
  ListOrdered,
  TrendingDown,
  AlertTriangle,
  Server,
  Play,
  Square,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";
import { TardisDatabaseState, ViewTab } from "../types";
import { formatBytes, formatPercent, formatDate } from "../utils";

interface DashboardTabProps {
  data: TardisDatabaseState;
  onNavigate: (tab: ViewTab) => void;
  onStartSession: () => void;
  onStopSession: () => void;
  isSessionActive: boolean;
  onSync: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  data,
  onNavigate,
  onStartSession,
  onStopSession,
  isSessionActive,
  onSync
}) => {
  const { settings, userBaseline, historicalSync, connectionStatus, sessions, duplicates } = data;

  const pendingDuplicates = duplicates.filter((d) => d.status === "pending");
  const exactDups = pendingDuplicates.filter((d) => d.confidence === "EXACT").length;
  const probableDups = pendingDuplicates.filter((d) => d.confidence === "PROBABLE").length;
  const possibleDups = pendingDuplicates.filter((d) => d.confidence === "POSSIBLE").length;
  const hasDemoDuplicates = duplicates.some((d) => d.isDemo);

  const currentSession = sessions.find((s) => s.status === "in_progress") || sessions[0];

  return (
    <div id="tab-dashboard" className="space-y-6">
      {/* Top Banner / Hero Metric Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">System Dashboard</h1>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                connectionStatus.connected
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-700"
                  : "bg-amber-950/80 text-amber-300 border-amber-700"
              }`}
            >
              {connectionStatus.connected
                ? `Tdarr Live • v${connectionStatus.tdarrVersion || "Active"}`
                : "Tdarr Disconnected • Baseline Mode"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Truthful monitoring of transcode benchmarks, queue lifecycle, storage drives, and duplicates
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {isSessionActive ? (
            <button
              id="dashboard-end-tracking-btn"
              onClick={onStopSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5" />
              <span>End Tracking Session</span>
            </button>
          ) : (
            <button
              id="dashboard-start-tracking-btn"
              onClick={onStartSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Tracking Session</span>
            </button>
          )}

          <button
            id="dashboard-sync-btn"
            onClick={onSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            <span>Query Tdarr API</span>
          </button>
        </div>
      </div>

      {/* Truthful Architecture Status Notice */}
      {!connectionStatus.connected && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-800/50 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span>Truthful Data Mode Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                User-Provided Baseline
              </span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tdarr server is currently unreachable at <code className="text-blue-300 font-mono">{settings.tdarrUrl}</code>. File and queue metrics are displaying your <strong>user-provided approximate baseline</strong> (1,812 processed, 909 queued). TARDIS does not invent numbers; unverified storage metrics remain labeled as <em>Awaiting Live Sync</em> until verified with Tdarr.
            </p>
          </div>
        </div>
      )}

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Lifetime Space Saved */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Lifetime Storage Saved</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div>
            {historicalSync.isLiveVerified && historicalSync.totalSpaceSavedBytes !== null ? (
              <>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {formatBytes(historicalSync.totalSpaceSavedBytes)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <span className="text-emerald-400 font-semibold font-mono">
                    -{formatPercent(historicalSync.percentageReduction)}
                  </span>
                  <span>overall reduction</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-500 font-mono">--</div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                    Awaiting Live Sync
                  </span>
                  <span className="truncate">Requires Tdarr stats/get-pies</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. Files Processed (Transcode Success / Not Required) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Files Processed</span>
            <div className="p-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div>
            {historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null ? (
              <>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {historicalSync.totalProcessedFiles.toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Live Verified
                  </span>
                  <span>{historicalSync.successFiles} Transcoded</span>
                </div>
              </>
            ) : userBaseline.enabled ? (
              <>
                <div className="text-2xl font-bold text-slate-200 tracking-tight flex items-baseline gap-2">
                  <span>~{userBaseline.totalProcessedFiles.toLocaleString()}</span>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">Baseline</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800">
                    User Baseline
                  </span>
                  <span className="truncate">Success / Not Required</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-500 font-mono">--</div>
                <div className="text-[11px] text-slate-400 mt-1">Awaiting Data</div>
              </>
            )}
          </div>
        </div>

        {/* 3. Transcode Queue Remaining */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Transcode Queue</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50">
              <ListOrdered className="w-4 h-4" />
            </div>
          </div>

          <div>
            {historicalSync.isLiveVerified && historicalSync.queuedFiles !== null ? (
              <>
                <div className="text-2xl font-bold text-white tracking-tight">
                  {historicalSync.queuedFiles.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-400">jobs pending</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{historicalSync.nodes.length} active node(s)</span>
                </div>
              </>
            ) : userBaseline.enabled ? (
              <>
                <div className="text-2xl font-bold text-slate-200 tracking-tight flex items-baseline gap-2">
                  <span>~{userBaseline.queuedFiles.toLocaleString()}</span>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">Baseline</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800">
                    User Baseline
                  </span>
                  <span>pending jobs</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-500 font-mono">--</div>
                <div className="text-[11px] text-slate-400 mt-1">Awaiting Data</div>
              </>
            )}
          </div>
        </div>

        {/* 4. Duplicate Media Candidates */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Duplicates Detected</span>
            <div className="p-1.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/50">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {pendingDuplicates.length}{" "}
              <span className="text-xs font-normal text-slate-400">candidates</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              {hasDemoDuplicates ? (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800">
                  Sample Preview Set
                </span>
              ) : pendingDuplicates.length > 0 ? (
                <>
                  <span className="text-rose-400 font-semibold">{exactDups} Exact</span>
                  <span>• {probableDups} Probable</span>
                </>
              ) : (
                <span className="text-slate-500 text-[11px]">No duplicate scan executed yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Active / Recent Session Savings & Hard Drive Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Session Storage Tracking Card */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                {currentSession
                  ? currentSession.status === "in_progress"
                    ? "Active Tdarr Session (Storage Benchmark)"
                    : "Latest Completed Session"
                  : "Session Storage Benchmark Tracking"}
              </h2>
            </div>
            {currentSession && (
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                  currentSession.status === "in_progress"
                    ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                    : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
                }`}
              >
                {currentSession.status === "in_progress" ? "In Progress" : "Completed"}
              </span>
            )}
          </div>

          {currentSession ? (
            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-2.5">
              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Started:</span>
                <span className="text-slate-100">{formatDate(currentSession.startTime)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                <span className="text-slate-400">Primary Target Drive:</span>
                <span className="text-blue-300 font-semibold">{currentSession.drive}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1 border-b border-slate-800/60">
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-bold mb-1">Before Session:</div>
                  <div>Total: {formatBytes(currentSession.driveBefore.total, 1)}</div>
                  <div>Used: {formatBytes(currentSession.driveBefore.used, 2)}</div>
                  <div>Free: {formatBytes(currentSession.driveBefore.free, 2)}</div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div className="text-[11px] text-emerald-400 font-bold mb-1">
                    {currentSession.status === "in_progress" ? "Current Measurement:" : "After Session:"}
                  </div>
                  <div>Total: {formatBytes(currentSession.driveCurrent.total, 1)}</div>
                  <div className="text-emerald-300 font-semibold">
                    Used: {formatBytes(currentSession.driveCurrent.used, 2)}
                  </div>
                  <div className="text-emerald-300 font-semibold">
                    Free: {formatBytes(currentSession.driveCurrent.free, 2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 text-[11px] block">Files Processed:</span>
                  <span className="text-slate-100 font-semibold text-sm">
                    {currentSession.filesProcessed.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Original Media:</span>
                  <span className="text-slate-100 font-semibold text-sm">
                    {formatBytes(currentSession.originalBytes, 1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Resulting Size:</span>
                  <span className="text-slate-100 font-semibold text-sm">
                    {formatBytes(currentSession.currentBytes, 1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Space Saved:</span>
                  <span className="text-emerald-400 font-semibold text-sm">
                    {formatBytes(currentSession.spaceSavedBytes, 1)} (-{currentSession.reductionPercent}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
              <div className="p-3 rounded-full bg-slate-900 w-10 h-10 mx-auto flex items-center justify-center text-slate-400">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-200">
                  No Active Tracking Session
                </div>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                  TARDIS records exact before/after drive snapshots and file byte deltas so you can isolate transcoding storage reclamation from background downloads or operating system disk writes.
                </p>
              </div>
              <button
                onClick={onStartSession}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Baseline Tracking Session</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Multiple Drives Status & Capacity */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">Monitored Hard Drives</h2>
            </div>
            <button
              onClick={() => onNavigate("settings")}
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-4">
            {settings.monitoredDrives.map((drive) => {
              const usedPct = Math.round((drive.usedBytes / drive.totalBytes) * 100);
              const freePct = 100 - usedPct;
              return (
                <div
                  key={drive.driveLetter}
                  className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono font-bold text-xs border border-blue-700/60">
                        {drive.driveLetter}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{drive.label}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{usedPct}% used</span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        usedPct > 85 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                    <span>Used: {formatBytes(drive.usedBytes, 1)}</span>
                    <span className="text-emerald-400 font-semibold">
                      Free: {formatBytes(drive.freeBytes, 1)} ({freePct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300">Deterministic Principle: </span>
            TARDIS uses exact per-file byte deltas from Tdarr and cross-references Windows drive allocations to prevent unrelated disk churn from distorting transcode statistics.
          </div>
        </div>
      </div>

      {/* Bottom Row: Duplicate Review Quick Prompt & Tdarr Node Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicates Attention Box */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Duplicate Media Detection</span>
            </div>
            <button
              onClick={() => onNavigate("duplicates")}
              className="text-xs px-2.5 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 transition-all font-medium"
            >
              Open Duplicates Tab
            </button>
          </div>

          {pendingDuplicates.length > 0 ? (
            <div className="space-y-2">
              {pendingDuplicates.slice(0, 2).map((dup) => (
                <div
                  key={dup.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-mono rounded border ${
                          dup.confidence === "EXACT"
                            ? "bg-rose-950/80 text-rose-300 border-rose-800"
                            : dup.confidence === "PROBABLE"
                            ? "bg-amber-950/80 text-amber-300 border-amber-800"
                            : "bg-blue-950/80 text-blue-300 border-blue-800"
                        }`}
                      >
                        {dup.confidence}
                      </span>
                      <span className="font-semibold text-slate-200 truncate">{dup.title}</span>
                    </div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">
                      {dup.reason}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate("duplicates")}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 text-[11px]"
                  >
                    Inspect
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <div>No duplicate items currently in review.</div>
              <div className="text-[11px] text-slate-500">
                Run a media folder scan in the Duplicates tab to discover redundant files or previous rip versions.
              </div>
            </div>
          )}
        </div>

        {/* Tdarr Active Nodes Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Tdarr Transcoding Nodes</span>
            </div>
            <button
              onClick={() => onNavigate("tdarr")}
              className="text-xs text-blue-400 hover:underline"
            >
              Configure Connection
            </button>
          </div>

          {historicalSync.nodes.length > 0 ? (
            <div className="space-y-2">
              {historicalSync.nodes.map((node) => (
                <div
                  key={node.name}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{node.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {node.gpu} • {node.activeWorkers} active worker(s)
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-emerald-400 font-bold">{node.fps} FPS</span>
                    <span className="text-slate-400 block text-[10px]">Processing rate</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-950/50 border border-dashed border-slate-800 text-center text-xs text-slate-400 space-y-1">
              <div className="text-slate-300 font-medium">No live nodes detected</div>
              <div className="text-[11px] text-slate-500">
                {connectionStatus.connected
                  ? "Tdarr Server reports 0 active worker nodes registered."
                  : "Connect to live Tdarr Server at " + settings.tdarrUrl + " to stream node and worker telemetry."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
