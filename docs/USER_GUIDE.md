# IDP Manager — User Guide

## Introduction

IDP Manager is a desktop application designed to help managers at healthcare organisations create and track Individual Development Plans (IDPs) for their direct reports. An IDP is a structured document that captures an employee's professional development goals, the concrete actions needed to achieve them, and measurable progress milestones across each quarter of the year.

With IDP Manager you can:

- Maintain a roster of employees and their reporting information.
- Create one or more development plans per employee.
- Break each plan into specific development items with due dates and support requirements.
- Track progress against quarterly milestones (Q1–Q4) for every development item.
- Export polished reports in Excel, Word, or PDF format to share with HR or leadership.

Everything runs locally on your computer. No account or internet connection is required.

---

## Getting Started

### Installing the App (Windows)

1. Download `IDP Manager Setup.exe` from the link provided by your IT department or from the project's Releases page.
2. Double-click the installer file.
3. If a **Windows SmartScreen** warning appears, click **More info**, then **Run anyway**. This message appears because the installer uses a self-signed certificate; the software itself is safe to install.
4. Follow the on-screen setup wizard. Accept the default installation location unless you have a specific reason to change it.
5. Click **Finish** when the wizard completes. A shortcut is placed on your desktop and in the Start menu.

### First Launch

Open IDP Manager from the Start menu or desktop shortcut. On the first launch the application creates a fresh local database; no data is pre-loaded. You will land on the **Dashboard**, which will be empty until you add employees.

---

## Managing Employees

The **Employees** section is the starting point for all IDP work. Every development plan is linked to an employee record.

### Adding an Employee

1. Click **Employees** in the left navigation panel.
2. Click the **Add Employee** button (top-right of the employee list).
3. Fill in the following fields:
   - **Name** — Employee's full name (required).
   - **Manager Name** — The employee's direct manager (required).
   - **Job Title** — The employee's current role.
   - **Department** — The team or department the employee belongs to.
4. Click **Save**. The employee appears in the list immediately.

### Editing an Employee

1. Locate the employee in the list.
2. Click the **Edit** (pencil) icon on the employee's row.
3. Update any fields and click **Save**.

### Deleting an Employee

1. Locate the employee in the list.
2. Click the **Delete** (trash) icon on the employee's row.
3. Confirm the deletion in the prompt that appears.

> **Note:** Deleting an employee also permanently deletes all associated development plans, development items, and milestone records. This action cannot be undone.

---

## Creating an IDP

An Individual Development Plan captures the overall intent and context for an employee's development in a given period.

### Creating a New Plan

1. Navigate to **Employees** and click the employee's name to open their profile.
2. Click **New Development Plan**.
3. Complete the plan form:
   - **Plan Date** — The date the plan is being created or the period it covers.
   - **Status** — The current state of the plan (e.g., *Draft*, *Active*, *Complete*).
   - **Notes** — Any high-level context, goals, or background for the plan.
4. Click **Save Plan**. The plan is created and you are taken to the plan detail view.

### Editing an Existing Plan

1. Open the employee's profile.
2. Click the plan you want to edit from the plan list.
3. Click **Edit Plan**, update the fields, and click **Save Plan**.

---

## Development Items

Development items are the individual actions, training activities, or projects that make up a plan. Each item is tracked independently across quarters.

### What Is a Development Item?

A development item is a discrete, actionable goal within the broader IDP. Examples include completing an online course, shadowing a senior colleague, presenting at a team meeting, or obtaining a certification.

### Adding a Development Item

1. Open a plan in the plan detail view.
2. Click **Add Development Item**.
3. Fill in the fields:
   - **Description** — A clear statement of the goal or activity (required).
   - **Due Date** — The target completion date for this item.
   - **Support Needed** — Any resources, budget, time off, or manager involvement required.
4. Click **Save Item**. The item is added to the plan's item list.

### Reordering Development Items

Development items can be reordered by dragging them within the list:

1. Hover over the drag handle (the grip icon on the left side of an item row).
2. Click and hold, then drag the item to the desired position.
3. Release to drop. The new order is saved automatically.

---

## Quarterly Milestone Tracking

Each development item has four quarterly milestone cells — **Q1**, **Q2**, **Q3**, and **Q4** — displayed as a row in the plan view. Milestones let you record incremental progress and notes at the end of each quarter.

### Editing a Milestone

1. Locate the development item in the plan detail view.
2. Click on any quarterly cell (Q1, Q2, Q3, or Q4) in that item's row. A milestone editor opens.
3. Set the following fields:
   - **Status** — Choose one of:
     - *Not Started* — No work has begun.
     - *In Progress* — Work is underway.
     - *Complete* — The milestone has been achieved.
   - **Percentage** — Enter a number from **0** to **100** reflecting how much of the overall development item is complete at the end of this quarter.
   - **Notes** — Free-form text for observations, blockers, or context about this quarter's progress.
4. Click **Save**. The cell updates to reflect the new status and percentage.

### Reading the Milestone Grid

The milestone grid gives a quick visual summary:

- Cells are colour-coded by status (grey = Not Started, yellow = In Progress, green = Complete).
- The percentage figure is shown inside each cell.
- Hover over a cell to see the full notes in a tooltip.

---

## Exporting Reports

IDP Manager can export a development plan as a formatted report in three file formats.

### Export Formats

| Format | Description |
|---|---|
| **Excel (.xlsx)** | A two-sheet workbook. Sheet 1 ("Plan Overview") contains the employee info, plan date, status, and notes. Sheet 2 ("Development Items") lists every item with its due date, support needed, and all four quarterly milestone statuses, percentages, and notes. |
| **Word (.docx)** | A formal document suitable for HR filing or printing. Includes the employee's details, plan summary, and a table for each development item with its quarterly milestones. |
| **PDF** | A print-ready version of the Word layout, formatted for A4/Letter paper. |

### How to Export

1. Open the plan you want to export.
2. Click the **Export** button in the top-right of the plan detail view.
3. Choose your preferred format: **Excel**, **Word**, or **PDF**.
4. The file is generated and automatically saved to your **Downloads** folder.
5. A confirmation message will show the exact file name and location.

---

## Dashboard

The **Dashboard** is the home screen of IDP Manager. It provides an at-a-glance overview of your team's development activity.

### Summary Cards

Four summary cards appear at the top of the Dashboard:

| Card | What It Shows |
|---|---|
| **Total Employees** | The total number of employee records in the database. |
| **Active Plans** | The number of development plans with an *Active* status. |
| **Plans Due This Quarter** | The number of active plans whose target date falls within the current calendar quarter. |
| **Completion Rate** | The average milestone completion percentage across all active plans. |

### Employee Table

Below the summary cards is a table listing every employee. Each row shows:

- Employee name and job title.
- Department and manager name.
- Number of active development plans.
- A **progress bar** representing the average completion percentage across all quarterly milestones in the employee's active plans.

Click any employee row to jump directly to that employee's profile and plan list.

### Search and Filter

- Use the **search box** at the top of the table to filter employees by name, department, or job title in real time.
- Use the **filter dropdown** to narrow the list by department or by plan status.

---

## Tips

1. **Start with Q1 goals.** When creating a new IDP, add development items with Q1 milestones already filled in so both you and the employee have clear, near-term targets from day one.

2. **Export before every review meeting.** Export the plan to PDF or Word and share it with the employee ahead of your quarterly review conversation. Having a document in hand helps keep the discussion focused.

3. **Use "Support Needed" proactively.** Filling in the "Support Needed" field for each development item makes it easy to identify budget requests or scheduling needs before they become blockers.

4. **Back up your data regularly.** Your data lives in a local SQLite database in your AppData folder. Copy this file to a shared drive or backup location periodically so you don't lose records if your computer is replaced. See the Technical Documentation for the exact file path.
