import React, { useState } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Info
} from "lucide-react";
import { TardisDatabaseState } from "../types";
import { formatBytes, formatPercent, formatDate } from "../utils";

interface ReportsTabProps {
  data: TardisDatabaseState;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ data }) => {
  const { settings, historicalSync, userBaseline, sessions, duplicates, connectionStatus } = data;
  const [copied, setCopied] = useState(false);

  // Generate plain text report
  const generateTextReport = () => {
    let report = `========================================================================\n`;
    report += `TARDIS: Tdarr Analytics, Reports, Duplicates & Integration System\n`;
    report += `COMPREHENSIVE AUDIT & STORAGE REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Target Platform: Windows 11 64-bit • Local SQLite Engine\n`;
    report += `Data Origin: ${historicalSync.isLiveVerified ? "Tdarr Live API (Verified)" : "User-Provided Baseline / Awaiting Sync"}\n`;
    report += `========================================================================\n\n`;

    report += `1. HISTORICAL TDARR TRANSCODE PERFORMANCE\n`;
    report += `------------------------------------------------------------------------\n`;
    if (historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null) {
      report += `Total Files Processed (Live):         ${historicalSync.totalProcessedFiles.toLocaleString()}\n`;
      report += `Transcoded Successfully:             ${historicalSync.successFiles ?? "--"}\n`;
      report += `Not Required / Skipped:               ${historicalSync.notRequiredFiles ?? "--"}\n`;
      report += `Failed Jobs:                          ${historicalSync.failedFiles ?? "--"}\n`;
      report += `Current Transcode Queue:              ${historicalSync.queuedFiles ?? "--"} pending\n\n`;
      report += `Total Original Media Size:            ${formatBytes(historicalSync.totalOriginalSizeBytes, 2)}\n`;
      report += `Total Resulting Media Size:           ${formatBytes(historicalSync.totalResultingSizeBytes, 2)}\n`;
      report += `Total Storage Saved:                  ${formatBytes(historicalSync.totalSpaceSavedBytes, 2)}\n`;
      report += `Average Space Reduction:              ${formatPercent(historicalSync.percentageReduction)}\n\n`;
    } else {
      report += `Status: Awaiting Live Tdarr API Sync\n`;
      if (userBaseline.enabled) {
        report += `User Baseline Processed Files:        ~${userBaseline.totalProcessedFiles.toLocaleString()} (Unverified)\n`;
        report += `User Baseline Queued Files:           ~${userBaseline.queuedFiles.toLocaleString()} (Unverified)\n`;
        report += `Baseline Notes:                       ${userBaseline.notes}\n`;
      }
      report += `Lifetime Space Saved:                 -- (Requires live Tdarr sync)\n\n`;
    }

    report += `2. MONITORED STORAGE DRIVES\n`;
    report += `------------------------------------------------------------------------\n`;
    settings.monitoredDrives.forEach((d) => {
      const usedPct = Math.round((d.usedBytes / d.totalBytes) * 100);
      report += `Drive ${d.driveLetter}\\ (${d.label}):\n`;
      report += `  Capacity: ${formatBytes(d.totalBytes, 1)} | Used: ${formatBytes(d.usedBytes, 2)} (${usedPct}%) | Free: ${formatBytes(d.freeBytes, 2)}\n`;
    });
    report += `\n`;

    report += `3. MEDIA LIBRARIES\n`;
    report += `------------------------------------------------------------------------\n`;
    settings.libraries.forEach((lib) => {
      report += `- [${lib.drive}] ${lib.name} -> ${lib.path}\n`;
    });
    report += `\n`;

    report += `4. DUPLICATE MEDIA AUDIT SUMMARY\n`;
    report += `------------------------------------------------------------------------\n`;
    const exact = duplicates.filter((d) => d.confidence === "EXACT").length;
    const probable = duplicates.filter((d) => d.confidence === "PROBABLE").length;
    const possible = duplicates.filter((d) => d.confidence === "POSSIBLE").length;
    report += `Exact Binary Duplicates (Level 1):    ${exact}\n`;
    report += `Probable Duplicates (Level 2):        ${probable}\n`;
    report += `Possible Edition Duplicates (Level 3): ${possible}\n`;
    report += `Safety: Manual confirmation required for any file deletion.\n\n`;

    report += `5. BENCHMARKED SESSIONS (${sessions.length} RECORDED)\n`;
    report += `------------------------------------------------------------------------\n`;
    if (sessions.length > 0) {
      sessions.forEach((s) => {
        report += `Session: ${s.id}\n`;
        report += `  Start: ${formatDate(s.startTime)} | End: ${formatDate(s.endTime)}\n`;
        report += `  Drive: ${s.drive} | Files: ${s.filesProcessed} (Success: ${s.successful}, Skip: ${s.skipped}, Fail: ${s.failed})\n`;
        report += `  Original: ${formatBytes(s.originalBytes, 1)} -> Result: ${formatBytes(s.currentBytes, 1)}\n`;
        report += `  Saved: ${formatBytes(s.spaceSavedBytes, 1)} (-${s.reductionPercent}%)\n`;
        report += `  Drive Before: Used ${formatBytes(s.driveBefore.used, 2)}, Free ${formatBytes(s.driveBefore.free, 2)}\n`;
        report += `  Drive After:  Used ${formatBytes(s.driveCurrent.used, 2)}, Free ${formatBytes(s.driveCurrent.free, 2)}\n\n`;
      });
    } else {
      report += `No active sessions logged in local SQLite archive yet.\n\n`;
    }

    report += `========================================================================\n`;
    report += `End of TARDIS Report\n`;
    return report;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="tab-reports" className="space-y-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Audit Reports &amp; Export</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs for libraries, storage consumption, session reduction, and duplicate findings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="reports-copy-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied Report" : "Copy Text Report"}</span>
          </button>

          <a
            id="reports-download-csv-btn"
            href="/api/reports/csv"
            download="TARDIS_Audit_Report.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Export</span>
          </a>
        </div>
      </div>

      {/* On-Screen Structured Report View */}
      <div className="p-6 rounded-xl bg-slate-900/95 border border-slate-800 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 font-mono tracking-tight">
              TARDIS MASTER AUDIT REPORT
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              Generated: {new Date().toLocaleDateString()}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            System: Windows 11 Desktop Companion • {connectionStatus.connected ? "Tdarr Connected" : "Local Baseline Mode"}
          </div>
        </div>

        {/* Section 1: Transcode Performance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
              1. Transcoding Metrics &amp; Storage Efficiency
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {historicalSync.isLiveVerified ? "Live Verified" : "User Baseline"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Files Processed:</span>
              <span className="text-slate-100 font-bold text-sm">
                {historicalSync.isLiveVerified && historicalSync.totalProcessedFiles !== null
                  ? historicalSync.totalProcessedFiles.toLocaleString()
                  : userBaseline.enabled
                  ? `~${userBaseline.totalProcessedFiles.toLocaleString()} (Baseline)`
                  : "--"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Original Volume:</span>
              <span className="text-slate-100 font-bold text-sm">
                {formatBytes(historicalSync.totalOriginalSizeBytes, 2)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Current Volume:</span>
              <span className="text-slate-100 font-bold text-sm">
                {formatBytes(historicalSync.totalResultingSizeBytes, 2)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Net Space Saved:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {historicalSync.isLiveVerified && historicalSync.totalSpaceSavedBytes !== null
                  ? `${formatBytes(historicalSync.totalSpaceSavedBytes, 2)} (-${historicalSync.percentageReduction}%)`
                  : "--"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Drives Status */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-400 font-mono">
            2. Hard Drive Utilization
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            {settings.monitoredDrives.map((d) => (
              <div key={d.driveLetter} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>Drive {d.driveLetter}\ ({d.label})</span>
                  <span>{Math.round((d.usedBytes / d.totalBytes) * 100)}% Used</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Used: {formatBytes(d.usedBytes, 2)}</span>
                  <span className="text-emerald-400 font-semibold">Free: {formatBytes(d.freeBytes, 2)}</span>
                  <span>Total: {formatBytes(d.totalBytes, 1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Duplicate Media Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
            3. Duplicate Candidates Summary
          </h3>
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Exact Hash Matches (Level 1):</span>
              <span className="text-rose-400 font-bold">
                {duplicates.filter((d) => d.confidence === "EXACT").length} candidates
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Probable Matches (Level 2):</span>
              <span className="text-amber-400 font-bold">
                {duplicates.filter((d) => d.confidence === "PROBABLE").length} candidates
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Possible Edition Variants (Level 3):</span>
              <span className="text-blue-400 font-bold">
                {duplicates.filter((d) => d.confidence === "POSSIBLE").length} candidates
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Raw Text Preview Box */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Formatted Text Export Preview
          </h3>
          <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-all">
            {generateTextReport()}
          </pre>
        </div>
      </div>
    </div>
  );
};
