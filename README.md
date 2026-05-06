# IDP Manager

IDP Manager is a cross-platform desktop application for creating, tracking, and exporting Individual Development Plans (IDPs). Built with Electron, React, and SQLite, it gives managers a structured way to document employee development goals, assign quarterly milestones, record progress, and generate polished reports — all stored locally on the user's machine.

![Tests](https://img.shields.io/badge/Tests-49%20Passing-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey) ![Security](https://img.shields.io/badge/Security-Audited-green)

---

## Features

- **Employee Management** — Add, edit, and remove employees with name, manager, job title, and department fields.
- **IDP Creation & Editing** — Create Individual Development Plans for any employee, with plan date, status, and supporting notes.
- **Development Items with Due Dates & Support Tracking** — Attach one or more development items to each plan, each with a description, due date, and a "support needed" field.
- **Quarterly Milestone Tracking (Q1–Q4)** — Each development item has four quarterly milestone cells. Click any cell to set a status (Not Started / In Progress / Complete), a completion percentage (0–100%), and free-form notes.
- **Report Export to Excel, Word, and PDF** — Generate formatted reports in `.xlsx` (two-sheet workbook), `.docx` (formal document), or PDF (printable layout). Files are saved to the user's Downloads folder.
- **Local SQLite Storage** — All data is stored in a SQLite database on the user's own machine; nothing is transmitted over a network.
- **Self-Signed Installer** — Ships as a self-signed `.exe` installer for Windows, built with electron-builder.

---

## Screenshots

> Screenshots coming soon.

---

## Installation

### Windows

1. Download `IDP Manager Setup.exe` from the [Releases](https://github.com/anndunkin/idp-manager/releases) page.
2. Double-click the installer. If Windows SmartScreen appears, click **More info → Run anyway** (the installer is self-signed).
3. The app installs automatically — no wizard dialogs. It installs to `%LocalAppData%\Programs\IDP Manager` for the current user (no admin rights required) and creates a desktop shortcut and Start Menu entry.
4. Launch **IDP Manager** from the Start menu or the desktop shortcut.

---

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm

```bash
git clone https://github.com/anndunkin/idp-manager
cd idp-manager
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and opens the Electron window with hot-module replacement enabled.

---

## Building the Installer

```bash
npm run build
npm run electron:build
# Output: dist-installer/IDP Manager Setup.exe
```

`npm run build` bundles the React renderer via Vite and compiles the Electron main process with `tsc`. `npm run electron:build` then packages everything into a self-signed Windows installer using electron-builder.

---

## Running Tests

```bash
npm run test
```

Runs the full Vitest suite (49 tests) covering database CRUD operations, export format correctness, and React component behaviour.

---

## Security

IDP Manager applies defence-in-depth across every layer of the Electron stack:

| Measure | Details |
|---|---|
| `nodeIntegration: false` | Node.js APIs are not exposed to renderer web content. |
| `contextIsolation: true` | The preload script runs in an isolated context; renderer JS cannot access Electron or Node globals. |
| Content Security Policy | A strict CSP header is set on all renderer windows, blocking inline scripts and unauthorised resource origins. |
| Parameterised SQL | All database queries use `better-sqlite3` prepared statements; user input is never interpolated into SQL strings. |
| `asar` packaging | Application source is packaged into an asar archive, making casual inspection and tampering harder. |
| Self-signed installer | The installer is signed with a self-generated certificate. Users are advised to verify the SHA-256 checksum published on the Releases page. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Desktop Runtime | Electron 28+ |
| Database | SQLite (better-sqlite3) |
| Styling | Tailwind CSS |
| Testing | Vitest |
| Packaging | electron-builder |

---

## Data Storage

All application data is stored in a SQLite database located in the user's platform-specific application data folder (`AppData\Roaming\idp-manager` on Windows, `~/Library/Application Support/idp-manager` on macOS, `~/.config/idp-manager` on Linux). Data is **never transmitted** to any remote server.

---

## License

MIT © Ann Dunkin
