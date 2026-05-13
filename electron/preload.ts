import { contextBridge, ipcRenderer } from 'electron';
import type { WindowApi } from './types';

const api: WindowApi = {
  employees: {
    getAll: () => ipcRenderer.invoke('employees:getAll'),
    getById: (id) => ipcRenderer.invoke('employees:getById', id),
    create: (data) => ipcRenderer.invoke('employees:create', data),
    update: (id, data) => ipcRenderer.invoke('employees:update', id, data),
    delete: (id) => ipcRenderer.invoke('employees:delete', id),
  },
  plans: {
    getByEmployee: (employeeId) => ipcRenderer.invoke('plans:getByEmployee', employeeId),
    getById: (id) => ipcRenderer.invoke('plans:getById', id),
    create: (data) => ipcRenderer.invoke('plans:create', data),
    update: (id, data) => ipcRenderer.invoke('plans:update', id, data),
    delete: (id) => ipcRenderer.invoke('plans:delete', id),
  },
  items: {
    getByPlan: (planId) => ipcRenderer.invoke('items:getByPlan', planId),
    create: (data) => ipcRenderer.invoke('items:create', data),
    update: (id, data) => ipcRenderer.invoke('items:update', id, data),
    delete: (id) => ipcRenderer.invoke('items:delete', id),
    reorder: (planId, itemIds) => ipcRenderer.invoke('items:reorder', planId, itemIds),
  },
  milestones: {
    getByItem: (itemId) => ipcRenderer.invoke('milestones:getByItem', itemId),
    upsert: (data) => ipcRenderer.invoke('milestones:upsert', data),
  },
  export: {
    toExcel: (planId) => ipcRenderer.invoke('export:toExcel', planId),
    toWord: (planId) => ipcRenderer.invoke('export:toWord', planId),
    toPdf: (planId) => ipcRenderer.invoke('export:toPdf', planId),
  },
  file: {
    save:   (planId, filePath) => ipcRenderer.invoke('file:save', planId, filePath),
    saveAs: (planId)           => ipcRenderer.invoke('file:saveAs', planId),
    open:   ()                 => ipcRenderer.invoke('file:open'),
  },
  import: {
    fromExcel:        () => ipcRenderer.invoke('import:fromExcel'),
    downloadTemplate: () => ipcRenderer.invoke('import:downloadTemplate'),
  },
};

contextBridge.exposeInMainWorld('api', api);
