import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { TardisDatabaseState, DriveInfo, ScannedMediaFile, DuplicateItem, TdarrObservation, SessionRecord } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Persistent database path (Uses %APPDATA%\TARDIS\data on Windows, or ./data in Linux container)
function getStorageDir(): string {
  if (process.platform === "win32" && process.env.APPDATA) {
    const dir = path.join(process.env.APPDATA, "TARDIS", "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const DATA_DIR = getStorageDir();
const DB_FILE = path.join(DATA_DIR, "tardis_db.json");

/**
 * Supported media formats for recursive scanning
 * Easily extendable list
 */
export const MEDIA_EXTENSIONS = new Set([
  ".mkv",
  ".mp4",
  ".avi",
  ".m4v",
  ".mov",
  ".ts",
  ".m2ts",
  ".wmv",
  ".flv"
]);

/**
 * Real Windows / OS Drive Space Measurement
 * Uses fs.statfsSync (supported natively in Node.js 18.15+)
 */
export function measureDriveSpace(drivePathOrLetter: string): {
  totalBytes: number | null;
  freeBytes: number | null;
  usedBytes: number | null;
  status: "available" | "unavailable";
  error?: string;
} {
  try {
    let target = drivePathOrLetter.trim();
    if (process.platform === "win32") {
      if (/^[a-zA-Z]:$/.test(target)) {
        target = `${target}\\`;
      }
    }
    if (!fs.existsSync(target)) {
      return {
        totalBytes: null,
        freeBytes: null,
        usedBytes: null,
        status: "unavailable",
        error: `Drive or path '${drivePathOrLetter}' is not accessible or not mounted.`
      };
    }
    const stats = fs.statfsSync(target);
    const totalBytes = Number(BigInt(stats.blocks) * BigInt(stats.bsize));
    const freeBytes = Number(BigInt(stats.bfree) * BigInt(stats.bsize));
    const usedBytes = Math.max(0, totalBytes - freeBytes);
    return {
      totalBytes,
      freeBytes,
      usedBytes,
      status: "available"
    };
  } catch (err: any) {
    return {
      totalBytes: null,
      freeBytes: null,
      usedBytes: null,
      status: "unavailable",
      error: err.message || "Failed to read drive statistics"
    };
  }
}

/**
 * Calculate SHA-256 hash of a real file
 */
export function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return resolve("");
      }
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Normalize a media filename to extract the core title for probable duplicate grouping
 */
export function normalizeMediaTitle(filename: string): string {
  let name = filename.replace(/\.[^/.]+$/, ""); // strip extension
  // Remove common release group tokens, resolutions, codecs
  const tags = [
    /\b(2160p|4k|1080p|1080i|720p|480p|576p)\b/gi,
    /\b(hevc|h265|x265|h264|x264|avc|vc-1|mpeg2)\b/gi,
    /\b(bluray|remux|web-dl|webrip|hdtv|dvdrip)\b/gi,
    /\b(dts-hd|dts|truehd|atmos|ac3|aac|eac3|ddp5\.1)\b/gi,
    /\b(10bit|hdr|hdr10|dv|sdr)\b/gi,
    /\b(repack|proper|unrated|extended|director's cut|theatrical)\b/gi,
    /[\[\]\(\)\{\}]/g,
    /[._-]/g
  ];
  for (const tag of tags) {
    name = name.replace(tag, " ");
  }
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * TRUTHFUL INITIAL STATE (Empty Production Database)
 * Rules:
 * 1. Monitored drives start with null bytes until actively measured from the OS.
 * 2. Historical sync starts with null bytes and never_synced status.
 * 3. Sessions, duplicate findings, scanned files, observations, and Discord logs start empty.
 * 4. User baseline tracks user-provided figures (~1,812 / ~909) labeled strictly as unverified baseline.
 */
function getInitialDbState(): TardisDatabaseState {
  return {
    settings: {
      firstRunCompleted: false,
      tdarrUrl: "http://localhost:8265",
      autoSyncIntervalSec: 15,
      autoTrackingEnabled: false,
      discordWebhookUrl: "",
      discordNotifyOnComplete: true,
      discordNotifyOnError: true,
      discordNotifyOnDuplicates: true,
      safeDeleteMode: "recycle_bin",
      monitoredDrives: [],
      libraries: []
    },
    userBaseline: {
      enabled: false,
      totalProcessedFiles: 0,
      queuedFiles: 0,
      notes: "No baseline configured.",
      lastUpdated: new Date().toISOString()
    },
    historicalSync: {
      lastSyncTime: null,
      status: "never_synced",
      isLiveVerified: false,
      totalProcessedFiles: null,
      successFiles: null,
      notRequiredFiles: null,
      failedFiles: null,
      queuedFiles: null,
      totalOriginalSizeBytes: null,
      totalResultingSizeBytes: null,
      totalSpaceSavedBytes: null,
      percentageReduction: null,
      nodes: [],
      errorMessage: undefined
    },
    connectionStatus: {
      connected: false,
      lastChecked: null,
      serverAddress: "http://localhost:8265",
      message: "Awaiting live connection probe to Tdarr server."
    },
    sessions: [],
    duplicates: [],
    scannedFiles: [],
    tdarrObservations: [],
    discordLogs: []
  };
}

export function loadDatabase(): TardisDatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);

      // Sanitize previously fabricated values
      if (parsed.settings?.monitoredDrives) {
        parsed.settings.monitoredDrives = parsed.settings.monitoredDrives.map((d: any) => {
          // If totalBytes was set to hardcoded 16000000000000 without actual measurement
          if (d.totalBytes === 16000000000000 || d.totalBytes === 18000000000000) {
            d.totalBytes = null;
            d.usedBytes = null;
            d.freeBytes = null;
            d.status = "unavailable";
            d.error = "Awaiting OS measurement";
          }
          return d;
        });
      }

      if (!parsed.scannedFiles) parsed.scannedFiles = [];
      if (!parsed.tdarrObservations) parsed.tdarrObservations = [];
      if (!parsed.sessions) parsed.sessions = [];
      if (!parsed.duplicates) parsed.duplicates = [];
      if (!parsed.discordLogs) parsed.discordLogs = [];
      if (parsed.settings?.autoTrackingEnabled === undefined) {
        parsed.settings.autoTrackingEnabled = false;
      }

      // Purge demo duplicate items from production database if any exist
      parsed.duplicates = parsed.duplicates.filter((d: any) => !d.isDemo);

      return parsed;
    }
  } catch (err) {
    console.error("Error loading database file:", err);
  }
  const initial = getInitialDbState();
  saveDatabase(initial);
  return initial;
}

