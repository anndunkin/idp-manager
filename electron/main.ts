import { app, BrowserWindow, ipcMain, shell } from 'electron';
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
} from './types';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function logError(msg: string): void {
  try {
    const logPath = path.join(app.getPath('userData'), 'idp-error.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}

function createWindow(): void {
  const win = new BrowserWindow({
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
