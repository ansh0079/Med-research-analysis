export const WORKFLOW_CONTEXT_KEY = 'med_shift_workflow';

export function getWorkflowContext(): Record<string, unknown> {
  try {
    return JSON.parse(sessionStorage.getItem(WORKFLOW_CONTEXT_KEY) || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function saveWorkflowContext(update: Record<string, unknown>): void {
  try {
    sessionStorage.setItem(WORKFLOW_CONTEXT_KEY, JSON.stringify({
      ...getWorkflowContext(),
      ...update,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Keep cross-page clinical flows working even if session storage is unavailable.
  }
}
