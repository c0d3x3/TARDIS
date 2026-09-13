# TARDIS (Tdarr Analytics, Reports, Duplicates & Integration System)

A standalone **Windows 11 64-bit** desktop companion application for the open-source video transcoder **Tdarr**.

TARDIS operates locally, securely, and completely offline-first. It connects as an independent, read-only observer to your Tdarr installation without modifying Tdarr's databases or disrupting active transcode queues.

---

## Truthful Data Architecture & Integrity Principles

TARDIS enforces a strict **anti-fabrication** data standard:

1. **No Invented or Estimated Data:** TARDIS will never generate artificial numbers or project synthetic statistics into the database. If live telemetry has not been synchronized from Tdarr, the application displays clear, transparent **"Awaiting Live Sync"** indicators rather than misleading zeroes or fabricated placeholders.
2. **User-Provided Baseline Distinction:** User-provided figures (e.g. prior transcode milestones or queue estimates) are explicitly tracked in the `userBaseline` schema and labeled on all dashboards as **"User Baseline"** until confirmed by live network probes to Tdarr's API.
3. **Verified Live Telemetry:** Only live HTTP responses from Tdarr Server (`/api/v2/status`, `/api/v2/get-nodes`, `/api/v2/stats/get-pies`) are marked as `isLiveVerified: true`.
4. **Empirical Session Logs:** Storage deltas are measured strictly from real physical drive before-and-after benchmarks recorded during user-initiated tracking sessions.
5. **Sample Preview Isolation:** Interactive chart or duplicate comparison samples are sandboxed with visible `[SAMPLE PREVIEW]` banners and never saved to the local database.

---

## Core Capabilities

- **Dashboard:** Real-time summary of media drive utilization (D:\ and E:\), session tracking controls, live queue counts, and transcode efficiency.
- **Tdarr Integration & Diagnostics:** Non-invasive HTTP probe to Tdarr Server (`http://localhost:8265`) with node detection and connection health diagnostics.
- **Transcode Analytics:** Visualizes real session-by-session volume and storage deltas.
- **Safe Duplicate Detection:** Multi-level non-destructive duplicate finder:
  - **Level 1 (Exact):** SHA-256 binary hash matches.
  - **Level 2 (Probable):** Identical audio track fingerprint and runtime with different video codecs.
  - **Level 3 (Possible):** Multi-resolution or edition variants.
  - *Safety Mandate:* Automatic deletion is strictly forbidden. Files are only removed with explicit manual confirmation.
- **Session History:** SQLite-backed audit trail of all transcode tracking sessions with exact byte-level storage recovery.
- **Reports & Export:** Instant plaintext audit summaries and full CSV data exports.
- **Discord Notifications:** Direct, bot-free webhook notifications for transcode completion, error alerts, and duplicate scan summaries.

---

## Technical Specifications

- **Runtime:** Node.js, Express, React 18, Tailwind CSS, Lucide icons, Recharts
- **Storage:** Local file-backed database (`data/tardis_db.json`) simulating Windows SQLite storage
- **Host Port:** Binds to `0.0.0.0:3000`
- **Network Footprint:** Completely local. External network access is only used if optional Discord webhooks are configured.
