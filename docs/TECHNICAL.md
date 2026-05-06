# IDP Manager — Technical Architecture

## Architecture Overview

IDP Manager is built on **Electron**, which hosts two distinct processes:

### Main Process (`electron/main.ts`)

The main process runs in Node.js. It is responsible for:

- Creating and managing the `BrowserWindow` instance.
- Opening and owning the SQLite database connection via `better-sqlite3`.
- Registering all IPC (Inter-Process Communication) handlers that respond to renderer requests.
- Handling file-system operations such as saving exported reports to the user's Downloads folder.

### Renderer Process (`src/`)

The renderer process is a standard browser context running the React 18 + TypeScript application bundled by Vite. It has no direct access to Node.js or Electron APIs. All communication with the main process goes through the IPC bridge.

### IPC Bridge Pattern

A **preload script** (`electron/preload.ts`) runs in an isolated context between the main and renderer processes. It uses Electron's `contextBridge.exposeInMainWorld` API to expose a controlled `window.api` object to the renderer. The renderer calls methods on `window.api`; the preload script translates those calls into `ipcRenderer.invoke()` messages; the main process handles them with `ipcMain.handle()` and returns results asynchronously.

```
Renderer (React)
    │  window.api.getEmployees()
    ▼
Preload Script (contextBridge)
    │  ipcRenderer.invoke('get-employees')
    ▼
Main Process (ipcMain.handle)
    │  better-sqlite3 query
    ▼
SQLite Database
```

---

## Security Model

IDP Manager applies a layered security approach aligned with Electron's security recommendations.

| Measure | Configuration | Effect |
|---|---|---|
| `nodeIntegration: false` | Set in `BrowserWindow.webPreferences` | Prevents renderer JavaScript from accessing Node.js APIs (e.g., `require`, `fs`, `process`). |
| `contextIsolation: true` | Set in `BrowserWindow.webPreferences` | The preload script's JavaScript context is isolated from the renderer page's context. `window.api` is a shallow, controlled bridge — not a full Node.js environment. |
| `sandbox: true` | Set in `BrowserWindow.webPreferences` | Renderer process is sandboxed at the OS level, limiting system calls available to it. |
| Content Security Policy | Set via `session.defaultSession.webRequest.onHeadersReceived` | Blocks inline scripts (`script-src 'self'`), restricts style and image origins, and prevents loading resources from untrusted external URLs. |
| Parameterised SQL | All queries use `better-sqlite3` prepared statements (`db.prepare(sql).run(...params)`) | User-supplied values are never concatenated into SQL strings, eliminating SQL injection risk. |
| `asar` packaging | `asar: true` in `electron-builder` config | Application source is packed into an asar archive. While not encryption, it deters casual code inspection and tampering. |
| Self-signed certificate | `electron-builder` `win.certificateFile` | The installer is signed with a developer-generated certificate. Users should verify the SHA-256 checksum published on the Releases page to confirm installer integrity. |

---

## Database Schema

The SQLite database is a single file managed by `better-sqlite3`. It contains four tables.

### `employees`

Stores employee profile information.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique employee identifier. |
| `name` | TEXT | NOT NULL | Employee's full name. |
| `manager_name` | TEXT | NOT NULL | Name of the employee's direct manager. |
| `job_title` | TEXT | | Employee's current role. |
| `department` | TEXT | | Team or department. |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp of record creation. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp of last update. |

### `development_plans`

Stores Individual Development Plans, each belonging to one employee.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique plan identifier. |
| `employee_id` | INTEGER | NOT NULL, FOREIGN KEY → `employees(id)` ON DELETE CASCADE | Links the plan to an employee. |
| `plan_date` | TEXT | NOT NULL | The date or period the plan covers (ISO-8601). |
| `status` | TEXT | NOT NULL | Plan lifecycle state (e.g., *Draft*, *Active*, *Complete*). |
| `notes` | TEXT | | High-level context or goals for the plan. |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp of record creation. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp of last update. |

**Foreign key:** `employee_id` references `employees(id)`. Deleting an employee cascades to delete all their plans.

### `development_items`

Stores individual development activities that belong to a plan.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique item identifier. |
| `plan_id` | INTEGER | NOT NULL, FOREIGN KEY → `development_plans(id)` ON DELETE CASCADE | Links the item to a plan. |
| `description` | TEXT | NOT NULL | Description of the development goal or activity. |
| `due_date` | TEXT | | Target completion date (ISO-8601). |
| `support_needed` | TEXT | | Resources, budget, or manager involvement required. |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | Controls display ordering within a plan. |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp of record creation. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp of last update. |