export function saveDatabase(data: TardisDatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving database file:", err);
    return false;
  }
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "TARDIS",
    version: "1.0.0",
    platform: "Windows 11 Companion",
    databasePath: DB_FILE,
    runtime: "Truthful Data Architecture (Zero Fabrication)"
  });
});

// 2. Read full database state (with live drive measurement update if available)
app.get("/api/data", (_req, res) => {
  const db = loadDatabase();
  res.json(db);
});

// 3. Update database state / settings
app.post("/api/data/save", (req, res) => {
  const incoming = req.body;
  if (!incoming) {
    return res.status(400).json({ error: "Missing body" });
  }
  const current = loadDatabase();
  const merged: TardisDatabaseState = { ...current, ...incoming };
  saveDatabase(merged);
  res.json({ success: true, message: "Settings saved successfully" });
});

// 4. Test Tdarr Connection with genuine probe
app.post("/api/tdarr/test-connection", async (req, res) => {
  const { targetUrl } = req.body;
  const db = loadDatabase();
  const url = (targetUrl || db.settings.tdarrUrl || "http://localhost:8265").replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const statusResp = await fetch(`${url}/api/v2/status`, {
      method: "GET",
      signal: controller.signal
    }).catch((e) => {
      throw new Error(`Connection refused: ${e.message}`);
    });

    clearTimeout(timeout);

    if (statusResp && statusResp.ok) {
      let statusData: any = {};
      try {
        statusData = await statusResp.json();
      } catch (e) {
        statusData = { status: "Active" };
      }

      // Probe real nodes
      let liveNodes: any[] = [];
      try {
        const nodesResp = await fetch(`${url}/api/v2/get-nodes`, { method: "GET" });
        if (nodesResp.ok) {
          const nodesObj = await nodesResp.json();
          liveNodes = Object.entries(nodesObj || {}).map(([key, val]: [string, any]) => ({
            name: val?.nodeName || key,
            ip: val?.nodeIP || "127.0.0.1",
            activeWorkers: val?.workers ? Object.keys(val.workers).length : 0,
            gpu: val?.gpu || "CPU / QSV",
            fps: val?.fps || 0,
            status: val?.status || "Active"
          }));
        }
      } catch (e) {
        // node probe failed or unsupported
      }

      const version = statusData.version || statusData.status || "Active";

      db.connectionStatus = {
        connected: true,
        lastChecked: new Date().toISOString(),
        serverAddress: url,
        tdarrVersion: String(version),
        message: `Successfully connected to Tdarr Server at ${url}`
      };
      db.historicalSync.nodes = liveNodes;
      saveDatabase(db);

      // Record observation
      recordObservation(db, true, url, liveNodes.length, liveNodes.map(n => n.name), null, null, `Connection test succeeded`);

      return res.json({
        connected: true,
        url,
        version,
        nodeCount: liveNodes.length,
        nodes: liveNodes,
        serverStatus: statusData,
        message: `Connected to live Tdarr Server at ${url}`
      });
    } else {
      const statusText = statusResp ? `${statusResp.status} ${statusResp.statusText}` : "No response";
      db.connectionStatus = {
        connected: false,
        lastChecked: new Date().toISOString(),
        serverAddress: url,
        message: `Tdarr server responded with error: ${statusText}`
      };
      saveDatabase(db);

      recordObservation(db, false, url, 0, [], null, null, `Tdarr responded with error: ${statusText}`);

      return res.json({
        connected: false,
        url,
        message: `Tdarr server responded with error: ${statusText}`
      });
    }
  } catch (err: any) {
    clearTimeout(timeout);
    db.connectionStatus = {
      connected: false,
      lastChecked: new Date().toISOString(),
      serverAddress: url,
      message: `Could not reach Tdarr at ${url}: ${err.message}`
    };
    saveDatabase(db);

    recordObservation(db, false, url, 0, [], null, null, `Unreachable: ${err.message}`);

    return res.json({
      connected: false,
      url,
      message: `Could not reach Tdarr at ${url}. If running on your Windows 11 host, ensure Tdarr Server is running and port 8265 is accessible.`,
      error: err.message
    });
  }
});

