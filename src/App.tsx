import React, { useState, useEffect } from "react";
import { ViewTab, TardisDatabaseState } from "./types";
import { TitleBar } from "./components/TitleBar";
import { NavigationSidebar } from "./components/NavigationSidebar";
import { DashboardTab } from "./components/DashboardTab";
import { TdarrTab } from "./components/TdarrTab";
import { AnalyticsTab } from "./components/AnalyticsTab";
import { DuplicatesTab } from "./components/DuplicatesTab";
import { HistoryTab } from "./components/HistoryTab";
import { ReportsTab } from "./components/ReportsTab";
import { DiscordTab } from "./components/DiscordTab";
import { SettingsTab } from "./components/SettingsTab";

export default function App() {
  const [currentTab, setCurrentTab] = useState<ViewTab>("dashboard");
  const [data, setData] = useState<TardisDatabaseState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load database state from backend
  const loadState = async () => {
    try {
      const resp = await fetch("/api/data");
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load TARDIS state:", err);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadState();
    setIsRefreshing(false);
    showToast("Refreshed local metrics & state");
  };

  const handleHistoricalSync = async () => {
    setIsSyncing(true);
    try {
      const resp = await fetch("/api/tdarr/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const res = await resp.json();
      await loadState();
      showToast(res.message || "Historical sync completed");
    } catch (err: any) {
      showToast(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartSession = async () => {
    try {
      const resp = await fetch("/api/sessions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", driveLetter: "D:\\" })
      });
      const res = await resp.json();
      await loadState();
      showToast("Recorded baseline. Tdarr session tracking active.");
    } catch (err: any) {
      showToast(`Error starting session: ${err.message}`);
    }
  };

  const handleStopSession = async () => {
    try {
      const resp = await fetch("/api/sessions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" })
      });
      const res = await resp.json();
      await loadState();
      showToast("Session tracking ended. Storage report generated.");
    } catch (err: any) {
      showToast(`Error ending session: ${err.message}`);
    }
  };

  const handleDuplicateAction = async (dupId: string, action: string) => {
    try {
      const resp = await fetch("/api/duplicates/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateId: dupId, action })
      });
      const res = await resp.json();
      await loadState();
      showToast(res.message || "Duplicate action recorded");
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`);
    }
  };

  const handleTriggerScan = async (libraryIds: string[], scanMode: string) => {
    setIsScanning(true);
    try {
      const resp = await fetch("/api/duplicates/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryIds, scanMode })
      });
      const res = await resp.json();
      await loadState();
      showToast(`Duplicate scan complete. Scanned across all library drives.`);
    } catch (err: any) {
      showToast(`Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const current = data?.settings || {};
      const updated = { ...current, ...newSettings };
      await fetch("/api/data/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updated })
      });
      await loadState();
      showToast("Settings updated successfully");
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  if (!data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-300 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Starting TARDIS Local Engine...</span>
        </div>
      </div>
    );
  }

  const isSessionActive = data.sessions.some((s) => s.status === "in_progress");
  const pendingDuplicates = data.duplicates.filter((d) => d.status === "pending").length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      {/* Windows 11 Title Bar */}
      <TitleBar
        serverConnected={true}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main App Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <NavigationSidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          queueCount={data.historicalSync.queuedFiles}
          duplicatePendingCount={pendingDuplicates}
          monitoredDrives={data.settings.monitoredDrives}
        />

        {/* Content Pane */}
        <main
          id="main-content-pane"
          className="flex-1 overflow-y-auto p-6 bg-slate-950/60"
        >
          {currentTab === "dashboard" && (
            <DashboardTab
              data={data}
              onNavigate={(tab) => setCurrentTab(tab)}
              onStartSession={handleStartSession}
              onStopSession={handleStopSession}
              isSessionActive={isSessionActive}
              onSync={handleHistoricalSync}
            />
          )}

          {currentTab === "tdarr" && (
            <TdarrTab
              data={data}
              onSync={handleHistoricalSync}
              isSyncing={isSyncing}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {currentTab === "analytics" && <AnalyticsTab data={data} />}

          {currentTab === "duplicates" && (
            <DuplicatesTab
              data={data}
              onDuplicateAction={handleDuplicateAction}
              onTriggerScan={handleTriggerScan}
              isScanning={isScanning}
            />
          )}

          {currentTab === "history" && (
            <HistoryTab
              data={data}
              onStartSession={handleStartSession}
              onStopSession={handleStopSession}
              isSessionActive={isSessionActive}
            />
          )}

          {currentTab === "reports" && <ReportsTab data={data} />}

          {currentTab === "discord" && (
            <DiscordTab data={data} onUpdateSettings={handleUpdateSettings} />
          )}

          {currentTab === "settings" && (
            <SettingsTab data={data} onUpdateSettings={handleUpdateSettings} />
          )}
        </main>
      </div>

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-lg border border-blue-400 flex items-center gap-2 animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