**Foreign key:** `plan_id` references `development_plans(id)`. Deleting a plan cascades to delete all its items.

### `quarterly_milestones`

Stores the Q1–Q4 milestone data for each development item.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique milestone identifier. |
| `item_id` | INTEGER | NOT NULL, FOREIGN KEY → `development_items(id)` ON DELETE CASCADE | Links the milestone to a development item. |
| `quarter` | TEXT | NOT NULL | Quarter label: `Q1`, `Q2`, `Q3`, or `Q4`. |
| `status` | TEXT | NOT NULL DEFAULT 'Not Started' | One of: *Not Started*, *In Progress*, *Complete*. |
| `percentage` | INTEGER | NOT NULL DEFAULT 0 | Completion percentage (0–100). |
| `notes` | TEXT | | Free-form progress notes for the quarter. |
| `updated_at` | TEXT | NOT NULL | ISO-8601 timestamp of last update. |

**Foreign key:** `item_id` references `development_items(id)`. Deleting a development item cascades to delete all its milestones.

A unique constraint on `(item_id, quarter)` ensures each item has at most one record per quarter; milestones are upserted on save.

---

## IPC API

The following methods are exposed to the renderer via `window.api` (defined in `electron/preload.ts`):

### Employee Methods

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `window.api.getEmployees()` | — | `Employee[]` | Returns all employee records. |
| `window.api.getEmployee(id)` | `id: number` | `Employee \| undefined` | Returns a single employee by ID. |
| `window.api.createEmployee(data)` | `EmployeeInput` | `Employee` | Inserts a new employee record. |
| `window.api.updateEmployee(id, data)` | `id: number, EmployeeInput` | `Employee` | Updates an existing employee. |
| `window.api.deleteEmployee(id)` | `id: number` | `void` | Deletes an employee and all related records (cascade). |

### Development Plan Methods

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `window.api.getPlans(employeeId)` | `employeeId: number` | `DevelopmentPlan[]` | Returns all plans for an employee. |
| `window.api.getPlan(id)` | `id: number` | `DevelopmentPlan \| undefined` | Returns a single plan by ID. |
| `window.api.createPlan(data)` | `PlanInput` | `DevelopmentPlan` | Creates a new development plan. |
| `window.api.updatePlan(id, data)` | `id: number, PlanInput` | `DevelopmentPlan` | Updates an existing plan. |
| `window.api.deletePlan(id)` | `id: number` | `void` | Deletes a plan and all its items and milestones. |

### Development Item Methods

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `window.api.getItems(planId)` | `planId: number` | `DevelopmentItem[]` | Returns all items for a plan, ordered by `sort_order`. |
| `window.api.createItem(data)` | `ItemInput` | `DevelopmentItem` | Adds a development item to a plan. |
| `window.api.updateItem(id, data)` | `id: number, ItemInput` | `DevelopmentItem` | Updates an existing development item. |
| `window.api.reorderItems(planId, orderedIds)` | `planId: number, orderedIds: number[]` | `void` | Updates `sort_order` for all items in a plan. |
| `window.api.deleteItem(id)` | `id: number` | `void` | Deletes an item and its quarterly milestones. |

### Quarterly Milestone Methods

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `window.api.getMilestones(itemId)` | `itemId: number` | `QuarterlyMilestone[]` | Returns all four quarter records for an item. |
| `window.api.upsertMilestone(data)` | `MilestoneInput` | `QuarterlyMilestone` | Creates or updates a milestone for a specific item + quarter. |

### Export Methods

| Method | Arguments | Returns | Description |
|---|---|---|---|
| `window.api.exportExcel(planId)` | `planId: number` | `{ filePath: string }` | Generates and saves an `.xlsx` report; returns the saved path. |
| `window.api.exportWord(planId)` | `planId: number` | `{ filePath: string }` | Generates and saves a `.docx` report; returns the saved path. |
| `window.api.exportPDF(planId)` | `planId: number` | `{ filePath: string }` | Generates and saves a `.pdf` report; returns the saved path. |

---

## Export System

All export logic runs in the **main process**, which has access to the file system. The renderer calls the relevant `window.api.export*` method; the main process fetches all required data from SQLite, generates the file in memory, writes it to the user's Downloads folder, and returns the file path.

### Excel Export (ExcelJS)