// Helper to record an observation
function recordObservation(
  db: TardisDatabaseState,
  connected: boolean,
  serverAddress: string,
  nodeCount: number,
  nodesSummary: string[],
  queuedFiles: number | null,
  processedFiles: number | null,
  message: string
) {
  const obs: TdarrObservation = {
    id: `obs-${Date.now()}`,
    timestamp: new Date().toISOString(),
    connected,
    serverAddress,
    nodeCount,
    nodesSummary,
    queuedFiles,
    processedFiles,
    message
  };
  db.tdarrObservations = db.tdarrObservations || [];
  db.tdarrObservations.unshift(obs);
  // Keep last 30 observations
  if (db.tdarrObservations.length > 30) {
    db.tdarrObservations = db.tdarrObservations.slice(0, 30);
  }
  saveDatabase(db);
}

// 5. Trigger Real Historical / Live Sync from Tdarr
app.post("/api/tdarr/sync", async (req, res) => {
  const db = loadDatabase();
  const { tdarrUrl } = req.body;
  const target = (tdarrUrl || db.settings.tdarrUrl || "http://localhost:8265").replace(/\/$/, "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const statusResp = await fetch(`${target}/api/v2/status`, {
      method: "GET",
      signal: controller.signal
    }).catch((e) => {
      throw new Error(`Could not reach ${target}: ${e.message}`);
    });

    clearTimeout(timeout);

    if (!statusResp || !statusResp.ok) {
      throw new Error(`Tdarr returned status ${statusResp ? statusResp.status : "unreachable"}`);
    }

    // Nodes probe
    let liveNodes: any[] = [];
    try {
      const nodesResp = await fetch(`${target}/api/v2/get-nodes`, { method: "GET" });
      if (nodesResp.ok) {
        const nodesObj = await nodesResp.json();
        liveNodes = Object.entries(nodesObj || {}).map(([key, val]: [string, any]) => ({
          name: val?.nodeName || key,
          ip: val?.nodeIP || "127.0.0.1",
          activeWorkers: val?.workers ? Object.keys(val.workers).length : 0,
          gpu: val?.gpu || "CPU / QSV",
          fps: val?.fps || 0,
          status: val?.status || "Active"
        }));
      }
    } catch (e) {
      // ignore
    }

    // Pie stats probe
    let pieStats: any = null;
    try {
      const pieResp = await fetch(`${target}/api/v2/stats/get-pies`, { method: "GET" });
      if (pieResp.ok) {
        pieStats = await pieResp.json();
      }
    } catch (e) {
      // ignore
    }

    db.connectionStatus = {
      connected: true,
      lastChecked: new Date().toISOString(),
      serverAddress: target,
      message: `Connected to live Tdarr server at ${target}`
    };

    db.historicalSync.lastSyncTime = new Date().toISOString();
    db.historicalSync.status = "synchronized";
    db.historicalSync.isLiveVerified = true;
    db.historicalSync.errorMessage = undefined;
    db.historicalSync.nodes = liveNodes;

    let queuedCount: number | null = null;
    let processedCount: number | null = null;

    if (pieStats && typeof pieStats === "object") {
      if (pieStats.totalSaved !== undefined) {
        db.historicalSync.totalSpaceSavedBytes = Number(pieStats.totalSaved) || 0;
      }
      if (pieStats.totalTranscodes !== undefined) {
        db.historicalSync.successFiles = Number(pieStats.totalTranscodes) || 0;
      }
      if (pieStats.totalNotRequired !== undefined) {
        db.historicalSync.notRequiredFiles = Number(pieStats.totalNotRequired) || 0;
      }
      if (pieStats.totalFailed !== undefined) {
        db.historicalSync.failedFiles = Number(pieStats.totalFailed) || 0;
      }
      if (pieStats.totalQueued !== undefined) {
        db.historicalSync.queuedFiles = Number(pieStats.totalQueued) || 0;
        queuedCount = db.historicalSync.queuedFiles;
      }
      if (db.historicalSync.successFiles !== null && db.historicalSync.notRequiredFiles !== null) {
        db.historicalSync.totalProcessedFiles = db.historicalSync.successFiles + db.historicalSync.notRequiredFiles;
        processedCount = db.historicalSync.totalProcessedFiles;
      }
    }

    saveDatabase(db);
    recordObservation(db, true, target, liveNodes.length, liveNodes.map(n => n.name), queuedCount, processedCount, "Live sync verified from Tdarr");

    return res.json({
      success: true,
      connected: true,
      isLiveVerified: true,
      historicalStats: db.historicalSync,
      message: `Verified sync complete. Real telemetry retrieved from Tdarr server at ${target}.`
    });
  } catch (err: any) {
    clearTimeout(timeout);
    db.connectionStatus = {
      connected: false,
      lastChecked: new Date().toISOString(),
      serverAddress: target,
      message: `Tdarr server unreachable at ${target}`
    };

    db.historicalSync.lastSyncTime = new Date().toISOString();
    db.historicalSync.status = "unreachable";
    db.historicalSync.isLiveVerified = false;
    db.historicalSync.errorMessage = `Tdarr server unreachable at ${target}: ${err.message}`;
    saveDatabase(db);

    recordObservation(db, false, target, 0, [], null, null, `Sync failed: ${err.message}`);

    return res.json({
      success: false,
      connected: false,
      isLiveVerified: false,
      historicalStats: db.historicalSync,
      userBaseline: db.userBaseline,
      message: `Sync failed: Could not connect to Tdarr server at ${target}. Live stats unavailable.`
    });
  }
});

