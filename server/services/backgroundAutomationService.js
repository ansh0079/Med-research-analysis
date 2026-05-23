'use strict';

const SETTINGS_KEY = 'background_automation';

const DEFAULT_STATE = {
    paused: false,
    pausedAt: null,
    pausedBy: null,
    reason: null,
};

async function getBackgroundAutomationState(db) {
    const stored = await db.getAdminRuntimeSetting?.(SETTINGS_KEY, DEFAULT_STATE) ?? DEFAULT_STATE;
    return {
        ...DEFAULT_STATE,
        ...(stored && typeof stored === 'object' ? stored : {}),
        paused: Boolean(stored?.paused),
    };
}

async function setBackgroundAutomationPaused(db, { paused, userId = null, reason = null } = {}) {
    const now = new Date().toISOString();
    const next = {
        paused: Boolean(paused),
        pausedAt: paused ? now : null,
        pausedBy: paused ? (userId != null ? String(userId) : null) : null,
        reason: paused ? (String(reason || '').slice(0, 240) || null) : null,
    };
    if (db.setAdminRuntimeSetting) {
        await db.setAdminRuntimeSetting(SETTINGS_KEY, next);
    }
    return next;
}

async function isBackgroundAutomationPaused(db) {
    const state = await getBackgroundAutomationState(db);
    return Boolean(state.paused);
}

module.exports = {
    SETTINGS_KEY,
    getBackgroundAutomationState,
    setBackgroundAutomationPaused,
    isBackgroundAutomationPaused,
};
