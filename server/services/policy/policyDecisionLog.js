'use strict';

const { findWritePath } = require('./writePathInventory');

const ACTIONS = new Set(['accept', 'reject']);

function normalizeDecision(input = {}) {
    const writer = String(input.writer || '').trim();
    const action = String(input.action || '').trim().toLowerCase();
    const path = findWritePath(writer);
    if (!writer) {
        return { ok: false, error: 'writer_required' };
    }
    if (!ACTIONS.has(action)) {
        return { ok: false, error: 'action_must_be_accept_or_reject' };
    }
    return {
        ok: true,
        decision: {
            writer,
            family: path?.family || input.family || 'unclassified',
            action,
            reason: String(input.reason || '').trim() || null,
            entityType: String(input.entityType || '').trim() || null,
            entityId: String(input.entityId || '').trim() || null,
            conceptId: String(input.conceptId || '').trim() || null,
            payload: input.payload && typeof input.payload === 'object' ? input.payload : null,
        },
    };
}

async function recordPolicyDecision(db, input) {
    const normalized = normalizeDecision(input);
    if (!normalized.ok) return { recorded: false, error: normalized.error };
    if (!db || typeof db.recordPolicyDecision !== 'function') {
        return { recorded: false, error: 'policy_log_unavailable', decision: normalized.decision };
    }
    const row = await db.recordPolicyDecision(normalized.decision);
    return { recorded: true, decision: row || normalized.decision };
}

module.exports = {
    ACTIONS,
    normalizeDecision,
    recordPolicyDecision,
};