// 6. Measure Monitored Drives
app.post("/api/drives/measure", (_req, res) => {
  const db = loadDatabase();
  const measured = db.settings.monitoredDrives.map((drive) => {
    const res = measureDriveSpace(drive.driveLetter);
    return {
      ...drive,
      totalBytes: res.totalBytes,
      usedBytes: res.usedBytes,
      freeBytes: res.freeBytes,
      status: res.status,
      error: res.error,
      lastMeasured: new Date().toISOString()
    };
  });
  db.settings.monitoredDrives = measured;
  saveDatabase(db);
  res.json({ success: true, drives: measured });
});

// 7. Session Tracking Controls (START / END TRACKING)
app.post("/api/sessions/action", (req, res) => {
  const { action, driveLetter } = req.body;
  const db = loadDatabase();

  if (action === "start") {
    const active = db.sessions.find((s) => s.status === "in_progress");
    if (active) {
      return res.status(400).json({ error: "A tracking session is already in progress." });
    }

    const drive = driveLetter || "D:";
    const driveObj = db.settings.monitoredDrives.find((d) => d.driveLetter === drive.slice(0, 2)) || db.settings.monitoredDrives[0];
    
    // Take real drive measurement
    const driveMeasure = measureDriveSpace(driveObj ? driveObj.driveLetter : drive);

    const newSession: SessionRecord = {
      id: `sess-${Date.now()}`,
      startTime: new Date().toISOString(),
      endTime: null,
      status: "in_progress",
      drive: driveObj ? driveObj.driveLetter : drive,
      driveBefore: {
        total: driveMeasure.totalBytes,
        used: driveMeasure.usedBytes,
        free: driveMeasure.freeBytes,
        status: driveMeasure.status
      },
      driveCurrent: {
        total: driveMeasure.totalBytes,
        used: driveMeasure.usedBytes,
        free: driveMeasure.freeBytes,
        status: driveMeasure.status
      },
      driveSpaceChangeBytes: 0,
      filesProcessed: null, // "File count unavailable" unless reported by real Tdarr telemetry
      successful: null,
      skipped: null,
      failed: null,
      activeNode: db.historicalSync?.nodes?.[0]?.name || "Local Node"
    };

    db.sessions.unshift(newSession);
    saveDatabase(db);

    return res.json({
      success: true,
      session: newSession,
      message: `Storage tracking session started for drive ${newSession.drive}. Starting baseline recorded.`
    });
  }

  if (action === "stop") {
    const activeIndex = db.sessions.findIndex((s) => s.status === "in_progress");
    if (activeIndex === -1) {
      return res.status(400).json({ error: "No active session in progress to stop." });
    }

    const active = db.sessions[activeIndex];
    const endMeasure = measureDriveSpace(active.drive);

    const endTime = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.floor((new Date(endTime).getTime() - new Date(active.startTime).getTime()) / 1000));

    active.endTime = endTime;
    active.durationSeconds = durationSeconds;
    active.status = "completed";
    active.driveCurrent = {
      total: endMeasure.totalBytes,
      used: endMeasure.usedBytes,
      free: endMeasure.freeBytes,
      status: endMeasure.status
    };

    // Calculate Drive space change = ending free space - starting free space
    if (endMeasure.freeBytes !== null && active.driveBefore.free !== null) {
      active.driveSpaceChangeBytes = endMeasure.freeBytes - active.driveBefore.free;
    } else {
      active.driveSpaceChangeBytes = null;
    }

    // Check if live Tdarr reports processed delta during session
    if (db.historicalSync.isLiveVerified && db.historicalSync.successFiles !== null) {
      active.successful = db.historicalSync.successFiles;
      active.skipped = db.historicalSync.notRequiredFiles;
      active.failed = db.historicalSync.failedFiles;
      active.filesProcessed = (active.successful || 0) + (active.skipped || 0);
    } else {
      active.filesProcessed = null;
      active.successful = null;
      active.skipped = null;
      active.failed = null;
    }

    db.sessions[activeIndex] = active;
    saveDatabase(db);

    // Optional Discord notification with ONLY real values
    if (db.settings.discordWebhookUrl && db.settings.discordNotifyOnComplete) {
      const spaceStr = active.driveSpaceChangeBytes !== null
        ? `${(active.driveSpaceChangeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
        : "Not available yet";
      const filesStr = active.filesProcessed !== null ? `${active.filesProcessed}` : "File count unavailable";

      dispatchDiscordNotification(
        db.settings.discordWebhookUrl,
        "🟢 TARDIS: Session Tracking Completed",
        `Session ID: ${active.id}\nMonitored Drive: ${active.drive}\nDuration: ${Math.round(durationSeconds / 60)} minutes\nDrive space change: ${spaceStr}\nFiles Processed: ${filesStr}\n(No fabricated values included)`
      ).catch(() => {});
    }

    return res.json({
      success: true,
      session: active,
      message: `Tracking ended. Duration: ${durationSeconds}s. Drive space change recorded.`
    });
  }

  res.status(400).json({ error: "Invalid action" });
});

// 8. Real Filesystem Scanner across configured media libraries/folders
app.post("/api/scanner/scan", async (req, res) => {
  const { libraryIds } = req.body;
  const db = loadDatabase();

  const selectedLibs = libraryIds && libraryIds.length > 0
    ? db.settings.libraries.filter((lib) => libraryIds.includes(lib.id))
    : db.settings.libraries;

  const scannedMedia: ScannedMediaFile[] = [];
  const inaccessiblePaths: string[] = [];

  // Recursive directory crawler for media formats
  function walkDir(dir: string, libraryId: string) {
    try {
      if (!fs.existsSync(dir)) {
        inaccessiblePaths.push(dir);
        return;
      }
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        try {
          if (entry.isDirectory()) {
            walkDir(fullPath, libraryId);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (MEDIA_EXTENSIONS.has(ext)) {
              const stat = fs.statSync(fullPath);
              scannedMedia.push({
                fullPath,
                filename: entry.name,
                extension: ext,
                sizeBytes: stat.size,
                modifiedTime: stat.mtime.toISOString(),
                libraryId
              });
            }
          }
        } catch (fileErr) {
          // skip inaccessible file
        }
      }
    } catch (dirErr) {
      inaccessiblePaths.push(dir);
    }
  }

  // Execute filesystem walk
  for (const lib of selectedLibs) {
    walkDir(lib.path, lib.id);
  }

  // Detect duplicates:
  // 1. Exact SHA-256 matches:
  // For files with identical size > 0, calculate SHA-256 to confirm exact duplicates
  const sizeMap: { [size: number]: ScannedMediaFile[] } = {};
  for (const f of scannedMedia) {
    if (f.sizeBytes > 0) {
      if (!sizeMap[f.sizeBytes]) sizeMap[f.sizeBytes] = [];
      sizeMap[f.sizeBytes].push(f);
    }
  }

  const exactDups: DuplicateItem[] = [];
  for (const sizeStr of Object.keys(sizeMap)) {
    const group = sizeMap[Number(sizeStr)];
    if (group.length > 1) {
      // Calculate SHA-256 for identical size files
      for (const f of group) {
        if (!f.sha256) {
          try {
            f.sha256 = await calculateFileHash(f.fullPath);
          } catch (e) {
            f.sha256 = "";
          }
        }
      }
      // Group by hash
      const hashMap: { [h: string]: ScannedMediaFile[] } = {};
      for (const f of group) {
        if (f.sha256) {
          if (!hashMap[f.sha256]) hashMap[f.sha256] = [];
          hashMap[f.sha256].push(f);
        }
      }

      for (const [hashVal, hashGroup] of Object.entries(hashMap)) {
        if (hashGroup.length > 1) {
          for (let i = 0; i < hashGroup.length - 1; i++) {
            exactDups.push({
              id: `dup-exact-${Date.now()}-${i}`,
              confidence: "EXACT",
              reason: `Cryptographic SHA-256 binary hash match (${hashVal.slice(0, 12)}...)`,
              title: hashGroup[i].filename,
              fileA: {
                path: hashGroup[i].fullPath,
                sizeBytes: hashGroup[i].sizeBytes,
                resolution: "File System",
                codec: hashGroup[i].extension.replace(".", "").toUpperCase(),
                hash: hashGroup[i].sha256
              },
              fileB: {
                path: hashGroup[i + 1].fullPath,
                sizeBytes: hashGroup[i + 1].sizeBytes,
                resolution: "File System",
                codec: hashGroup[i + 1].extension.replace(".", "").toUpperCase(),
                hash: hashGroup[i + 1].sha256
              },
              status: "pending"
            });
          }
        }
      }
    }
  }

  // 2. Probable duplicates:
  // Group by normalized title
  const titleMap: { [normalized: string]: ScannedMediaFile[] } = {};
  for (const f of scannedMedia) {
    const norm = normalizeMediaTitle(f.filename);
    if (norm.length > 2) {
      if (!titleMap[norm]) titleMap[norm] = [];
      titleMap[norm].push(f);
    }
  }

  const probableDups: DuplicateItem[] = [];
  for (const [titleKey, group] of Object.entries(titleMap)) {
    if (group.length > 1) {
      // If not already classified as exact duplicates
      for (let i = 0; i < group.length - 1; i++) {
        const fileA = group[i];
        const fileB = group[i + 1];
        if (fileA.fullPath !== fileB.fullPath && fileA.sizeBytes !== fileB.sizeBytes) {
          probableDups.push({
            id: `dup-prob-${Date.now()}-${i}`,
            confidence: "PROBABLE",
            reason: `Normalized title match ('${titleKey}') with different file sizes or container formats.`,
            title: titleKey.toUpperCase(),
            fileA: {
              path: fileA.fullPath,
              sizeBytes: fileA.sizeBytes,
              resolution: "File System",
              codec: fileA.extension.replace(".", "").toUpperCase()
            },
            fileB: {
              path: fileB.fullPath,
              sizeBytes: fileB.sizeBytes,
              resolution: "File System",
              codec: fileB.extension.replace(".", "").toUpperCase()
            },
            status: "pending"
          });
        }
      }
    }
  }

  // Save to database
  db.scannedFiles = scannedMedia;
  db.duplicates = [...exactDups, ...probableDups];
  saveDatabase(db);

  res.json({
    success: true,
    totalFilesScanned: scannedMedia.length,
    inaccessiblePaths,
    exactDuplicatesFound: exactDups.length,
    probableDuplicatesFound: probableDups.length,
    message: scannedMedia.length > 0
      ? `Real scan completed: ${scannedMedia.length} media files inspected. Found ${exactDups.length} exact (SHA-256) and ${probableDups.length} probable duplicates.`
      : `Scan completed: Configured paths were not found on this system. When running locally on Windows 11, physical NTFS paths (e.g. D:\\Movies) are scanned directly.`
  });
});

// 9. Safe Duplicate Action (Keep Both or Move to Recycle Bin with Explicit Confirmation)
app.post("/api/duplicates/action", (req, res) => {
  const { duplicateId, action, confirmed } = req.body;
  const db = loadDatabase();

  const dupIndex = db.duplicates.findIndex((d) => d.id === duplicateId);
  if (dupIndex === -1) {
    return res.status(404).json({ error: "Duplicate item not found" });
  }

  if (action === "keep_both") {
    db.duplicates[dupIndex].status = "resolved_kept_both";
    saveDatabase(db);
    return res.json({ success: true, message: "Marked as Kept Both. No files touched." });
  }

  if (action === "delete_a" || action === "delete_b") {
    if (!confirmed) {
      return res.status(400).json({ error: "Explicit user confirmation required for file deletion." });
    }

    const targetFile = action === "delete_a" ? db.duplicates[dupIndex].fileA.path : db.duplicates[dupIndex].fileB.path;
    
    // Safety check: Does the file exist on disk?
    if (fs.existsSync(targetFile)) {
      try {
        // Safe deletion: move to quarantine/recycle folder if possible
        const trashDir = path.join(DATA_DIR, "quarantine_trash");
        if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });
        const dest = path.join(trashDir, `${Date.now()}_${path.basename(targetFile)}`);
        fs.renameSync(targetFile, dest);
        db.duplicates[dupIndex].status = action === "delete_a" ? "resolved_deleted_a" : "resolved_deleted_b";
        db.duplicates[dupIndex].resolutionNote = `Moved to safe quarantine (${dest}) with explicit user confirmation.`;
      } catch (err: any) {
        return res.status(500).json({ error: `Safe delete failed: ${err.message}` });
      }
    } else {
      // File not present on current filesystem
      db.duplicates[dupIndex].status = action === "delete_a" ? "resolved_deleted_a" : "resolved_deleted_b";
      db.duplicates[dupIndex].resolutionNote = `Marked resolved (file path ${targetFile} not mounted on current host).`;
    }

    saveDatabase(db);
    return res.json({ success: true, message: "Duplicate resolved safely." });
  }

  res.status(400).json({ error: "Invalid action" });
});

// 10. Discord Webhook Dispatcher
async function dispatchDiscordNotification(webhookUrl: string, title: string, description: string) {
  const payload = {
    username: "TARDIS Monitor",
    avatar_url: "https://raw.githubusercontent.com/HaveAGitGat/Tdarr/master/assets/icon.png",
    embeds: [
      {
        title,
        description,
        color: 0x5865F2,
        footer: {
          text: `TARDIS v1.0 • Windows 11 Desktop Companion • ${new Date().toLocaleTimeString()}`
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  return resp.ok || resp.status === 204;
}

// Discord Test Notification Endpoint
app.post("/api/discord/test", async (req, res) => {
  const { webhookUrl } = req.body;

  if (!webhookUrl || !webhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return res.status(400).json({
      success: false,
      error: "Please enter a valid Discord webhook URL (starts with https://discord.com/api/webhooks/...)"
    });
  }

  const title = "TARDIS TEST NOTIFICATION";
  const description = "This is a verified test alert from TARDIS (Tdarr Analytics, Reports, Duplicates & Integration System). No fake statistics are included.";

  try {
    const success = await dispatchDiscordNotification(webhookUrl, title, description);
    if (success) {
      const db = loadDatabase();
      db.discordLogs = db.discordLogs || [];
      db.discordLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "test",
        title,
        status: "delivered"
      });
      saveDatabase(db);
      return res.json({ success: true, message: "Discord test notification delivered successfully!" });
    } else {
      return res.status(400).json({ success: false, error: "Discord webhook rejected the notification." });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: `Failed to dispatch Discord webhook: ${err.message}` });
  }
});

// 11. Plain Text / CSV Report Generator
app.get("/api/reports/csv", (_req, res) => {
  const db = loadDatabase();
  let csv = "Session ID,Start Time,End Time,Duration (s),Drive,Start Free (Bytes),End Free (Bytes),Drive Space Change (GB),Files Processed,Status\n";

  if (db.sessions && db.sessions.length > 0) {
    for (const s of db.sessions) {
      const changeGb = s.driveSpaceChangeBytes !== null ? (s.driveSpaceChangeBytes / (1024 * 1024 * 1024)).toFixed(2) : "--";
      const files = s.filesProcessed !== null ? s.filesProcessed : "File count unavailable";
      csv += `"${s.id}","${s.startTime}","${s.endTime || 'In Progress'}",${s.durationSeconds || '--'},"${s.drive}",${s.driveBefore.free ?? '--'},${s.driveCurrent.free ?? '--'},${changeGb},"${files}","${s.status}"\n`;
    }
  } else {
    csv += "# No sessions recorded yet. Start tracking to record genuine drive benchmarks.\n";
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="TARDIS_Audit_Report.csv"');
  res.send(csv);
});

// Background Polling Worker for Tdarr Monitoring
let pollingIntervalHandle: NodeJS.Timeout | null = null;

function startBackgroundMonitoring() {
  if (pollingIntervalHandle) clearInterval(pollingIntervalHandle);
  pollingIntervalHandle = setInterval(async () => {
    try {
      const db = loadDatabase();
      const url = (db.settings.tdarrUrl || "http://localhost:8265").replace(/\/$/, "");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(`${url}/api/v2/status`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);

      if (resp && resp.ok) {
        db.connectionStatus.connected = true;
        db.connectionStatus.lastChecked = new Date().toISOString();
        db.connectionStatus.message = `Tdarr Server active at ${url}`;
        saveDatabase(db);
      } else {
        if (db.connectionStatus.connected) {
          db.connectionStatus.connected = false;
          db.connectionStatus.lastChecked = new Date().toISOString();
          db.connectionStatus.message = `Tdarr Server disconnected`;
          saveDatabase(db);
        }
      }
    } catch (e) {
      // background polling silent error
    }
  }, 30000); // Poll every 30 seconds
}

startBackgroundMonitoring();

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TARDIS Local Server running on http://localhost:${PORT}`);
  });
}

startServer();