Uses the [`exceljs`](https://github.com/exceljs/exceljs) library to build a workbook in memory:

- **Sheet 1 — "Plan Overview"**: Employee name, manager, job title, department, plan date, status, and notes. Cells use styled headers with a brand-colour fill.
- **Sheet 2 — "Development Items"**: One row per development item, with columns for description, due date, support needed, and then four column groups for Q1–Q4 (status, percentage, notes). Column widths are auto-fitted.

The workbook is written to a `Buffer` via `workbook.xlsx.writeBuffer()` and saved to disk with `fs.writeFileSync`.

### Word Export (docx)

Uses the [`docx`](https://github.com/dolanmiu/docx) package to construct a `.docx` document in memory:

- A title paragraph with the employee's name and plan date.
- A summary section with plan status and notes.
- One section per development item, containing a heading, due date, support needed, and a four-column table for quarterly milestones.

The document is serialised with `Packer.toBuffer()` and saved to disk.

### PDF Export (jsPDF + jspdf-autotable)

Uses [`jspdf`](https://github.com/parallax/jsPDF) with the [`jspdf-autotable`](https://github.com/simonbengtsson/jsPDF-AutoTable) plugin:

- The document is created programmatically (A4 portrait).
- Employee and plan metadata is rendered as labelled text rows.
- Each development item is rendered as a heading followed by an auto-sized table with columns for Quarter, Status, Percentage, and Notes.

The PDF is exported as a `Uint8Array` via `doc.output('arraybuffer')` and written to disk.

---

## Build Pipeline

```
npm run build
  ├── vite build          → bundles renderer React app into dist/
  └── tsc -p tsconfig.electron.json  → compiles Electron main/preload into dist-electron/

npm run electron:build
  └── electron-builder    → reads electron-builder.config.js
        ├── copies dist/ and dist-electron/ into the app bundle
        ├── packs source into an asar archive
        ├── signs the installer with the developer certificate
        └── outputs dist-installer/IDP Manager Setup.exe
```

Key configuration files:

- `vite.config.ts` — Vite config for the renderer. Sets `base: './'` for Electron's file:// protocol and aliases `@/` to `src/`.
- `tsconfig.electron.json` — TypeScript config for the main process and preload script. Targets Node 18 / CommonJS.
- `electron-builder.config.js` — electron-builder config. Specifies `appId`, `productName`, `win.target` (`nsis`), `asar: true`, `files` glob patterns, and the output directory.

---

## Testing

Tests are written with **Vitest** and located in `src/__tests__/` and `electron/__tests__/`.

### Test Coverage (49 Tests Total)

| Category | Count | What Is Tested |
|---|---|---|
| Database CRUD | 18 | Create, read, update, delete operations for all four tables; cascade deletes; upsert behaviour for milestones; sort order persistence for development items. |
| Export Formats | 16 | Excel workbook has correct sheet names, column headers, and cell values; Word document contains expected paragraphs and table rows; PDF output is a valid PDF buffer with correct content. |
| UI Components | 15 | Employee form validation, plan form field binding, milestone editor status/percentage/notes interaction, dashboard summary card calculations, search/filter logic. |

### Running Tests

```bash
# Run full suite once
npm run test

# Run in watch mode
npm run test -- --watch

# Run with coverage report
npm run test -- --coverage
```

Coverage output is written to `coverage/` (HTML report at `coverage/index.html`).

---

## Data Storage

### Database Location

The SQLite database file (`idp-manager.db`) is stored in the platform-specific user data directory returned by Electron's `app.getPath('userData')`:

| Platform | Path |
|---|---|
| Windows | `C:\Users\<username>\AppData\Roaming\idp-manager\idp-manager.db` |
| macOS | `~/Library/Application Support/idp-manager/idp-manager.db` |
| Linux | `~/.config/idp-manager/idp-manager.db` |

The path is resolved in `electron/main.ts`:

```typescript
import { app } from 'electron';
import path from 'path';

const dbPath = path.join(app.getPath('userData'), 'idp-manager.db');
```

### Backing Up the Database

To back up all IDP data:

1. Close IDP Manager (ensures all writes are flushed).
2. Copy `idp-manager.db` from the path above to a backup location (external drive, network share, or cloud storage).

To restore from a backup:

1. Close IDP Manager.
2. Replace the `idp-manager.db` file with your backup copy.
3. Reopen IDP Manager.

There is no built-in backup or sync feature; manual file copying is the supported method.
