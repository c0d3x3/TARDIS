import React, { useState } from "react";
import {
  Copy,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FolderSync,
  Eye,
  Info,
  ShieldCheck,
  FileCheck,
  Search,
  Filter,
  X,
  ChevronRight
} from "lucide-react";
import { DuplicateItem, DuplicateConfidence, TardisDatabaseState } from "../types";
import { formatBytes } from "../utils";

interface DuplicatesTabProps {
  data: TardisDatabaseState;
  onDuplicateAction: (dupId: string, action: string) => Promise<void>;
  onTriggerScan: (libraryIds: string[], scanMode: string) => Promise<void>;
  isScanning: boolean;
  onLoadSampleDuplicates?: () => Promise<void>;
  onClearSampleDuplicates?: () => Promise<void>;
}

export const DuplicatesTab: React.FC<DuplicatesTabProps> = ({
  data,
  onDuplicateAction,
  onTriggerScan,
  isScanning,
  onLoadSampleDuplicates,
  onClearSampleDuplicates
}) => {
  const { duplicates, settings } = data;
  const [selectedConfidence, setSelectedConfidence] = useState<string>("ALL");
  const [activeCompareDup, setActiveCompareDup] = useState<DuplicateItem | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    dup: DuplicateItem;
    target: "a" | "b";
  } | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);

  const hasDemoItems = duplicates.some((d) => d.isDemo);

  const filteredDuplicates = duplicates.filter((d) => {
    if (selectedConfidence === "ALL") return true;
    return d.confidence === selectedConfidence;
  });

  const pendingCount = duplicates.filter((d) => d.status === "pending").length;
  const exactCount = duplicates.filter((d) => d.confidence === "EXACT").length;
  const probableCount = duplicates.filter((d) => d.confidence === "PROBABLE").length;
  const possibleCount = duplicates.filter((d) => d.confidence === "POSSIBLE").length;

  const handleConfirmDelete = async () => {
    if (!confirmModal) return;
    setActionProcessing(true);
    try {
      await onDuplicateAction(confirmModal.dup.id, confirmModal.target === "a" ? "delete_a" : "delete_b");
      setConfirmModal(null);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleKeepBoth = async (dupId: string) => {
    setActionProcessing(true);
    try {
      await onDuplicateAction(dupId, "keep_both");
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div id="tab-duplicates" className="space-y-6">
      {/* Header & Scan Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Copy className="w-5 h-5 text-amber-400" />
            <span>Duplicate Media Detection</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Safe non-destructive multi-level scanner for redundant rips, transcoded duplicates &amp; editions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasDemoItems ? (
            <button
              onClick={() => onClearSampleDuplicates?.()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all"
            >
              Clear Sample Candidates
            </button>
          ) : (
            <button
              onClick={() => onLoadSampleDuplicates?.()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition-all"
            >
              Load Sample Candidates (Preview UI)
            </button>
          )}

          <button
            id="duplicates-scan-btn"
            onClick={() => onTriggerScan(["all"], "all_levels")}
            disabled={isScanning}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <Search className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning Libraries..." : "Scan Selected Libraries"}</span>
          </button>
        </div>
      </div>

      {hasDemoItems && (
        <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/60 text-xs text-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>[SAMPLE PREVIEW MODE]</strong> The items below are synthetic sample pairs to preview side-by-side codec &amp; resolution comparison. No physical files exist at these sample paths.
            </span>
          </div>
          <button
            onClick={() => onClearSampleDuplicates?.()}
            className="text-[11px] underline text-purple-300 hover:text-purple-100 font-mono"
          >
            Clear Samples
          </button>
        </div>
      )}

      {/* Safety Notice Banner */}
      <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-xs text-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Safety Mandate: </strong>
            Automatic deletion is strictly forbidden. Files are only removed with explicit manual confirmation.
            Removal mode is set to:{" "}
            <span className="font-mono underline font-semibold">
              {settings.safeDeleteMode === "recycle_bin" ? "Windows Recycle Bin" : "Permanent Deletion"}
            </span>.
          </span>
        </div>
      </div>

      {/* Confidence Level Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setSelectedConfidence("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedConfidence === "ALL"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Candidates ({duplicates.length})
          </button>

          <button
            onClick={() => setSelectedConfidence("EXACT")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              selectedConfidence === "EXACT"
                ? "bg-rose-950/80 text-rose-200 border border-rose-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>Level 1: Exact Duplicates ({exactCount})</span>
          </button>

          <button
            onClick={() => setSelectedConfidence("PROBABLE")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              selectedConfidence === "PROBABLE"
                ? "bg-amber-950/80 text-amber-200 border border-amber-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Level 2: Probable ({probableCount})</span>
          </button>

          <button
            onClick={() => setSelectedConfidence("POSSIBLE")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              selectedConfidence === "POSSIBLE"
                ? "bg-blue-950/80 text-blue-200 border border-blue-800"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Level 3: Possible Editions ({possibleCount})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono pr-2">
          {pendingCount} requiring user review
        </div>
      </div>

      {/* Duplicate Candidates List / Review Interface */}
      <div className="space-y-4">
        {filteredDuplicates.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="font-semibold text-slate-200">No duplicates found in this category</div>
            <div className="text-xs text-slate-400 mt-1">
              Your media libraries are clean or have all been resolved.
            </div>
          </div>
        ) : (
          filteredDuplicates.map((dup) => {
            const isResolved = dup.status !== "pending";
            return (
              <div
                key={dup.id}
                className={`rounded-xl border transition-all ${
                  isResolved
                    ? "bg-slate-900/40 border-slate-800/60 opacity-70"
                    : "bg-slate-900/95 border-slate-800 hover:border-slate-700 shadow-sm"
                }`}
              >
                {/* Card Header matching prompt specification */}
                <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">Potential Duplicate</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          dup.confidence === "EXACT"
                            ? "bg-rose-950 text-rose-300 border-rose-800"
                            : dup.confidence === "PROBABLE"
                            ? "bg-amber-950 text-amber-300 border-amber-800"
                            : "bg-blue-950 text-blue-300 border-blue-800"
                        }`}
                      >
                        {dup.confidence} DUPLICATE
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      {dup.title}
                    </div>
                  </div>

                  <div className="text-xs text-slate-400 font-mono">
                    {dup.reason}
                  </div>
                </div>

                {/* Side-by-Side Comparison (File A vs File B) */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File A Box */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/90 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-blue-400 font-bold border-b border-slate-800/80 pb-1">
                      <span>File A</span>
                      {dup.fileA.tag && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/50 text-blue-300 font-normal">
                          {dup.fileA.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 break-all text-[11px] select-all">
                      {dup.fileA.path}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 text-[11px]">
                      <div>
                        Size: <span className="text-slate-100 font-semibold">{formatBytes(dup.fileA.sizeBytes, 2)}</span>
                      </div>
                      <div>
                        Resolution: <span className="text-slate-100">{dup.fileA.resolution}</span>
                      </div>
                      <div>
                        Codec: <span className="text-slate-100">{dup.fileA.codec}</span>
                      </div>
                      <div>
                        Duration: <span className="text-slate-100">{dup.fileA.duration || "--"}</span>
                      </div>
                      {dup.fileA.hash && (
                        <div className="col-span-2 truncate text-[10px] text-slate-400">
                          Hash: {dup.fileA.hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* File B Box */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/90 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800/80 pb-1">
                      <span>File B</span>
                      {dup.fileB.tag && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/50 text-emerald-300 font-normal">
                          {dup.fileB.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 break-all text-[11px] select-all">
                      {dup.fileB.path}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1 text-[11px]">
                      <div>
                        Size: <span className="text-slate-100 font-semibold">{formatBytes(dup.fileB.sizeBytes, 2)}</span>
                      </div>
                      <div>
                        Resolution: <span className="text-slate-100">{dup.fileB.resolution}</span>
                      </div>
                      <div>
                        Codec: <span className="text-slate-100">{dup.fileB.codec}</span>
                      </div>
                      <div>
                        Duration: <span className="text-slate-100">{dup.fileB.duration || "--"}</span>
                      </div>
                      {dup.fileB.hash && (
                        <div className="col-span-2 truncate text-[10px] text-slate-400">
                          Hash: {dup.fileB.hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer with explicit user confirmation buttons */}
                <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  {isResolved ? (
                    <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{dup.resolutionNote || "Resolved by user action"}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <button
                          id={`keep-both-${dup.id}`}
                          onClick={() => handleKeepBoth(dup.id)}
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                        >
                          [ Keep Both ]
                        </button>
                        <button
                          id={`delete-a-${dup.id}`}
                          onClick={() => setConfirmModal({ dup, target: "a" })}
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold transition-colors border border-rose-800"
                        >
                          [ Delete A ]
                        </button>
                        <button
                          id={`delete-b-${dup.id}`}
                          onClick={() => setConfirmModal({ dup, target: "b" })}
                          disabled={actionProcessing}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold transition-colors border border-rose-800"
                        >
                          [ Delete B ]
                        </button>
                      </div>

                      <button
                        id={`compare-details-${dup.id}`}
                        onClick={() => setActiveCompareDup(dup)}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                      >
                        <span>[ Compare Details ]</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for File Deletion */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Confirm File Removal</span>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are about to remove{" "}
              <strong>File {confirmModal.target.toUpperCase()}</strong> for:
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 break-all">
              {confirmModal.target === "a"
                ? confirmModal.dup.fileA.path
                : confirmModal.dup.fileB.path}
            </div>

            <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800 text-[11px] text-blue-300">
              Target action:{" "}
              <strong>
                {settings.safeDeleteMode === "recycle_bin"
                  ? "Move to Windows Recycle Bin (Recoverable)"
                  : "Permanent File System Unlink"}
              </strong>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-execute-btn"
                onClick={handleConfirmDelete}
                disabled={actionProcessing}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                {actionProcessing ? "Processing..." : "Confirm & Execute Removal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Details Modal */}
      {activeCompareDup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <FileCheck className="w-5 h-5 text-blue-400" />
                <span>Deep Media Comparison: {activeCompareDup.title}</span>
              </div>
              <button
                onClick={() => setActiveCompareDup(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-blue-400">File A Details</div>
                <div className="text-[11px] text-slate-300 break-all">{activeCompareDup.fileA.path}</div>
                <div className="space-y-1 text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                  <div>Size: {formatBytes(activeCompareDup.fileA.sizeBytes, 3)}</div>
                  <div>Resolution: {activeCompareDup.fileA.resolution}</div>
                  <div>Codec: {activeCompareDup.fileA.codec}</div>
                  <div>Audio: {activeCompareDup.fileA.audio || "Dolby Digital 5.1"}</div>
                  <div>Duration: {activeCompareDup.fileA.duration}</div>
                  {activeCompareDup.fileA.hash && (
                    <div className="truncate">Hash: {activeCompareDup.fileA.hash}</div>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400">File B Details</div>
                <div className="text-[11px] text-slate-300 break-all">{activeCompareDup.fileB.path}</div>
                <div className="space-y-1 text-slate-400 text-[11px] pt-2 border-t border-slate-800">
                  <div>Size: {formatBytes(activeCompareDup.fileB.sizeBytes, 3)}</div>
                  <div>Resolution: {activeCompareDup.fileB.resolution}</div>
                  <div>Codec: {activeCompareDup.fileB.codec}</div>
                  <div>Audio: {activeCompareDup.fileB.audio || "AAC 5.1"}</div>
                  <div>Duration: {activeCompareDup.fileB.duration}</div>
                  {activeCompareDup.fileB.hash && (
                    <div className="truncate">Hash: {activeCompareDup.fileB.hash}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-slate-100">Algorithmic Assessment: </span>
              {activeCompareDup.reason}. Recommend keeping File B if transcoded HEVC provides equivalent quality with substantial storage savings.
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCompareDup(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
