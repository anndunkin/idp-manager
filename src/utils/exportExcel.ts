/**
 * Renderer-side Excel export trigger.
 * The actual export logic runs in the main process via IPC.
 */
export async function exportPlanToExcel(planId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (!window.api) {
    return { success: false, error: 'API not available (not running in Electron)' };
  }
  return window.api.export.toExcel(planId);
}
