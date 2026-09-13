import React from "react";
import {
  LayoutDashboard,
  Server,
  BarChart3,
  Copy,
  Clock,
  FileText,
  Bell,
  Settings,
  HardDrive
} from "lucide-react";
import { ViewTab } from "../types";
import { formatBytes } from "../utils";

interface NavigationSidebarProps {
  currentTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  queueCount: number | null;
  duplicatePendingCount: number;
  monitoredDrives: Array<{ driveLetter: string; usedBytes: number | null; totalBytes: number | null; status?: string }>;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  currentTab,
  onSelectTab,
  queueCount,
  duplicatePendingCount,
  monitoredDrives
}) => {
  const navItems: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tdarr", label: "Tdarr", icon: Server, badge: queueCount && queueCount > 0 ? `${queueCount} Q` : undefined, badgeColor: "bg-blue-900/60 text-blue-300 border-blue-700" },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "duplicates", label: "Duplicates", icon: Copy, badge: duplicatePendingCount > 0 ? duplicatePendingCount : undefined, badgeColor: "bg-amber-900/60 text-amber-300 border-amber-700" },
    { id: "history", label: "History", icon: Clock },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "discord", label: "Discord", icon: Bell },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <aside
      id="tardis-sidebar"
      className="w-56 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none"
    >
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] border font-mono ${
                      isActive ? "bg-white/20 text-white border-white/30" : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Drives quick summary widget at bottom of sidebar */}
      <div className="p-3 m-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
        <div className="flex items-center justify-between text-slate-300 font-medium mb-1.5">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span>Drives</span>
          </div>
          <span className="text-[10px] text-slate-400">Windows</span>
        </div>
        <div className="space-y-2">
          {monitoredDrives.map((d) => {
            const hasData = d.totalBytes !== null && d.usedBytes !== null && d.totalBytes > 0;
            const pct = hasData ? Math.round(((d.usedBytes as number) / (d.totalBytes as number)) * 100) : null;
            return (
              <div key={d.driveLetter} className="space-y-0.5">
                <div className="flex justify-between text-[11px] text-slate-300">
                  <span className="font-mono font-semibold">{d.driveLetter}\</span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {hasData ? `${formatBytes(d.usedBytes, 1)} / ${formatBytes(d.totalBytes, 1)}` : "Not measured"}
                  </span>
                </div>
                {hasData ? (
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (pct || 0) > 85 ? "bg-amber-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                ) : (
                  <div className="text-[9px] text-slate-400 font-mono">Awaiting OS measurement</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
