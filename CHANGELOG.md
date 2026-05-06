# Changelog

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
