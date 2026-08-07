# IDP Manager

A desktop application for creating and tracking **Individual Development Plans** for cybersecurity and technical teams.

[![Latest Release](https://img.shields.io/github/v/release/anndunkin/idp-manager?label=Download&logo=windows&style=for-the-badge)](https://github.com/anndunkin/idp-manager/releases/latest)
[![Tests](https://img.shields.io/badge/tests-200%20passing-brightgreen?style=for-the-badge)](https://github.com/anndunkin/idp-manager/actions)

**Version:** 1.2.0 | **Platform:** Windows 10/11 x64 | **Stack:** Electron · React · TypeScript · SQLite

---

## Features

- **Employee profiles** — name, manager, job title, department
- **Development plans** — plan date, year, status, notes
- **Development items** — descriptions, due dates, estimated cost, support needed, drag-to-reorder
- **Configurable milestone periods** — 2 (semi-annual), 3 (thirds), 4 (quarterly), 6 (bi-monthly), or 12 (monthly)
- **Milestone tracking** — status (Not Started / In Progress / Complete), % complete, notes
- **Employee Input Form** — Excel template for employees to fill out and return; managers import it directly into the app
- **File management** — Save, Save As, and Open `.idp` files (portable JSON snapshots)
- **Exports** — Excel, Word, and PDF reports with dynamic milestone columns
- **Auto-open exports** — exported files open immediately in the default application
- **Keyboard shortcut** — Ctrl+S to save the current plan
- **Cascade deletes** — deleting an employee/plan removes all descendant records
- **Backward-compatible migrations** — existing databases from older versions are upgraded automatically

---

## Installation

Download the latest release from the **[Releases page](https://github.com/anndunkin/idp-manager/releases/latest)**:

| File | Description |
|---|---|
| `IDP Manager-*.win.zip` | Extract and run `IDP Manager.exe` directly (recommended) |
| `IDP Manager Setup *.exe` | Installer — runs through a setup wizard |

> **First launch:** Windows SmartScreen may show a warning. Click **More info → Run anyway**. This is expected for a self-signed certificate.

---

## Quick Start

1. Launch the app
2. Click **+ New Employee** and fill in the employee details
3. Click **+ New IDP** to create a development plan
4. Choose a **Milestone Periods** setting (default: 4 quarterly)
5. Add development items with descriptions, due dates, estimated cost, and support needed
6. Track progress by clicking the edit icon in any milestone cell
7. Export to Excel, Word, or PDF via the Export buttons

### Employee Input Form

1. Click **Get Form Template** in the NavBar to download the Excel form
2. Send the `.xlsx` file to the employee to fill out
3. When the employee returns the completed form, click **Import Employee Form** to load it directly into the app

---

## Milestone Presets

| Value | Labels | Description |
|---|---|---|
| 2 | H1, H2 | Semi-annual |
| 3 | T1, T2, T3 | Thirds |
| **4** | **Q1–Q4** | **Quarterly (default)** |
| 6 | B1–B6 | Bi-monthly |
| 12 | M1–M12 | Monthly |

---

## Documentation

- [User Guide](docs/USER_GUIDE.md) — Installation, features, and how-to instructions
- [Technical Documentation](docs/TECHNICAL.md) — Architecture, schema, IPC API, build pipeline, Employee Input Form cell map

---

## Development

```bash
npm install         # Install dependencies
npm run dev         # Run in development mode
npx vitest run      # Run test suite (200 tests)
npm run build       # Production build
```

### Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 41.5.0 |
| UI | React 18 + TypeScript |
| Bundler | Vite 5 |
| Styles | Tailwind CSS |
| Database | better-sqlite3 12.9.0 (SQLite) |
| Excel | ExcelJS 4 |
| Tests | Vitest + @testing-library/react |

---

## Repository

- **GitHub:** https://github.com/anndunkin/idp-manager (private)
- **Releases:** https://github.com/anndunkin/idp-manager/releases
- **Related apps:** [timetrack-app](https://github.com/anndunkin/timetrack-app) · [dga-invoice-generator](https://github.com/anndunkin/dga-invoice-generator) · [expense-tracker](https://github.com/anndunkin/expense-tracker)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Security note: pinned dependencies

`keyv` and `cacheable-request` are pinned to `4.5.4` and `7.0.4` respectively via
the `overrides` field in `package.json`. This is a deliberate protection against
the August 2026 Keyv/Cacheable npm supply chain attack, which compromised
`keyv@6.0.0`, `cacheable-request@13.0.20`, and 400+ other packages
(see the [Wiz writeup](https://www.wiz.io/blog/keyv-and-cacheable-npm-supply-chain-attack)).

These are transitive dependencies pulled in via `got` → `@electron/get` → `electron`.
**Before removing or updating these overrides**, verify that newer versions of
`keyv`/`cacheable-request` are confirmed clean against current npm security advisories.

