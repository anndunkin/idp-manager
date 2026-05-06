# Paul Selby's IDP Tool — Technical Documentation

**Version:** 1.0.8  
**Last Updated:** 2026-05-06  
**Repository:** https://github.com/anndunkin/idp-manager

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [IPC API Reference](#ipc-api-reference)
6. [Configurable Milestones](#configurable-milestones)
7. [File Management (.idp Format)](#file-management-idp-format)
8. [Export System](#export-system)
9. [Build & Package Pipeline](#build--package-pipeline)
10. [Code Signing](#code-signing)
11. [Test Suite](#test-suite)
12. [Security Architecture](#security-architecture)
13. [Known Constraints](#known-constraints)

---

## Architecture Overview

Paul Selby's IDP Tool is a desktop application built with Electron, using a **three-process architecture**:

```
┌──────────────────────────────────────────────────────────┐
│  Renderer Process (React/TypeScript)                      │
│  src/pages/*.tsx, src/components/*.tsx                    │
│  Communicates only via window.api (contextBridge)         │
└──────────────────┬───────────────────────────────────────┘
                   │ IPC (ipcRenderer.invoke)
┌──────────────────▼───────────────────────────────────────┐
│  Preload Script (electron/preload.ts)                     │
│  Exposes typed window.api surface via contextBridge       │
│  nodeIntegration: false / contextIsolation: true          │
└──────────────────┬───────────────────────────────────────┘
                   │ ipcMain.handle
┌──────────────────▼───────────────────────────────────────┐
│  Main Process (electron/main.ts)                          │
│  SQLite database, export generation, file I/O             │
│  electron/database.ts, electron/exportMain.ts             │
└──────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- All database access happens exclusively in the main process
- The renderer never holds a DB connection or raw file handle
- All user input is parameterized before reaching SQLite
- `.idp` save files are versioned JSON snapshots

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Shell | Electron | 41.5.0 |
| UI Framework | React | 18.x |
| Language | TypeScript | 5.x |
| Bundler | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| Database | better-sqlite3 | 12.9.0 |
| Excel Export | ExcelJS | latest |
| Word Export | docx | latest |
| PDF Export | pdfkit | latest |
| Test Runner | Vitest | 1.x |
| UI Testing | @testing-library/react | latest |
| Packager | electron-builder | latest |
| Code Signing | osslsigncode | 2.9 |

**Why Electron 41.5.0?**  
`better-sqlite3` v12.9.0 requires native module ABI 145 (`electron-v145`). Electron 41.5.0 matches this exactly. Upgrading Electron past this version would require rebuilding or updating the prebuilt native binary.

---

## Project Structure

```
idp-manager/
├── electron/
│   ├── main.ts           # BrowserWindow, IPC handlers, file I/O
│   ├── preload.ts        # contextBridge — exposes window.api
│   ├── database.ts       # SQLite CRUD with initSchema + migrations
│   ├── exportMain.ts     # Excel/Word/PDF buffer generators
│   └── types.ts          # Shared type definitions (canonical source)
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Router setup
│   ├── index.css         # Tailwind base styles
│   ├── assets/fonts/     # Inter TTF files (bundled, no CDN)
│   ├── types/index.ts    # Renderer-side mirror of electron/types.ts
│   ├── pages/
│   │   ├── Dashboard.tsx       # Overview with stats + employee list
│   │   ├── IDPDetail.tsx       # Plan view with dynamic milestone columns
│   │   ├── NewIDP.tsx          # Plan creation wizard
│   │   └── EmployeeDetail.tsx  # Employee profile + plan history
│   ├── components/
│   │   ├── NavBar.tsx          # Sidebar with "Paul Selby's IDP Tool" branding
│   │   ├── IDPForm.tsx         # Plan creation form with milestone preset selector
│   │   ├── MilestoneTracker.tsx # Dynamic milestone column renderer
│   │   ├── FileMenuBar.tsx     # Save / Save As / Open buttons with status flash
│   │   └── ExportButtons.tsx   # Excel / Word / PDF export triggers
│   └── utils/
│       └── milestoneLabels.ts  # Label generation for all milestone presets
├── tests/
│   ├── database.test.ts        # 27 tests: Employee/Plan/Item/Milestone CRUD
│   ├── exports.test.ts         # 9 tests: Excel/Word/PDF buffer validation
│   ├── components.test.tsx     # 13 tests: UI component rendering
│   ├── fileManagement.test.ts  # 12 tests: buildFilePayload/importFilePayload
│   ├── milestoneLabels.test.ts # 42 tests: milestoneLabels utility + DB integration
│   ├── security.test.ts        # 41 tests: SQL injection, XSS, input validation,
│   │                           #           path traversal, cascade deletes, Electron config
│   ├── setup.ts                # @testing-library/jest-dom setup
│   └── __mocks__/electron.ts   # Electron mock for test environment
├── scripts/
│   ├── afterPack.js      # Injects prebuilt Win32 better_sqlite3.node after pack
│   └── installer.nsh     # NSIS customInit: sets $INSTDIR to $EXEDIR\IDP Manager
├── prebuilt-win32-x64/
│   └── better_sqlite3.node   # v12.9.0 electron-v145 win32-x64 (ABI 145)
├── certs/
│   ├── signing.crt       # Public certificate (committed to repo)
│   ├── signing.key        # Private key — NOT committed (in .gitignore)
│   └── signing.pfx        # PKCS#12 bundle — NOT committed (in .gitignore)
├── assets/
│   ├── icon.ico
│   └── icon.png
├── docs/
│   ├── TECHNICAL.md      # This file
│   └── USER_GUIDE.md     # End-user documentation
├── dist/                 # Vite renderer output (git-ignored)
├── dist-installer/       # electron-builder output (git-ignored)
├── electron-builder.config.js
├── vite.config.ts        # Vite + Vitest configuration
├── tsconfig.json         # Renderer TypeScript config
├── tsconfig.node.json    # Electron main process TypeScript config
├── package.json
├── README.md
└── CHANGELOG.md
```

---

## Database Schema

SQLite database stored at: `%APPDATA%\idp-manager\idp-manager.db` (Windows)

WAL journal mode is enabled for performance. Foreign keys are enforced.

### Tables

#### `employees`
```sql
CREATE TABLE employees (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  manager_name TEXT    NOT NULL,
  job_title    TEXT    NOT NULL DEFAULT '',
  department   TEXT    NOT NULL DEFAULT '',
  created_at   DATETIME DEFAULT (datetime('now')),
  updated_at   DATETIME DEFAULT (datetime('now'))
);
```

#### `development_plans`
```sql
CREATE TABLE development_plans (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  plan_date       TEXT    NOT NULL,
  plan_year       INTEGER NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'Active'
                    CHECK(status IN ('Active','Inactive','Complete')),
  notes           TEXT    NOT NULL DEFAULT '',
  milestone_count INTEGER NOT NULL DEFAULT 4 CHECK(milestone_count BETWEEN 1 AND 52),
  created_at      DATETIME DEFAULT (datetime('now')),
  updated_at      DATETIME DEFAULT (datetime('now'))
);
```

> **v1.0.8 addition:** `milestone_count` stores how many tracking periods this plan uses (e.g. 4 = quarterly, 12 = monthly). Added via `ALTER TABLE` migration in `initSchema` for backward compatibility.

#### `development_items`
```sql
CREATE TABLE development_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id          INTEGER NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
  item_description TEXT    NOT NULL,
  due_date         TEXT    NOT NULL DEFAULT '',
  support_needed   TEXT    NOT NULL DEFAULT '',
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       DATETIME DEFAULT (datetime('now')),
  updated_at       DATETIME DEFAULT (datetime('now'))
);
```

#### `quarterly_milestones`
```sql
CREATE TABLE quarterly_milestones (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id          INTEGER NOT NULL REFERENCES development_items(id) ON DELETE CASCADE,
  quarter          INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 52),
  status           TEXT    NOT NULL DEFAULT 'Not Started'
                     CHECK(status IN ('Not Started','In Progress','Complete')),
  percent_complete INTEGER NOT NULL DEFAULT 0 CHECK(percent_complete BETWEEN 0 AND 100),
  notes            TEXT    NOT NULL DEFAULT '',
  updated_at       DATETIME DEFAULT (datetime('now')),
  UNIQUE(item_id, quarter)
);
```

> Despite the name `quarterly_milestones`, the `quarter` column stores any period number 1–52. The label interpretation (Q1, M3, H1, etc.) is handled in the application layer via `milestoneLabels.ts`.

### Cascade Delete Behavior

| Delete action | Cascades to |
|---|---|
| Delete employee | → all plans → all items → all milestones |
| Delete plan | → all items → all milestones |
| Delete item | → all milestones |

### Migration

`initSchema()` runs on every app start. It is safe to call repeatedly. For the `milestone_count` migration:

```typescript
const cols = database.prepare(`PRAGMA table_info(development_plans)`).all();
const hasMilestoneCount = cols.some(c => c.name === 'milestone_count');
if (!hasMilestoneCount) {
  database.exec(`ALTER TABLE development_plans ADD COLUMN milestone_count INTEGER NOT NULL DEFAULT 4`);
}
```

---

## IPC API Reference

All communication between renderer and main process goes through `window.api`, exposed by `preload.ts` via `contextBridge.exposeInMainWorld`.

### `window.api.employees`

| Method | Signature | Description |
|---|---|---|
| `getAll` | `() => Promise<Employee[]>` | All employees sorted by name |
| `getById` | `(id: number) => Promise<Employee \| null>` | Single employee lookup |
| `create` | `(data: EmployeeCreate) => Promise<Employee>` | Create employee; throws if name/manager empty |
| `update` | `(id: number, data: EmployeeUpdate) => Promise<Employee \| null>` | Partial update |
| `delete` | `(id: number) => Promise<boolean>` | Delete + cascade |

### `window.api.plans`

| Method | Signature | Description |
|---|---|---|
| `getByEmployee` | `(employeeId: number) => Promise<DevelopmentPlan[]>` | Plans by employee, desc date |
| `getById` | `(id: number) => Promise<PlanWithItems \| null>` | Plan with items and milestones |
| `create` | `(data: PlanCreate) => Promise<DevelopmentPlan>` | Create plan; `milestone_count` defaults to 4 |
| `update` | `(id: number, data: PlanUpdate) => Promise<DevelopmentPlan \| null>` | Update plan fields |
| `delete` | `(id: number) => Promise<boolean>` | Delete + cascade |

### `window.api.items`

| Method | Signature | Description |
|---|---|---|
| `getByPlan` | `(planId: number) => Promise<DevelopmentItem[]>` | Items sorted by `sort_order` |
| `create` | `(data: ItemCreate) => Promise<DevelopmentItem>` | Create item; throws if description empty |
| `update` | `(id: number, data: ItemUpdate) => Promise<DevelopmentItem \| null>` | Update item fields |
| `delete` | `(id: number) => Promise<boolean>` | Delete item + its milestones |
| `reorder` | `(planId: number, itemIds: number[]) => Promise<boolean>` | Reassign sort_order by provided order |

### `window.api.milestones`

| Method | Signature | Description |
|---|---|---|
| `getByItem` | `(itemId: number) => Promise<QuarterlyMilestone[]>` | Milestones sorted by quarter asc |
| `upsert` | `(data: MilestoneUpsert) => Promise<QuarterlyMilestone>` | INSERT OR REPLACE by (item_id, quarter) |

### `window.api.export`

| Method | Signature | Description |
|---|---|---|
| `toExcel` | `(planId: number) => Promise<{success, filePath?, error?}>` | Export to Downloads, auto-open |
| `toWord` | `(planId: number) => Promise<{success, filePath?, error?}>` | Export to Downloads, auto-open |
| `toPdf` | `(planId: number) => Promise<{success, filePath?, error?}>` | Export to Downloads, auto-open |

### `window.api.file`

| Method | Signature | Description |
|---|---|---|
| `save` | `(planId: number, filePath?: string) => Promise<FileResult>` | Save to known path or show dialog |
| `saveAs` | `(planId: number) => Promise<FileResult>` | Always show save dialog |
| `open` | `() => Promise<FileResult & {planId?: number}>` | Show open dialog, import, return new planId |

---

## Configurable Milestones

### v1.0.8 Feature

Plans can be configured with any of 5 preset milestone period counts. The choice is made at plan creation time via the **Milestone Periods** selector.

### Preset Table

| `milestone_count` | Short Labels | Full Labels | Use Case |
|---|---|---|---|
| 2 | H1, H2 | Half 1, Half 2 | Semi-annual reviews |
| 3 | T1, T2, T3 | Third 1–3 | Thirds of a year |
| 4 | Q1–Q4 | Quarter 1–4 | **Default** — quarterly |
| 6 | B1–B6 | Bi-Month 1–6 | Bi-monthly check-ins |
| 12 | M1–M12 | Month 1–12 | Monthly milestones |

### `milestoneLabels.ts` Utility

```typescript
// Short column header (e.g. Q1, M3, H2)
milestoneLabel(periodNum: number, totalPeriods: number): string

// Full display name (e.g. Quarter 1, Month 3, Half 2)
milestoneLabelFull(periodNum: number, totalPeriods: number): string

// Same as milestoneLabel — used for export column headers
milestoneColumnHeader(periodNum: number, totalPeriods: number): string

// Returns [1, 2, ..., count]
milestonePeriods(count: number): number[]

// The 5 selector options shown in IDPForm
MILESTONE_PRESETS: Array<{ value: number; label: string }>
```

### Dynamic Rendering

`IDPDetail.tsx` reads `plan.milestone_count` and renders exactly that many milestone columns. `MilestoneTracker.tsx` accepts a `periodLabel` prop for the column header label. Both the table UI and all three export formats (Excel, Word, PDF) dynamically scale to the plan's milestone count.

---

## File Management (.idp Format)

### Overview

`.idp` files are versioned JSON snapshots of a complete plan — employee, plan metadata, all development items, and all milestone data. They allow plans to be:

- Saved to a named file for archival or sharing
- Reopened into the app (which imports them as a new plan in the DB)
- Used as a backup mechanism independent of the SQLite database

### File Payload Schema

```typescript
interface IdpFilePayload {
  version: number;       // Currently 1 (IDP_FILE_VERSION)
  savedAt: string;       // ISO timestamp
  employee: {
    name: string;
    manager_name: string;
    job_title: string;
    department: string;
  };
  plan: {
    plan_date: string;
    plan_year: number;
    status: 'Active' | 'Inactive' | 'Complete';
    notes: string;
    milestone_count: number;  // Added in v1.0.8
  };
  items: Array<{
    item_description: string;
    due_date: string;
    support_needed: string;
    sort_order: number;
    milestones: Array<{
      quarter: number;
      status: 'Not Started' | 'In Progress' | 'Complete';
      percent_complete: number;
      notes: string;
    }>;
  }>;
}
```

### IPC Handlers (main.ts)

**`file:save`** — Writes the plan to a previously known path. If no path is provided, falls back to Save As dialog. Returns `FileResult` with `success`, `filePath`, and optional `error`.

**`file:saveAs`** — Always shows a native save dialog filtered to `*.idp`. On confirmation, serializes the plan via `buildFilePayload()` and writes JSON.

**`file:open`** — Shows a native open dialog filtered to `*.idp`. Reads and parses the file, then calls `importFilePayload()` to insert the data into the database. Returns `{ success, planId }` on success.

### Employee Deduplication on Open

When a `.idp` file is opened, the import logic matches the incoming employee by `(name, manager_name)`. If a matching employee already exists in the database, the plan is linked to that employee rather than creating a duplicate.

### Keyboard Shortcut

`Ctrl+S` (Windows) / `Cmd+S` (macOS) triggers a save from within `IDPDetail.tsx`, calling `window.api.file.save` with the current plan ID.

---

## Export System

Exports are generated in the main process by `electron/exportMain.ts`. All three formats use the same dynamic milestone column logic.

### Milestone Column Logic

```typescript
// In exportMain.ts:
const periods = (plan.milestone_count ?? 4);

function mlabel(n: number): string {
  // Returns Q1, H1, M3, etc. matching milestoneLabel() in milestoneLabels.ts
}
```

### Excel (`.xlsx`)

Uses **ExcelJS**. Produces a styled spreadsheet with:
- Header row with employee name, manager, plan date, year, status
- One row per development item with due date, support needed, and N milestone columns
- Each milestone cell contains `Status / XX%` and notes

### Word (`.docx`)

Uses **docx** library. Produces a formatted document with:
- Title: `{Employee Name} — Individual Development Plan`
- APP_NAME constant used in the header footer
- One section per development item with a milestone table

### PDF (`.pdf`)

Uses **pdfkit**. Produces a styled PDF with:
- Bundled Inter font (no system font dependency)
- Color-coded milestone status cells
- Dynamic column widths based on milestone count

### Auto-Open Behavior

After export, the file is saved directly to the user's Downloads folder with a timestamped filename. The file is then opened automatically using `shell.openPath()`. No save dialog is shown.

---

## Build & Package Pipeline

### Prerequisites (Development)

- Node.js 18+
- npm
- osslsigncode (for code signing)

### Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run tests
npm test                    # watch mode
npx vitest run              # single run
npx vitest run --reporter=verbose  # with test names

# Production build (Vite + tsc)
npm run build

# Package for Windows x64
npx electron-builder --win --x64 --config electron-builder.config.js

# Sign the executable
osslsigncode sign \
  -pkcs12 certs/signing.pfx \
  -pass <password> \
  -n "Paul Selby's IDP Tool" \
  -i "https://github.com/anndunkin/idp-manager" \
  -t "http://timestamp.digicert.com" \
  -in <unsigned.exe> \
  -out <signed.exe>
```

### Why `npmRebuild: false`

`better-sqlite3` requires a native `.node` binary compiled for the exact Electron ABI. Cross-compiling on Linux for Windows is not reliable. The solution:

1. A prebuilt Windows binary for `better-sqlite3` v12.9.0 / electron-v145 is stored at `prebuilt-win32-x64/better_sqlite3.node`
2. `scripts/afterPack.js` copies it into the packaged app after electron-builder finishes
3. `npmRebuild: false` in `electron-builder.config.js` prevents electron-builder from trying to rebuild native modules

---

## Code Signing

### Certificate Details

| Field | Value |
|---|---|
| Subject | `C=US, ST=Texas, L=Marfa, O=Healthcare IDP Manager, OU=Software Distribution, CN=IDP Manager` |
| Valid | 2026-05-06 to 2036-05-03 |
| Type | Self-signed (RSA 2048) |
| Committed | `certs/signing.crt` (public cert only) |
| Excluded | `certs/signing.key`, `certs/signing.pfx` |

### Notes

This is a **self-signed** certificate. Windows Defender SmartScreen will display a warning on first run ("Windows protected your PC") because the certificate has no established reputation. Users should click **"More info" → "Run anyway"**.

---

## Test Suite

**Total: 144 tests across 6 test files — all passing**

| File | Tests | Coverage |
|---|---|---|
| `database.test.ts` | 27 | Employee/Plan/Item/Milestone CRUD, cascade deletes, validation |
| `exports.test.ts` | 9 | Excel/Word/PDF buffer validation and magic bytes |
| `components.test.tsx` | 13 | MilestoneTracker, MilestoneCell, IDPForm rendering |
| `fileManagement.test.ts` | 12 | buildFilePayload, importFilePayload, round-trip JSON |
| `milestoneLabels.test.ts` | 42 | All 5 presets, label functions, DB integration, migration |
| `security.test.ts` | 41 | SQL injection, XSS, input validation, path traversal, cascade FK, Electron config |

### Running Tests

```bash
npx vitest run              # All tests, single run
npx vitest run --reporter=verbose  # With individual test names
npx vitest                  # Watch mode
```

### Test Environment Notes

- `database.test.ts`, `exports.test.ts`, `fileManagement.test.ts`, `milestoneLabels.test.ts`, `security.test.ts` run in **node** environment
- `components.test.tsx` runs in **jsdom** environment
- The `electron` module is mocked via `tests/__mocks__/electron.ts`

---

## Security Architecture

### Electron Security Settings

| Setting | Value | Reason |
|---|---|---|
| `nodeIntegration` | `false` | Renderer cannot access Node.js APIs directly |
| `contextIsolation` | `true` | Renderer and preload run in isolated contexts |
| `sandbox` | `false` | Required for `better-sqlite3` native module in preload |
| `webSecurity` | default (`true`) | Same-origin policy enforced |

### Input Validation

All CRUD operations validate required fields and reject empty strings (after trim). The database enforces additional constraints:

- `status` fields use `CHECK` constraints with whitelists
- `percent_complete` is constrained to `0–100`
- `quarter` is constrained to `1–52`
- `milestone_count` is constrained to `1–52`

### SQL Injection

All database queries use **parameterized statements** via `better-sqlite3`'s prepared statement API (`db.prepare().run({...})`). No string interpolation is used for user-supplied values.

### XSS Prevention

React renders all text content via JSX, which auto-escapes HTML entities. No `dangerouslySetInnerHTML` is used. Raw user content is never injected into the DOM as HTML.

---

## Known Constraints

| Constraint | Details |
|---|---|
| Windows only | The packaged app targets Windows x64. macOS/Linux builds require a separate native binary for `better-sqlite3`. |
| Self-signed certificate | SmartScreen warning on first run. Not an issue for internal distribution. |
| NSIS installer on Linux | The 7z compression step for the NSIS installer fails on some Linux environments; use the ZIP deliverable for distribution. |
| Single-user | No multi-user/auth layer. The app is designed for a single manager managing their team's IDPs. |
| SQLite WAL mode | WAL files (`-wal`, `-shm`) appear alongside the DB file while the app is running; they are cleaned up on normal close. |
