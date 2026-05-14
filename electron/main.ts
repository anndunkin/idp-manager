import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import {
  getDatabase,
  employeeGetAll, employeeGetById, employeeCreate, employeeUpdate, employeeDelete,
  planGetByEmployee, planGetById, planCreate, planUpdate, planDelete,
  itemGetByPlan, itemCreate, itemUpdate, itemDelete, itemReorder,
  milestoneGetByItem, milestoneUpsert,
} from './database';
import type {
  EmployeeCreate, EmployeeUpdate,
  PlanCreate, PlanUpdate,
  ItemCreate, ItemUpdate,
  MilestoneUpsert,
  IdpFilePayload,
  FileResult,
  ExcelImportFileResult,
} from './types';
import { IDP_FILE_VERSION } from './types';
import { parseEmployeeFormExcel } from './importExcel';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function logError(msg: string): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'idp-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

function createWindow(): void {
  const win = new BrowserWindow({
    title: "Paul Selby's IDP Tool",
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,          // sandbox:true requires preload outside asar
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f8fafc',
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // app.getAppPath() returns the asar root in production
    // dist/index.html is at the root of the asar alongside electron/dist/
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    logError(`Loading: ${indexPath} (exists: ${fs.existsSync(indexPath)})`);
    win.loadFile(indexPath).catch(err => logError(`loadFile error: ${err}`));
  }

  // Session-level CSP — allow file:// and local assets only, no external network
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' file:; " +
          "script-src 'self' 'unsafe-inline' file:; " +
          "style-src 'self' 'unsafe-inline' file:; " +
          "font-src 'self' file: data:; " +
          "img-src 'self' file: data:; " +
          "connect-src 'self' file:;",
        ],
      },
    });
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      const parsedUrl = new URL(url);
      if (isDev && parsedUrl.origin === 'http://localhost:5173') return;
      if (parsedUrl.protocol === 'file:') return;
    } catch { /* ignore */ }
    event.preventDefault();
    shell.openExternal(url);
  });

  win.webContents.on('render-process-gone', (_e, details) => {
    logError(`render-process-gone: ${JSON.stringify(details)}`);
  });

  win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    logError(`did-fail-load: ${errorCode} ${errorDescription} url=${validatedURL}`);
  });
}

