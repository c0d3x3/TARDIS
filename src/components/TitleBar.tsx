import React from "react";
import { HardDrive, RefreshCw, ShieldCheck, Minus, Square, X } from "lucide-react";

interface TitleBarProps {
  serverConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  serverConnected,
  onRefresh,
  isRefreshing
}) => {
  return (
    <div
      id="windows-titlebar"
      className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-slate-300 select-none text-xs"
    >
      {/* App Branding */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm text-[10px]">
          T
        </div>
        <span className="font-semibold text-slate-100 tracking-tight">
          TARDIS
        </span>
        <span className="hidden sm:inline text-slate-400">
          • Tdarr Analytics, Reports &amp; Duplicates System
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
          Windows 11 x64
        </span>
      </div>

      {/* Engine Status & Sync */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
          <span
            className={`w-2 h-2 rounded-full ${
              serverConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-[11px] text-slate-300">
            {serverConnected ? "Tdarr API Connected" : "Local Database Mode"}
          </span>
        </div>

        <button
          id="titlebar-refresh-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Tdarr & Database State"
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden md:inline text-[11px]">Sync</span>
        </button>

        {/* Windows Window Controls */}
        <div className="flex items-center ml-2 border-l border-slate-800 pl-2 gap-1 text-slate-400">
          <button
            id="win-btn-minimize"
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            id="win-btn-maximize"
            className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            id="win-btn-close"
            className="w-6 h-6 flex items-center justify-center hover:bg-red-600 hover:text-white rounded text-slate-400 transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
