import React from "react";
import {
  HardDrive,
  CheckCircle2,
  ListOrdered,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Server,
  Play,
  Square,
  ArrowUpRight,
  ShieldAlert,
  Clock
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
  const { settings, historicalSync, sessions, duplicates } = data;

  const pendingDuplicates = duplicates.filter((d) => d.status === "pending");
  const exactDups = pendingDuplicates.filter((d) => d.confidence === "EXACT").length;
  const probableDups = pendingDuplicates.filter((d) => d.confidence === "PROBABLE").length;
  const possibleDups = pendingDuplicates.filter((d) => d.confidence === "POSSIBLE").length;

  const currentSession = sessions.find((s) => s.status === "in_progress") || sessions[0];

  return (
    <div id="tab-dashboard" className="space-y-6">
      {/* Top Banner / Hero Metric Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>System Dashboard</span>
            <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80">
              Tdarr Companion
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active monitoring of jobs, storage savings, queue lifecycle, and duplicate media
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

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Lifetime Space Saved */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Lifetime Storage Saved</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatBytes(historicalSync.totalSpaceSavedBytes)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold font-mono">
              -{formatPercent(historicalSync.percentageReduction)}
            </span>
            <span>overall reduction</span>
          </div>
        </div>

        {/* 2. Files Processed (Transcode Success / Not Required) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Files Processed</span>
            <div className="p-1.5 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-800/50">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {historicalSync.totalProcessedFiles.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-blue-400 font-semibold">
              {historicalSync.successFiles.toLocaleString()} Transcoded
            </span>
            <span>• {historicalSync.notRequiredFiles} Not Required</span>
          </div>
        </div>

        {/* 3. Transcode Queue Remaining */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Transcode Queue</span>
            <div className="p-1.5 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50">
              <ListOrdered className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {historicalSync.queuedFiles.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-400">jobs pending</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Active on 2 Tdarr nodes</span>
          </div>
        </div>

        {/* 4. Duplicate Media Candidates */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Duplicates Detected</span>
            <div className="p-1.5 rounded-lg bg-purple-950/60 text-purple-400 border border-purple-800/50">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {pendingDuplicates.length}{" "}
            <span className="text-xs font-normal text-slate-400">candidates</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <span className="text-rose-400 font-semibold">{exactDups} Exact</span>
            <span>• {probableDups} Probable</span>
            <span>• {possibleDups} Possible</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Active / Recent Session Savings & Current Drive Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Session Storage Tracking Card (Exact Format Requested) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                {currentSession.status === "in_progress"
                  ? "Active Tdarr Session (Baseline Tracking)"
                  : "Latest Completed Session"}
              </h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                currentSession.status === "in_progress"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                  : "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
              }`}
            >
              {currentSession.status === "in_progress" ? "In Progress" : "Completed"}
            </span>
          </div>

          {/* Exact Session Structure requested by prompt */}
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
        </div>

        {/* Right Col: Multiple Drives Status & Capacity */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">Hard Drives &amp; Storage</h2>
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
            <span className="font-semibold text-slate-300">Note: </span>
            TARDIS uses exact per-file byte delta from Tdarr and cross-references drive block allocation to isolate transcoding from unrelated disk activity.
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
              <span>Pending Duplicate Review</span>
            </div>
            <button
              onClick={() => onNavigate("duplicates")}
              className="text-xs px-2.5 py-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 transition-all font-medium"
            >
              Review All ({pendingDuplicates.length})
            </button>
          </div>

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
              View Node Details
            </button>
          </div>

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
        </div>
      </div>
    </div>
  );
};
