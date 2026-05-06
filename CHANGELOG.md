# Changelog

## [1.0.8] - 2026-05-06
### Added
- **Configurable milestone periods** — plans can now be configured with 2 (semi-annual), 3 (thirds), 4 (quarterly, default), 6 (bi-monthly), or 12 (monthly) milestone tracking periods
- `milestone_count` field added to `development_plans` table with backward-compatible `ALTER TABLE` migration for existing databases
- `milestoneLabels.ts` utility — `milestoneLabel()`, `milestoneLabelFull()`, `milestoneColumnHeader()`, `milestonePeriods()`, `MILESTONE_PRESETS`
- Dynamic milestone columns in IDPDetail table and all export formats (Excel, Word, PDF) driven by `plan.milestone_count`
- Milestone period selector in plan creation form (IDPForm)
- **File management** — Save, Save As, and Open `.idp` file operations with native dialogs
- `.idp` file format — versioned JSON snapshot of employee + plan + items + milestones
- `FileMenuBar` component with Save / Save As / Open buttons and status flash feedback
- Open File button in NavBar sidebar (accessible from any screen)
- Ctrl+S / Cmd+S keyboard shortcut to save from IDPDetail
- Employee deduplication on file open (matched by name + manager_name)
- `milestone_count` preserved in `.idp` file payload (IdpFilePayload v1)

### Changed
- Renamed app to **Paul Selby's IDP Tool** in NavBar, window title, and all export headers
- Replaced all healthcare-specific terminology and examples with cybersecurity equivalents throughout UI descriptors and placeholder text
- Dashboard updated to reference cybersecurity team context

### Tests
- Added `milestoneLabels.test.ts` — 42 tests covering all 5 milestone presets, label functions, DB integration, and backward-compatible migration
- Added `security.test.ts` — 41 tests covering SQL injection resistance, XSS input handling, input validation (required fields + DB CHECK constraints), path traversal safety, cascade delete integrity, and Electron security configuration
- Total: **144 tests (all passing)** across 6 test files
- Added `milestoneLabels.test.ts` and `security.test.ts` to `environmentMatchGlobs` (node environment)

## [1.0.7] - 2026-05-06
### Added
- File management capabilities: Save, Save As, and Open `.idp` files
- `FileMenuBar` component
- Keyboard shortcut Ctrl+S in IDPDetail
- 12 new file management tests (61 total)

## [1.0.6] - 2026-05-06
### Changed
- Exports now save directly to Downloads folder and auto-open — no save dialog shown
- Unique timestamped filenames to avoid collisions

## [1.0.5] - 2026-05-06
### Fixed
- ZIP app launch failure caused by ABI mismatch between Electron version and prebuilt `better_sqlite3.node`
- Downgraded to Electron 41.5.0 (ABI 145) and upgraded better-sqlite3 to v12.9.0 with matching prebuilt binary

## [1.0.4] - 2026-05-06
### Fixed
- Installer execution issues on Windows

## [1.0.1] - 2026-05-06
### Changed
- Installer updated to one-click silent install (`oneClick: true`) — app installs automatically to the current user's AppData folder with no wizard dialogs, consistent with other IDP Manager companion apps
- Added `perMachine: false` so install does not require admin elevation
- Added `deleteAppDataOnUninstall: false` to preserve user data on uninstall
- Aligned win32 signing config with standard self-signed build pipeline (`forceCodeSigning: false`, `signAndEditExecutable: false`)

## [1.0.0] - 2026-05-06
### Added
- Initial release
- Employee management (create, read, update, delete)
- Individual Development Plan creation and editing
- Development items with due dates and support needed fields
- Quarterly milestone tracking (Q1-Q4) with status, percentage, and notes
- Dashboard with summary statistics and employee progress overview
- Report export to Excel (.xlsx), Word (.docx), and PDF formats
- Self-signed Windows installer (.exe) via electron-builder
- Full test suite (49 tests covering database, exports, and UI components)
- Security hardening: contextIsolation, CSP, parameterized SQL queries
