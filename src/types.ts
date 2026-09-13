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

export type DataOrigin = "live_verified" | "user_baseline" | "unavailable" | "demo_sample";

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
  isDemo?: boolean;
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

export interface UserBaselineStats {
  enabled: boolean;
  totalProcessedFiles: number;
  queuedFiles: number;
  notes: string;
  lastUpdated: string;
}

export interface HistoricalSyncStats {
  lastSyncTime: string | null;
  status: "never_synced" | "synchronized" | "failed" | "unreachable";
  isLiveVerified: boolean;
  totalProcessedFiles: number | null;
  successFiles: number | null;
  notRequiredFiles: number | null;
  failedFiles: number | null;
  queuedFiles: number | null;
  totalOriginalSizeBytes: number | null;
  totalResultingSizeBytes: number | null;
  totalSpaceSavedBytes: number | null;
  percentageReduction: number | null;
  nodes: TdarrNode[];
  errorMessage?: string;
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

export interface ConnectionStatusInfo {
  connected: boolean;
  lastChecked: string | null;
  tdarrVersion?: string;
  serverAddress: string;
  message: string;
  statusCode?: number;
}

export interface TardisDatabaseState {
  settings: TardisSettings;
  userBaseline: UserBaselineStats;
  historicalSync: HistoricalSyncStats;
  connectionStatus: ConnectionStatusInfo;
  sessions: SessionRecord[];
  duplicates: DuplicateItem[];
  discordLogs: DiscordLog[];
}
