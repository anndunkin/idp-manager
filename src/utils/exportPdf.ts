/**
 * Renderer-side PDF export trigger.
 * The actual export logic runs in the main process via IPC.
 */
export async function exportPlanToPdf(planId: number): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (!window.api) {
    return { success: false, error: 'API not available (not running in Electron)' };
  }
  return window.api.export.toPdf(planId);
}
