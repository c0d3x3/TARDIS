import React, { useState } from "react";
import {
  Clock,
  Play,
  Square,
  HardDrive,
  Calendar,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Cpu
} from "lucide-react";
import { TardisDatabaseState, SessionRecord } from "../types";
import { formatBytes, formatPercent, formatDate, formatDuration } from "../utils";

interface HistoryTabProps {
  data: TardisDatabaseState;
  onStartSession: () => void;
  onStopSession: () => void;
  isSessionActive: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  data,
  onStartSession,
  onStopSession,
  isSessionActive
}) => {
  const { sessions, settings } = data;
  const [selectedDrive, setSelectedDrive] = useState<string>("ALL");
  const [activeSessionDetail, setActiveSessionDetail] = useState<SessionRecord | null>(null);

  const filteredSessions = sessions.filter((s) => {
    if (selectedDrive === "ALL") return true;
    return s.drive.startsWith(selectedDrive);
  });

  return (
    <div id="tab-history" className="space-y-6">
      {/* Header & Session Tracking Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>Session History &amp; Tracking</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic and manual baseline tracking of Tdarr transcode runs across storage drives
          </p>
        </div>

        {/* Start / End Tracking Button */}
        <div className="flex items-center gap-2">
          {isSessionActive ? (
            <button
              id="history-end-tracking-btn"
              onClick={onStopSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5" />
              <span>[ End Tracking ]</span>
            </button>
          ) : (
            <button
              id="history-start-tracking-btn"
              onClick={onStartSession}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>[ Start Tracking ]</span>
            </button>
          )}
        </div>
      </div>

      {/* Historical Daily Summary Table (Prompt Specification) */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Historical Processing Summary (Days &amp; Runs)
          </h2>
          <span className="text-xs text-slate-400 font-mono">SQLite Local Archive</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2">Date</th>
                <th className="pb-2">Files</th>
                <th className="pb-2">Original Media</th>
                <th className="pb-2">Resulting Size</th>
                <th className="pb-2">Space Saved</th>
                <th className="pb-2">Reduction %</th>
                <th className="pb-2">Drive</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 font-semibold text-slate-100">Sep 13 (Today)</td>
                <td className="py-2.5">1,842</td>
                <td className="py-2.5">5.82 TB</td>
                <td className="py-2.5">3.41 TB</td>
                <td className="py-2.5 text-emerald-400 font-bold">340.7 GB</td>
                <td className="py-2.5 text-emerald-300">41.4%</td>
                <td className="py-2.5 text-blue-300">D:\</td>
                <td className="py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Completed
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-100">Sep 12</td>
                <td className="py-2.5">1,104</td>
                <td className="py-2.5">3.88 TB</td>
                <td className="py-2.5">2.42 TB</td>
                <td className="py-2.5 text-emerald-400 font-bold">211.4 GB</td>
                <td className="py-2.5 text-emerald-300">38.9%</td>
                <td className="py-2.5 text-blue-300">D:\</td>
                <td className="py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Completed
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-100">Sep 11</td>
                <td className="py-2.5">1,376</td>
                <td className="py-2.5">4.92 TB</td>
                <td className="py-2.5">3.05 TB</td>
                <td className="py-2.5 text-emerald-400 font-bold">263.8 GB</td>
                <td className="py-2.5 text-emerald-300">42.2%</td>
                <td className="py-2.5 text-blue-300">D:\</td>
                <td className="py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Completed
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold text-slate-100">Sep 10</td>
                <td className="py-2.5">902</td>
                <td className="py-2.5">3.12 TB</td>
                <td className="py-2.5">1.94 TB</td>
                <td className="py-2.5 text-emerald-400 font-bold">184.2 GB</td>
                <td className="py-2.5 text-emerald-300">39.7%</td>
                <td className="py-2.5 text-blue-300">D:\</td>
                <td className="py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    Completed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Granular Individual Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Recorded Transcoding Sessions ({filteredSessions.length})
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter Drive:</span>
            <select
              value={selectedDrive}
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="bg-slate-900 text-slate-200 px-2 py-1 rounded border border-slate-800 font-mono text-xs focus:outline-none"
            >
              <option value="ALL">All Drives</option>
              <option value="D:">Drive D:\ (Primary)</option>
              <option value="E:">Drive E:\ (Secondary)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      session.status === "in_progress"
                        ? "bg-amber-400 animate-pulse"
                        : "bg-emerald-400"
                    }`}
                  />
                  <span className="font-semibold text-slate-100 text-xs font-mono">
                    {session.id}
                  </span>
                  <span className="text-slate-400 text-xs">
                    ({formatDate(session.startTime)})
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    Duration: {formatDuration(session.startTime, session.endTime)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                    {session.drive}
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block">Files Processed:</span>
                  <span className="text-slate-200 font-bold">{session.filesProcessed}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Successful / Skipped:</span>
                  <span className="text-slate-200">
                    {session.successful} / {session.skipped}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Original Size:</span>
                  <span className="text-slate-200">{formatBytes(session.originalBytes, 1)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Resulting Size:</span>
                  <span className="text-slate-200">{formatBytes(session.currentBytes, 1)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Storage Saved:</span>
                  <span className="text-emerald-400 font-bold">
                    {formatBytes(session.spaceSavedBytes, 1)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Reduction %:</span>
                  <span className="text-emerald-400 font-bold">
                    -{session.reductionPercent}%
                  </span>
                </div>
              </div>

              {/* Drive Before / After Box */}
              <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono flex flex-wrap justify-between gap-3 text-slate-400">
                <div>
                  <span className="text-slate-300 font-semibold">Drive Before: </span>
                  Used: {formatBytes(session.driveBefore.used, 2)} • Free: {formatBytes(session.driveBefore.free, 2)}
                </div>
                <div>
                  <span className="text-emerald-400 font-semibold">Drive After: </span>
                  Used: {formatBytes(session.driveCurrent.used, 2)} • Free: {formatBytes(session.driveCurrent.free, 2)}
                </div>
                <div>
                  Node: <span className="text-purple-300">{session.activeNode}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
