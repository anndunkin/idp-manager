# IDP Manager — User Guide

**Version:** 1.2.0  
**Platform:** Windows 10/11 (x64)

---

## Table of Contents

1. [What Is This Tool?](#what-is-this-tool)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Creating an Employee Profile](#creating-an-employee-profile)
5. [Creating a Development Plan](#creating-a-development-plan)
6. [Configuring Milestone Periods](#configuring-milestone-periods)
7. [Working with Development Items](#working-with-development-items)
8. [Tracking Milestone Progress](#tracking-milestone-progress)
9. [File Management — Save, Save As, Open](#file-management--save-save-as-open)
10. [Employee Input Form (Excel)](#employee-input-form-excel)
11. [Exporting Reports](#exporting-reports)
12. [Editing and Updating Plans](#editing-and-updating-plans)
13. [Deleting Records](#deleting-records)
14. [Dashboard Overview](#dashboard-overview)
15. [Keyboard Shortcuts](#keyboard-shortcuts)
16. [Troubleshooting](#troubleshooting)

---

## What Is This Tool?

IDP Manager is a desktop application for creating and tracking **Individual Development Plans (IDPs)** for employees in cybersecurity and technical roles. It helps managers:

- Document each team member's development goals
- Define concrete action items with due dates and support requirements
- Track progress across configurable time periods (quarterly, monthly, semi-annual, etc.)
- Export professional reports in Excel, Word, or PDF format
- Save and reopen plans as portable `.idp` files

All data is stored locally on your computer. No internet connection is required after installation.

---

## Installation

### From the ZIP File (Recommended)

1. Download `IDP Manager-1.0.8-win.zip`
2. Right-click the ZIP and select **Extract All...**
3. Choose a destination folder (e.g., `C:\Tools\IDP Manager`)
4. Open the extracted `win-unpacked` folder
5. Double-click **IDP Manager.exe** to launch

> **Windows Security Warning:** On first launch, Windows Defender SmartScreen may display "Windows protected your PC." This is expected because the app uses a self-signed certificate. Click **More info**, then **Run anyway** to proceed.

### From the Installer

1. Download `IDP Manager Setup 1.0.8.exe`
2. Double-click the installer and follow the prompts
3. The app will be installed and a shortcut placed on your Desktop

---

## Getting Started

When you first launch the app, you will see the **Dashboard** — an overview of all employees and plans in the system. The sidebar on the left contains:

- **Dashboard** — Main overview
- **+ New Employee** — Add a new employee
- **+ New IDP** — Create a new development plan
- **Open File** — Open a saved `.idp` file

---

## Creating an Employee Profile

Before creating a development plan, add the employee to the system.

1. Click **+ New Employee** in the sidebar
2. Fill in:
   - **Full Name** (required)
   - **Manager Name** (required)
   - **Job Title** (e.g., Security Analyst, SOC Engineer)
   - **Department** (e.g., Cybersecurity Operations, Threat Intelligence)
3. Click **Save**

The employee will now appear in the Dashboard employee list.

---

## Creating a Development Plan

1. Click **+ New IDP** in the sidebar, or click **Create New Plan** on an employee's profile
2. Select the employee from the dropdown (or it will be pre-selected if you came from a profile)
3. Fill in the **Plan Details**:
   - **Plan Date** — The start date of this development plan
   - **Plan Year** — The calendar year this plan covers
   - **Status** — Active, Inactive, or Complete
   - **Notes** — Any general notes about the plan
   - **Milestone Periods** — Choose how many tracking periods to use (see below)
4. Add at least one **Development Item** (see next section)
5. Click **Create IDP**

---

## Configuring Milestone Periods

When creating a plan, you choose how many milestone tracking periods it will use. This setting cannot be changed after the plan is created.

| Selection | Periods | Column Labels | Best For |
|---|---|---|---|
| 2 — Semi-Annual | 2 | H1, H2 | Year-end reviews with a mid-year check |
| 3 — Thirds | 3 | T1, T2, T3 | Three-term tracking cycles |
| **4 — Quarterly** | **4** | **Q1, Q2, Q3, Q4** | **Default — most common** |
| 6 — Bi-Monthly | 6 | B1–B6 | Bi-monthly program reviews |
| 12 — Monthly | 12 | M1–M12 | High-cadence monthly coaching |

**Example for cybersecurity teams:** A threat intelligence analyst working toward a GIAC certification might use quarterly (Q1–Q4) milestones to align with training cycles. A SOC engineer following a 12-month remediation roadmap might use monthly (M1–M12) milestones for tighter visibility.

---

## Working with Development Items

Development items are the specific goals, skills, or certifications the employee is working toward.

### Adding Items

Each plan starts with one item row. To add more:
- Click **+ Add Item** at the bottom of the Development Items section

### Item Fields

| Field | Description |
|---|---|
| **Description** | What the employee will accomplish (e.g., "Earn CompTIA Security+ certification") |
| **Due Date** | Target completion date |
| **Estimated Cost** | Free-text cost estimate for this development item (e.g., `$500`, `~$2,000 incl. exam fee`) |
| **Support Needed** | Resources required (e.g., "Training budget, study time allocation, exam fee") |

### Reordering Items

Drag the handle on the left side of any item row to reorder items. The order is saved automatically.

---

## Tracking Milestone Progress

After a plan is created, you can track progress in each milestone period.

1. Navigate to the plan by clicking on it from the Dashboard or employee profile
2. In the plan detail view, each development item has milestone columns (Q1–Q4, M1–M12, etc.)
3. Click the **edit button** (pencil icon) in any milestone cell to update progress

### Milestone Fields

| Field | Options |
|---|---|
| **Status** | Not Started / In Progress / Complete |
| **% Complete** | 0–100 |
| **Notes** | Free-text notes for this period |

### Status Color Coding

- **Not Started** — Gray
- **In Progress** — Yellow/Amber
- **Complete** — Green

---

## File Management — Save, Save As, Open

Plans can be saved to portable `.idp` files. This lets you archive plans, share them with others, or back them up outside the database.

### Save (Ctrl+S)

**Saves the current plan to its known file path.** If the plan has never been saved to a file, it will prompt you to choose a location (same as Save As).

- Use the **Save** button in the plan toolbar, or
- Press **Ctrl+S** (Windows) / **Cmd+S** (macOS)

### Save As

**Always prompts you to choose a file name and location.**

1. Click **Save As** in the plan toolbar
2. Choose a folder and enter a file name (e.g., `alice-smith-2026-plan.idp`)
3. Click **Save**

### Open File

**Opens a saved `.idp` file and imports it as a new plan in your database.**

1. Click **Open File** in the left sidebar (available from any screen), or
2. Click **Open** in any plan's toolbar
3. Browse to the `.idp` file and click **Open**

The plan is imported — if the employee already exists in the database (matched by name + manager name), the plan is linked to that employee. Otherwise, a new employee record is created.

> **Note:** Opening a file always creates a new plan entry in the database. It does not overwrite any existing plan.

### File Format

`.idp` files are JSON text files. They capture the complete state of the plan: employee details, plan metadata, all development items, and all milestone data. The `milestone_count` value is preserved, so a 12-period monthly plan imported on another machine will still show 12 columns.

---

## Employee Input Form (Excel)

The **Employee Input Form** is a branded Excel workbook (`.xlsx`) that managers distribute to employees. The employee fills it out and returns it; the manager then imports it directly into the IDP Tool with a single click — no manual data entry required.

### Getting the Blank Template

To get the template to send to an employee:

1. Click **Get Form Template** in the left sidebar (below *Import Employee Form*)
2. The file `IDP_Employee_Input_Form.xlsx` is saved to your **Downloads** folder and opens automatically
3. Send it to your employee via email, Teams, or SharePoint

### What the Employee Fills Out

The form has four sections:

| Section | Fields |
|---|---|
| **1 — Employee Information** | Full Name \*, Manager Name \*, Job Title, Department |
| **2 — Development Plan Details** | Plan Date \*, Plan Year \*, Status (dropdown), Milestone Periods (dropdown), Plan Notes |
| **3 — Development Items** | Up to 5 rows: Description \*, Due Date, Estimated Cost, Support Needed |
| **4 — Quarterly Milestone Check-Ins** | Per-item Q1–Q4 Status and Notes columns |

> Fields marked \* are required. The employee only needs to fill in the item rows they are using — blank rows are skipped on import.

#### Estimated Cost

Each development item row includes an **Est. Cost** column. Employees enter a free-text cost estimate (e.g., `$500`, `1200`, `~$2,000 incl. exam fee`). No specific format is enforced — it is stored and displayed exactly as entered.

#### Section 4 — Quarterly Milestone Check-Ins

Section 4 contains a grid with one row per development item (rows 22–26). Each row has columns for Q1 through Q4 Status and Notes. Employees optionally fill in their anticipated milestone status and any notes for each quarter. On import, milestone rows where both Status is "Not Started" and Notes are blank are skipped (treated as not yet planned).

The **Status** and **Milestone Periods** fields have dropdown lists built into the spreadsheet:

| Status options | Milestone Period options |
|---|---|
| Active, Inactive, Complete | 2 — Semi-Annual, 3 — Thirds, 4 — Quarterly, 6 — Bi-Monthly, 12 — Monthly |

### Importing the Completed Form

When the employee returns the filled-out form:

1. Click **Import Employee Form** in the left sidebar
2. Browse to the returned `.xlsx` file and click **Open**
3. The IDP Tool reads the form, creates or matches the employee record, and creates a new development plan
4. You are taken directly to the new plan's detail view to review, adjust milestone tracking, and save

> **If the employee already exists** in the database (matched by full name + manager name), the new plan is linked to their existing record. No duplicate employee is created.

### Validation

The importer validates the form before creating any records. If a required field is missing or invalid, you will see an error message in the sidebar (in red) explaining exactly what needs to be corrected. Common errors:

| Error | Fix |
|---|---|
| "Employee Full Name is required" | Employee left cell B5 blank |
| "Manager Name is required" | Employee left cell G5 blank |
| "Plan Date is required" | Cell B9 is blank or not in YYYY-MM-DD format |
| "At least one development item..." | All description cells (B14–B18) are blank |

### Editing After Import

The imported plan is a full, editable IDP — you can add milestone tracking, reorder items, change the plan status, or add notes before saving it as a `.idp` file.

---

## Exporting Reports

From any plan detail view, use the **Export** buttons to generate formatted reports:

| Button | Output | Opens Automatically |
|---|---|---|
| **Excel** | `.xlsx` spreadsheet | Yes — opens in Excel |
| **Word** | `.docx` document | Yes — opens in Word |
| **PDF** | `.pdf` file | Yes — opens in your PDF viewer |

Reports are saved to your **Downloads** folder with a timestamped filename (e.g., `Alice-Smith-IDP-2026-05-06T14-30-00.xlsx`).

All exports include:
- Employee name, manager, job title, department
- Plan date, year, status, and notes
- All development items with due dates and support needed
- All milestone columns, labeled with the plan's period labels (Q1–Q4, M1–M12, etc.)
- Status, percent complete, and notes for each milestone

---

## Editing and Updating Plans

### Edit Plan Details

From the plan detail view, click **Edit Plan** to update:
- Plan date, year, and status
- Notes
- Development item descriptions, due dates, and support needed

> **Note:** The Milestone Periods setting cannot be changed after a plan is created. If you need a different period count, create a new plan.

### Update Milestone Progress

Click the edit button in any milestone cell at any time to update status, percentage, and notes.

---

## Deleting Records

> **Warning:** Deletions are permanent and cascade. Deleting an employee also deletes all their plans, items, and milestones.

### Delete a Milestone Entry

Click the edit button on a milestone cell, then click **Delete** (if available).

### Delete a Development Item

Click the **Delete** (trash) icon on the item row. This also removes all milestone data for that item.

### Delete a Plan

From the plan detail view, click the plan menu and select **Delete Plan**. This removes the plan, all its items, and all milestones.

### Delete an Employee

From the employee profile, click **Delete Employee**. This removes the employee and all associated plans, items, and milestones.

---

## Dashboard Overview

The Dashboard shows:
- **Total Employees** in the system
- **Active Plans** count
- **Plans Due This Quarter**
- **Overall Completion Rate** (average across all plans)

Below the stats, the employee list shows each employee with their most recent plan status and a summary completion bar.

Click any employee name to view their profile and all associated plans.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl+S** | Save current plan to its known file path |

---

## Troubleshooting

### "Windows protected your PC" on launch

This is normal for a self-signed application. Click **More info** then **Run anyway**.

### The app opens but shows a blank window

This may happen if the `resources/app.asar` file is missing or corrupted. Re-extract the ZIP to a fresh folder and try again.

### A plan I opened doesn't show all its milestone columns

The `.idp` file may have been created with a different `milestone_count`. The number of columns is controlled by the value stored in the file. Verify the file was saved from a v1.0.8 build of the app.

### Exports don't open automatically

The auto-open feature uses your default application for `.xlsx`, `.docx`, and `.pdf`. If no default is set, check your Windows file associations for these formats.

### The database seems to be missing data after a computer restart

The database is stored at:
```
C:\Users\<YourName>\AppData\Roaming\idp-manager\idp-manager.db
```
The `AppData` folder is hidden by default. To view it, open File Explorer and type `%APPDATA%\idp-manager` in the address bar.

### How do I back up my data?

Either:
1. Copy the database file from `%APPDATA%\idp-manager\idp-manager.db` to a backup location, or
2. Use **Save As** on each plan to export `.idp` files, which can be re-imported at any time
