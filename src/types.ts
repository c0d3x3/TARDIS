export type ViewTab =
  | "dashboard"
  | "tdarr"
  | "analytics"
  | "duplicates"
  | "history"
  | "reports"
  | "discord"
  | "settings";

export type DuplicateConfidence = "EXACT" | "PROBABLE" | "POSSIBLE";

export interface FileMetadata {
  path: string;
  sizeBytes: number;
  resolution: string;
  codec: string;
  audio?: string;
  duration?: string;
  hash?: string;
  tag?: string;
}

export interface DuplicateItem {
  id: string;
  confidence: DuplicateConfidence;
  reason: string;
  title: string;
  fileA: FileMetadata;
  fileB: FileMetadata;
  status: "pending" | "resolved_kept_both" | "resolved_deleted_a" | "resolved_deleted_b";
  resolutionNote?: string;
}

export interface DriveInfo {
  driveLetter: string;
  label: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}

export interface LibraryInfo {
  id: string;
  name: string;
  path: string;
  drive: string;
}

export interface TdarrNode {
  name: string;
  ip: string;
  activeWorkers: number;
  gpu: string;
  fps: number;
  status: string;
}

export interface HistoricalSyncStats {
  lastSyncTime: string;
  status: string;
  totalProcessedFiles: number;
  successFiles: number;
  notRequiredFiles: number;
  failedFiles: number;
  queuedFiles: number;
  totalOriginalSizeBytes: number;
  totalResultingSizeBytes: number;
  totalSpaceSavedBytes: number;
  percentageReduction: number;
  nodes: TdarrNode[];
}

export interface DriveUsageSnapshot {
  total: number;
  used: number;
  free: number;
}

export interface SessionRecord {
  id: string;
  startTime: string;
  endTime: string | null;
  status: "in_progress" | "completed";
  drive: string;
  driveBefore: DriveUsageSnapshot;
  driveCurrent: DriveUsageSnapshot;
  filesProcessed: number;
  successful: number;
  skipped: number;
  failed: number;
  originalBytes: number;
  currentBytes: number;
  spaceSavedBytes: number;
  reductionPercent: number;
  activeNode: string;
}

export interface DiscordLog {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  status: string;
  filesProcessed?: number;
  spaceSavedStr?: string;
  reductionStr?: string;
  duration?: string;
}

export interface TardisSettings {
  tdarrUrl: string;
  autoSyncIntervalSec: number;
  discordWebhookUrl: string;
  discordNotifyOnComplete: boolean;
  discordNotifyOnError: boolean;
  discordNotifyOnDuplicates: boolean;
  safeDeleteMode: "recycle_bin" | "permanent";
  monitoredDrives: DriveInfo[];
  libraries: LibraryInfo[];
}

export interface TardisDatabaseState {
  settings: TardisSettings;
  historicalSync: HistoricalSyncStats;
  sessions: SessionRecord[];
  duplicates: DuplicateItem[];
  discordLogs: DiscordLog[];
}
