import React, { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  HardDrive,
  Film,
  Layers,
  Calendar,
  AlertTriangle,
  Sparkles,
  Info,
  Clock
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { TardisDatabaseState } from "../types";
import { formatBytes, formatPercent, formatDate } from "../utils";

interface AnalyticsTabProps {
  data: TardisDatabaseState;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ data }) => {
  const { historicalSync, userBaseline, sessions, settings } = data;
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  // Real chart data derived from actual recorded sessions
  const realSessionChartData = sessions.map((s, idx) => ({
    name: s.id.replace("sess-", ""),
    origGB: Number((s.originalBytes / (1024 * 1024 * 1024)).toFixed(1)),
    savedGB: Number((s.spaceSavedBytes / (1024 * 1024 * 1024)).toFixed(1)),
    finalGB: Number((s.currentBytes / (1024 * 1024 * 1024)).toFixed(1)),
    files: s.filesProcessed
  }));

  // Clearly labeled sample preview data (only shown if user explicitly enables preview toggle)
  const sampleData = [
    { name: "Batch 1 (Sample)", origGB: 340.0, savedGB: 142.4, finalGB: 197.6, files: 48 },
    { name: "Batch 2 (Sample)", origGB: 390.0, savedGB: 168.1, finalGB: 221.9, files: 56 },
    { name: "Batch 3 (Sample)", origGB: 440.0, savedGB: 184.2, finalGB: 255.8, files: 62 },
    { name: "Batch 4 (Sample)", origGB: 510.0, savedGB: 211.4, finalGB: 298.6, files: 74 }
  ];

  const hasRealSessions = realSessionChartData.length > 0;
  const chartData = hasRealSessions ? realSessionChartData : showSamplePreview ? sampleData : [];

  return (
    <div id="tab-analytics" className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span>Storage &amp; Transcoding Analytics</span>
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Deterministic Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            File-level savings, sector deltas, codec efficiency, and empirical session telemetry
          </p>
        </div>

        {/* Sample Preview Toggle */}
        <div className="flex items-center gap-2">
          {!hasRealSessions && (
            <button
              onClick={() => setShowSamplePreview(!showSamplePreview)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                showSamplePreview
                  ? "bg-amber-950/80 text-amber-300 border-amber-700"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showSamplePreview ? "Hide Sample Preview" : "Preview Sample Analytics"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {showSamplePreview && !hasRealSessions && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 flex items-center gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>[SAMPLE DATA PREVIEW]</strong> Displaying synthetic visualization mocks to preview chart layout. No fake numbers are saved to the database.
          </span>
        </div>
      )}

      {/* Overview Analytics Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Saved */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Lifetime Saved</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              {historicalSync.isLiveVerified ? "Live Verified" : "Awaiting Sync"}
            </span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {historicalSync.isLiveVerified && historicalSync.totalSpaceSavedBytes !== null
              ? formatBytes(historicalSync.totalSpaceSavedBytes, 2)
              : "--"}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across monitored drives</span>
        </div>

        {/* Avg Reduction */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Overall Reduction</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              {historicalSync.isLiveVerified ? "Live Verified" : "Awaiting Sync"}
            </span>
          </div>
          <div className="text-lg font-bold text-blue-400">
            {historicalSync.isLiveVerified && historicalSync.percentageReduction !== null
              ? formatPercent(historicalSync.percentageReduction)
              : "--"}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Transcode efficiency</span>
        </div>

        {/* Processed Count */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Processed Files</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              {historicalSync.isLiveVerified ? "Live Verified" : "User Baseline"}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-100">
            {historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null
              ? historicalSync.totalProcessedFiles.toLocaleString()
              : userBaseline.enabled
              ? `~${userBaseline.totalProcessedFiles.toLocaleString()}`
              : "--"}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Success &amp; Not Required</span>
        </div>

        {/* Queued Count */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Queued Jobs</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              {historicalSync.isLiveVerified ? "Live Verified" : "User Baseline"}
            </span>
          </div>
          <div className="text-lg font-bold text-amber-400">
            {historicalSync.isLiveVerified && historicalSync.queuedFiles !== null
              ? historicalSync.queuedFiles.toLocaleString()
              : userBaseline.enabled
              ? `~${userBaseline.queuedFiles.toLocaleString()}`
              : "--"}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Pending transcodes</span>
        </div>

        {/* Recorded Sessions */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Recorded Sessions</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              Local DB
            </span>
          </div>
          <div className="text-lg font-bold text-purple-400">{sessions.length}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Benchmarked runs</span>
        </div>
      </div>

      {/* Main Chart: Historical Session Storage Breakdown */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>Session Storage Delta &amp; Processing Volume</span>
              {showSamplePreview && !hasRealSessions && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800">
                  SAMPLE PREVIEW
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Empirical measurements comparing original media vs transcoded output
            </p>
          </div>
          {chartData.length > 0 && (
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Original Size (GB)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Space Saved (GB)
              </span>
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v} GB`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e2e8f0"
                  }}
                />
                <Bar dataKey="origGB" name="Original Media (GB)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savedGB" name="Space Saved (GB)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-10 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-200">
                Awaiting Session Telemetry
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                TARDIS builds charts strictly from verified session records and live Tdarr database queries. Click <strong>Start Tracking Session</strong> on the Dashboard during your next transcode batch to plot real sector deltas.
              </p>
            </div>
            <button
              onClick={() => setShowSamplePreview(true)}
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Preview Chart Appearance (Sample Mock)</span>
            </button>
          </div>
        )}
      </div>

      {/* Informative Architecture Note */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-2">
        <div className="font-semibold text-slate-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Truthful Analytics Architecture</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          TARDIS does not fabricate or extrapolate statistics. Lifetime metrics are only populated when verified by Tdarr’s API. Batch trends are generated directly from local SQLite session logs containing verified before-and-after drive sectors and file byte counts.
        </p>
      </div>
    </div>
  );
};
