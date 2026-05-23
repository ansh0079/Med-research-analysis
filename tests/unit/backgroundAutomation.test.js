'use strict';

const {
  getBackgroundAutomationState,
  setBackgroundAutomationPaused,
  isBackgroundAutomationPaused,
} = require('../../server/services/backgroundAutomationService');

describe('backgroundAutomationService', () => {
  test('persists paused state', async () => {
    const store = {};
    const db = {
      getAdminRuntimeSetting: async (key, fallback) => store[key] ?? fallback,
      setAdminRuntimeSetting: async (key, value) => {
        store[key] = value;
        return value;
      },
    };
    await setBackgroundAutomationPaused(db, { paused: true, userId: 'admin-1', reason: 'maintenance' });
    expect(await isBackgroundAutomationPaused(db)).toBe(true);
    const state = await getBackgroundAutomationState(db);
    expect(state.pausedBy).toBe('admin-1');
    await setBackgroundAutomationPaused(db, { paused: false, userId: 'admin-1' });
    expect(await isBackgroundAutomationPaused(db)).toBe(false);
  });
});
