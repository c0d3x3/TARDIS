import React, { useState } from "react";
import {
  Clock,
  Play,
  Square,
  HardDrive,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Layers,
  ChevronRight
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
  const { sessions, userBaseline, historicalSync, settings } = data;
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
            Empirical baseline tracking of Tdarr transcode runs across storage drives
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

          <a
            href="/api/reports/csv"
            download="TARDIS_Session_Report.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* User-Provided Baseline Reference Card */}
      {userBaseline.enabled && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-800/40 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>User-Provided Baseline Statistics</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
              Unverified Baseline
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Prior Processed Files:</span>
              <span className="text-slate-100 font-bold text-sm">~{userBaseline.totalProcessedFiles.toLocaleString()}</span>
              <span className="text-slate-500 text-[10px] block">Transcode Success / Not Required</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Prior Queue Count:</span>
              <span className="text-amber-300 font-bold text-sm">~{userBaseline.queuedFiles.toLocaleString()}</span>
              <span className="text-slate-500 text-[10px] block">Reported in transcode queue</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Baseline Status:</span>
              <span className="text-slate-300 text-xs font-sans block mt-1">
                {historicalSync.isLiveVerified
                  ? "Live sync established; historical records verified."
                  : "Awaiting live Tdarr sync connection."}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {userBaseline.notes}
          </p>
        </div>
      )}

      {/* Real Sessions Table */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Benchmarked Transcoding Sessions
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredSessions.length} recorded in SQLite)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Filter Drive:</span>
            <select
              value={selectedDrive}
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="bg-slate-950 text-slate-200 border border-slate-700 rounded px-2 py-1 font-mono text-xs focus:outline-none"
            >
              <option value="ALL">All Drives</option>
              <option value="D:">Drive D:\</option>
              <option value="E:">Drive E:\</option>
            </select>
          </div>
        </div>

        {filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2">Session ID</th>
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Drive</th>
                  <th className="pb-2">Start Free</th>
                  <th className="pb-2">End Free</th>
                  <th className="pb-2">Drive Space Change</th>
                  <th className="pb-2">Files Processed</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-100">{s.id}</td>
                    <td className="py-2.5 text-slate-300">{formatDate(s.startTime)}</td>
                    <td className="py-2.5 text-slate-400">{formatDuration(s.startTime, s.endTime)}</td>
                    <td className="py-2.5 text-blue-300 font-bold">{s.drive}</td>
                    <td className="py-2.5">{formatBytes(s.driveStartFreeBytes, 1)}</td>
                    <td className="py-2.5">{formatBytes(s.driveEndFreeBytes, 1)}</td>
                    <td className="py-2.5 text-emerald-400 font-bold">
                      {s.driveSpaceChangeBytes !== null ? formatBytes(s.driveSpaceChangeBytes, 2) : "Not available yet"}
                    </td>
                    <td className="py-2.5 text-slate-200">
                      {s.filesProcessed !== null ? s.filesProcessed : "File count unavailable"}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] border ${
                          s.status === "in_progress"
                            ? "bg-amber-950 text-amber-300 border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border-emerald-800"
                        }`}
                      >
                        {s.status === "in_progress" ? "Active" : "Completed"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => setActiveSessionDetail(s)}
                        className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-200">No Sessions Recorded Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              TARDIS does not insert fabricated historical dates. When you start a transcode batch in Tdarr, click <strong>[ Start Tracking ]</strong> to measure drive storage before and after the run.
            </p>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {activeSessionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-slate-400 text-[11px] block">Session Inspection</span>
                <span className="font-bold text-slate-100 text-sm">{activeSessionDetail.id}</span>
              </div>
              <button
                onClick={() => setActiveSessionDetail(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Drive:</span>
                <span className="text-blue-300 font-bold">{activeSessionDetail.drive}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Start Time:</span>
                <span className="text-slate-200">{formatDate(activeSessionDetail.startTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">End Time:</span>
                <span className="text-slate-200">{formatDate(activeSessionDetail.endTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Files Processed:</span>
                <span className="text-slate-200 font-semibold">
                  {activeSessionDetail.filesProcessed !== null ? activeSessionDetail.filesProcessed : "File count unavailable"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[11px] font-bold mb-1">Drive Baseline (Before):</div>
                  <div>Used: {formatBytes(activeSessionDetail.driveBefore?.used ?? null, 2)}</div>
                  <div>Free: {formatBytes(activeSessionDetail.driveBefore?.free ?? activeSessionDetail.driveStartFreeBytes, 2)}</div>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 text-[11px] font-bold mb-1">Drive Measurement (Ending):</div>
                  <div>Used: {formatBytes(activeSessionDetail.driveCurrent?.used ?? null, 2)}</div>
                  <div>Free: {formatBytes(activeSessionDetail.driveCurrent?.free ?? activeSessionDetail.driveEndFreeBytes, 2)}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                <div className="font-bold">Drive Space Change:</div>
                <div className="text-base font-bold">
                  {activeSessionDetail.driveSpaceChangeBytes !== null
                    ? formatBytes(activeSessionDetail.driveSpaceChangeBytes, 2)
                    : "Not available yet"}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">
                  Calculated directly as ending free space - starting free space
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveSessionDetail(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
