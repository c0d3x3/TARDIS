import React, { useState } from "react";
import {
  BarChart3,
  TrendingDown,
  HardDrive,
  Film,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
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
  Legend,
  AreaChart,
  Area
} from "recharts";
import { TardisDatabaseState } from "../types";
import { formatBytes, formatPercent } from "../utils";

interface AnalyticsTabProps {
  data: TardisDatabaseState;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ data }) => {
  const { historicalSync, sessions, settings } = data;
  const [timeframe, setTimeframe] = useState<"session" | "day" | "week" | "month">("day");
  const [viewFilter, setViewFilter] = useState<"all" | "drive_d" | "drive_e" | "node_rtx">("all");

  // Chart data for daily historical trend
  const dailyHistoricalData = [
    { date: "Sep 07", files: 720, savedGB: 142.4, origGB: 340.0, finalGB: 197.6 },
    { date: "Sep 08", files: 810, savedGB: 168.1, origGB: 390.0, finalGB: 221.9 },
    { date: "Sep 09", files: 902, savedGB: 184.2, origGB: 440.0, finalGB: 255.8 },
    { date: "Sep 10", files: 1376, savedGB: 263.8, origGB: 630.0, finalGB: 366.2 },
    { date: "Sep 11", files: 1104, savedGB: 211.4, origGB: 510.0, finalGB: 298.6 },
    { date: "Sep 12", files: 1842, savedGB: 340.7, origGB: 820.0, finalGB: 479.3 },
    { date: "Sep 13 (Today)", files: 1812, savedGB: 264.9, origGB: 640.0, finalGB: 375.1 }
  ];

  // Codec conversion matrix data
  const codecStats = [
    { from: "H.264 (AVC)", to: "H.265 (HEVC)", count: 1420, avgSavings: "46.2%", color: "#3b82f6" },
    { from: "VC-1", to: "H.265 (HEVC)", count: 184, avgSavings: "58.4%", color: "#8b5cf6" },
    { from: "MPEG-2", to: "H.265 (HEVC)", count: 110, avgSavings: "64.1%", color: "#ec4899" },
    { from: "HEVC (Remux)", to: "HEVC (10-bit CQ21)", count: 98, avgSavings: "34.7%", color: "#10b981" }
  ];

  // Resolution breakdown
  const resolutionStats = [
    { res: "4K UHD (2160p)", files: 342, origSize: "3.4 TB", finalSize: "1.9 TB", saved: "1.5 TB", pct: "44.1%" },
    { res: "1080p Full HD", files: 1190, origSize: "2.4 TB", finalSize: "1.5 TB", saved: "900 GB", pct: "37.5%" },
    { res: "720p HD", files: 210, origSize: "480 GB", finalSize: "270 GB", saved: "210 GB", pct: "43.8%" },
    { res: "480p / 576p SD", files: 70, origSize: "118 GB", finalSize: "79 GB", saved: "39 GB", pct: "33.1%" }
  ];

  const avgReduction = historicalSync.percentageReduction;
  const avgOrigSize = historicalSync.totalOriginalSizeBytes / (historicalSync.totalProcessedFiles || 1);
  const avgResultSize = historicalSync.totalResultingSizeBytes / (historicalSync.totalProcessedFiles || 1);

  return (
    <div id="tab-analytics" className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Storage &amp; Transcoding Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            File-level savings, drive before/after comparisons, codec migration, and historical trends
          </p>
        </div>

        {/* View and Timeframe selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
            <span className="text-slate-400 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>View:</span>
            </span>
            {(["session", "day", "week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeframe(mode)}
                className={`px-2.5 py-1 rounded capitalize transition-colors font-medium ${
                  timeframe === mode
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Total Saved</span>
          <span className="text-lg font-bold text-emerald-400">
            {formatBytes(historicalSync.totalSpaceSavedBytes, 2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across all libraries</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Avg Reduction</span>
          <span className="text-lg font-bold text-blue-400">
            {formatPercent(avgReduction)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Per transcoded file</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Avg Original Size</span>
          <span className="text-lg font-bold text-slate-200">
            {formatBytes(avgOrigSize, 2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Before conversion</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Avg Output Size</span>
          <span className="text-lg font-bold text-slate-200">
            {formatBytes(avgResultSize, 2)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">After conversion</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Largest Saving</span>
          <span className="text-lg font-bold text-purple-400">42.8 GB</span>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate" title="Avatar (2009) Remux to HEVC">
            Avatar (2009) Remux
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Success Rate</span>
          <span className="text-lg font-bold text-emerald-400">
            {formatPercent(
              (historicalSync.successFiles /
                (historicalSync.totalProcessedFiles + historicalSync.failedFiles || 1)) *
                100
            )}
          </span>
          <span className="text-[10px] text-rose-400 block mt-0.5">
            {historicalSync.failedFiles} failed jobs
          </span>
        </div>
      </div>

      {/* Main Chart: Historical Storage Savings Breakdown */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Storage Savings &amp; Processing Volume ({timeframe.toUpperCase()})
            </h2>
            <p className="text-xs text-slate-400">
              Cumulative gigabytes saved and media files processed per historical interval
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Space Saved (GB)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Original Size (GB)
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyHistoricalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
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
      </div>

      {/* Two columns: Codec Conversion Stats & Resolution Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Codec Migration */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Codec Conversion Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">1,812 files</span>
          </div>

          <div className="space-y-3 pt-1">
            {codecStats.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{item.from}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-semibold text-emerald-400">{item.to}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">
                    {item.avgSavings} avg saved
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{item.count} files processed</span>
                  <span>{Math.round((item.count / 1812) * 100)}% of library</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resolution Statistics */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Resolution Breakdown</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Storage Tiering</span>
          </div>

          <div className="space-y-2.5 pt-1">
            {resolutionStats.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200">{item.res}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {item.files} files • {item.origSize} → {item.finalSize}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-emerald-400 font-bold">{item.saved} saved</div>
                  <div className="text-[11px] text-slate-400">(-{item.pct})</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