app.whenReady().then(() => {
  getDatabase();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch(err => logError(`app.whenReady error: ${err}`));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('employees:getAll', () => employeeGetAll(getDatabase()));
ipcMain.handle('employees:getById', (_e, id: number) => employeeGetById(getDatabase(), id));
ipcMain.handle('employees:create', (_e, data: EmployeeCreate) => employeeCreate(getDatabase(), data));
ipcMain.handle('employees:update', (_e, id: number, data: EmployeeUpdate) => employeeUpdate(getDatabase(), id, data));
ipcMain.handle('employees:delete', (_e, id: number) => employeeDelete(getDatabase(), id));

ipcMain.handle('plans:getByEmployee', (_e, employeeId: number) => planGetByEmployee(getDatabase(), employeeId));
ipcMain.handle('plans:getById', (_e, id: number) => planGetById(getDatabase(), id));
ipcMain.handle('plans:create', (_e, data: PlanCreate) => planCreate(getDatabase(), data));
ipcMain.handle('plans:update', (_e, id: number, data: PlanUpdate) => planUpdate(getDatabase(), id, data));
ipcMain.handle('plans:delete', (_e, id: number) => planDelete(getDatabase(), id));

ipcMain.handle('items:getByPlan', (_e, planId: number) => itemGetByPlan(getDatabase(), planId));
ipcMain.handle('items:create', (_e, data: ItemCreate) => itemCreate(getDatabase(), data));
ipcMain.handle('items:update', (_e, id: number, data: ItemUpdate) => itemUpdate(getDatabase(), id, data));
ipcMain.handle('items:delete', (_e, id: number) => itemDelete(getDatabase(), id));
ipcMain.handle('items:reorder', (_e, planId: number, itemIds: number[]) => itemReorder(getDatabase(), planId, itemIds));

ipcMain.handle('milestones:getByItem', (_e, itemId: number) => milestoneGetByItem(getDatabase(), itemId));
ipcMain.handle('milestones:upsert', (_e, data: MilestoneUpsert) => milestoneUpsert(getDatabase(), data));

// ─── Export Handlers ──────────────────────────────────────────────────────────

function saveExportFile(
  defaultName: string,
  buffer: Buffer
): { success: boolean; filePath?: string; error?: string } {
  // Save directly to the user's Downloads folder and open immediately —
  // no save dialog shown.
  const downloadsDir = app.getPath('downloads');
  // Ensure a unique filename if one already exists
  let filePath = path.join(downloadsDir, defaultName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(defaultName);
    const base = path.basename(defaultName, ext);
    let n = 1;
    while (fs.existsSync(filePath)) {
      filePath = path.join(downloadsDir, `${base} (${n})${ext}`);
      n++;
    }
  }
  fs.writeFileSync(filePath, buffer);
  shell.openPath(filePath);
  return { success: true, filePath };
}

ipcMain.handle('export:toExcel', async (_event, planId: number) => {
  try {
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToExcelBuffer } = await import('./exportMain');
    const buffer = await exportToExcelBuffer(planData);
    const name = `IDP_${planData.employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(`${name}.xlsx`, buffer);
  } catch (err) { return { success: false, error: String(err) }; }
});

ipcMain.handle('export:toWord', async (_event, planId: number) => {
  try {
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToWordBuffer } = await import('./exportMain');
    const buffer = await exportToWordBuffer(planData);
    const name = `IDP_${planData.employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(`${name}.docx`, buffer);
  } catch (err) { return { success: false, error: String(err) }; }
});

ipcMain.handle('export:toPdf', async (_event, planId: number) => {
  try {
    const planData = planGetById(getDatabase(), planId);
    if (!planData) throw new Error('Plan not found');
    const { exportToPdfBuffer } = await import('./exportMain');
    const buffer = await exportToPdfBuffer(planData);
    const name = `IDP_${planData.employee?.name ?? 'Plan'}_${planData.plan_year}`.replace(/\s+/g, '_');
    return saveExportFile(`${name}.pdf`, buffer);
  } catch (err) { return { success: false, error: String(err) }; }
});

// ─── File Management Handlers ────────────────────────────────────────────────────────────

/** Build a portable IdpFilePayload snapshot from a planId */
function buildFilePayload(planId: number): IdpFilePayload {
  const db = getDatabase();
  const plan = db.prepare(
    `SELECT * FROM development_plans WHERE id = ?`
  ).get(planId) as { id: number; employee_id: number; plan_date: string; plan_year: number; status: string; notes: string; milestone_count: number };
  if (!plan) throw new Error('Plan not found');

  const employee = db.prepare(
    `SELECT * FROM employees WHERE id = ?`
  ).get(plan.employee_id) as { id: number; name: string; manager_name: string; job_title: string; department: string };
  if (!employee) throw new Error('Employee not found');

  const items = db.prepare(
    `SELECT * FROM development_items WHERE plan_id = ? ORDER BY sort_order`
  ).all(planId) as Array<{ id: number; plan_id: number; item_description: string; due_date: string; support_needed: string; cost_estimate: string; sort_order: number }>;

  const fileItems = items.map(item => {
    const milestones = (db.prepare(
      `SELECT quarter, status, percent_complete, notes FROM quarterly_milestones WHERE item_id = ?`
    ).all(item.id) as Array<{ quarter: number; status: string; percent_complete: number; notes: string }>)
      .map(m => ({ ...m, quarter: m.quarter as 1|2|3|4, status: m.status as import('./types').MilestoneStatus }));
    return {
      item_description: item.item_description,
      due_date: item.due_date,
      support_needed: item.support_needed,
      cost_estimate: item.cost_estimate ?? '',
      sort_order: item.sort_order,
      milestones,
    };
  });

  return {
    version: IDP_FILE_VERSION,
    savedAt: new Date().toISOString(),
    employee: {
      name: employee.name,
      manager_name: employee.manager_name,
      job_title: employee.job_title,
      department: employee.department,
    },
    plan: {
      plan_date: plan.plan_date,
      plan_year: plan.plan_year,
      status: plan.status as 'Active' | 'Inactive' | 'Complete',
      notes: plan.notes,
      milestone_count: plan.milestone_count ?? 4,
    },
    items: fileItems,
  };
}

/** Write payload JSON to a path the user chose (or chose previously) */
function writeIdpFile(filePath: string, payload: IdpFilePayload): FileResult {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { success: true, filePath, payload };
}

/** Import an IdpFilePayload into the DB; returns the new planId */
function importFilePayload(payload: IdpFilePayload): number {
  const db = getDatabase();

  // Upsert employee — match by name + manager_name
  let emp = db.prepare(
    `SELECT id FROM employees WHERE name = ? AND manager_name = ?`
  ).get(payload.employee.name, payload.employee.manager_name) as { id: number } | undefined;

  if (!emp) {
    const result = db.prepare(
      `INSERT INTO employees (name, manager_name, job_title, department)
       VALUES (?, ?, ?, ?)`
    ).run(
      payload.employee.name,
      payload.employee.manager_name,
      payload.employee.job_title ?? '',
      payload.employee.department ?? ''
    );
    emp = { id: Number(result.lastInsertRowid) };
  } else {
    db.prepare(
      `UPDATE employees SET job_title = ?, department = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(payload.employee.job_title ?? '', payload.employee.department ?? '', emp.id);
  }

  // Always create a new plan (a file open is a new version / copy)
  const planResult = db.prepare(
    `INSERT INTO development_plans (employee_id, plan_date, plan_year, status, notes, milestone_count)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    emp.id,
    payload.plan.plan_date,
    payload.plan.plan_year,
    payload.plan.status,
    payload.plan.notes ?? '',
    payload.plan.milestone_count ?? 4
  );
  const planId = Number(planResult.lastInsertRowid);

  for (const item of payload.items) {
    const itemResult = db.prepare(
      `INSERT INTO development_items (plan_id, item_description, due_date, support_needed, cost_estimate, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(planId, item.item_description, item.due_date ?? '', item.support_needed ?? '', (item as any).cost_estimate ?? '', item.sort_order ?? 0);
    const itemId = Number(itemResult.lastInsertRowid);

    for (const m of item.milestones ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO quarterly_milestones (item_id, quarter, status, percent_complete, notes)
         VALUES (?, ?, ?, ?, ?)`
      ).run(itemId, m.quarter, m.status ?? 'Not Started', m.percent_complete ?? 0, m.notes ?? '');
    }
  }

  return planId;
}

// file:save — save to known path or fall back to dialog
ipcMain.handle('file:save', async (_event, planId: number, filePath?: string): Promise<FileResult> => {
  try {
    const payload = buildFilePayload(planId);
    if (filePath && fs.existsSync(path.dirname(filePath))) {
      return writeIdpFile(filePath, payload);
    }
    // No known path — show save dialog
    const win = BrowserWindow.getAllWindows()[0];
    const defaultName = `IDP_${payload.employee.name}_${payload.plan.plan_year}`.replace(/\s+/g, '_') + '.idp';
    const { canceled, filePath: chosen } = await dialog.showSaveDialog(win, {
      title: 'Save IDP File',
      defaultPath: defaultName,
      filters: [{ name: 'IDP Files', extensions: ['idp'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (canceled || !chosen) return { success: false };
    return writeIdpFile(chosen, payload);
  } catch (err) { return { success: false, error: String(err) }; }
});

// file:saveAs — always show dialog
ipcMain.handle('file:saveAs', async (_event, planId: number): Promise<FileResult> => {
  try {
    const payload = buildFilePayload(planId);
    const win = BrowserWindow.getAllWindows()[0];
    const defaultName = `IDP_${payload.employee.name}_${payload.plan.plan_year}`.replace(/\s+/g, '_') + '.idp';
    const { canceled, filePath: chosen } = await dialog.showSaveDialog(win, {
      title: 'Save IDP File As…',
      defaultPath: defaultName,
      filters: [{ name: 'IDP Files', extensions: ['idp'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (canceled || !chosen) return { success: false };
    return writeIdpFile(chosen, payload);
  } catch (err) { return { success: false, error: String(err) }; }
});

// import:fromExcel — show open dialog for .xlsx employee form; parse and import
ipcMain.handle('import:fromExcel', async (): Promise<ExcelImportFileResult> => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Employee Input Form',
      filters: [
        { name: 'Excel Workbooks', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };

    const result = await parseEmployeeFormExcel(filePaths[0]);
    if (!result.success || !result.payload) {
      return { success: false, filePath: filePaths[0], error: result.error };
    }

    const planId = importFilePayload(result.payload);
    return { success: true, filePath: filePaths[0], planId };
  } catch (err) { return { success: false, error: String(err) }; }
});

// import:downloadTemplate — generate and save the blank form to Downloads
ipcMain.handle('import:downloadTemplate', async (): Promise<{ success: boolean; filePath?: string; error?: string }> => {
  try {
    // Dynamically require the generator script (CJS, not bundled by Vite)
    // In production the script is placed outside the asar via extraResources:
    //   resources/scripts/generateFormTemplate.js
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'scripts', 'generateFormTemplate.js')
      : path.join(__dirname, '..', '..', 'scripts', 'generateFormTemplate.js');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { generateBuffer } = require(scriptPath) as { generateBuffer: () => Promise<Buffer> };
    const buffer = await generateBuffer();
    return saveExportFile('IDP_Employee_Input_Form.xlsx', buffer);
  } catch (err) { return { success: false, error: String(err) }; }
});

// file:open — show open dialog, import payload, navigate to new plan
ipcMain.handle('file:open', async (): Promise<FileResult & { planId?: number }> => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Open IDP File',
      filters: [{ name: 'IDP Files', extensions: ['idp'] }, { name: 'All Files', extensions: ['*'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { success: false };
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const payload: IdpFilePayload = JSON.parse(raw);
    if (!payload.version || !payload.employee || !payload.plan) {
      return { success: false, error: 'Invalid or unrecognised .idp file.' };
    }
    const planId = importFilePayload(payload);
    return { success: true, filePath: filePaths[0], payload, planId };
  } catch (err) { return { success: false, error: String(err) }; }
});
