'use strict';

const {
    signSessionId,
    verifySignedSessionId,
    resolveIncomingSessionId,
    canWriteLearningSignal,
} = require('../../server/lib/sessionIdentity');

describe('sessionIdentity', () => {
    const secret = 'unit-test-session-secret-32chars!!';
    const uuid = '2c1a0f6e-1d2b-4c3a-9e8d-7f6a5b4c3d2e';

    test('signs and verifies a session id', () => {
        const signed = signSessionId(uuid, secret);
        expect(signed).toMatch(new RegExp(`^${uuid}\\.`));
        expect(verifySignedSessionId(signed, secret)).toBe(uuid);
        expect(verifySignedSessionId(`${uuid}.tampered`, secret)).toBeNull();
    });

    test('production ignores client headers and issues a server session', () => {
        const resolved = resolveIncomingSessionId({
            headerValue: 'attacker-chosen',
            signedCookieValue: '',
            isProduction: true,
            randomUuid: () => uuid,
        });
        expect(resolved).toEqual({ sessionId: uuid, signed: true, source: 'generated' });
    });

    test('production reuses a verified signed cookie', () => {
        const signed = signSessionId(uuid, secret);
        const previous = process.env.SESSION_SECRET;
        process.env.SESSION_SECRET = secret;
        try {
            const resolved = resolveIncomingSessionId({
                headerValue: 'ignored',
                signedCookieValue: signed,
                isProduction: true,
            });
            expect(resolved).toEqual({ sessionId: uuid, signed: true, source: 'cookie' });
        } finally {
            if (previous === undefined) delete process.env.SESSION_SECRET;
            else process.env.SESSION_SECRET = previous;
        }
    });

    test('learning writes require auth or a signed session in production', () => {
        expect(canWriteLearningSignal({}, { nodeEnv: 'production' }).ok).toBe(false);
        expect(canWriteLearningSignal({ sessionId: 'sess' }, { nodeEnv: 'production' }).ok).toBe(false);
        expect(canWriteLearningSignal({ sessionId: uuid, signedSession: true }, { nodeEnv: 'production' }).ok).toBe(true);
        expect(canWriteLearningSignal({ user: { id: 'u1' } }, { nodeEnv: 'production' }).ok).toBe(true);
        expect(canWriteLearningSignal({ sessionId: 'dev-sess' }, { nodeEnv: 'test' }).ok).toBe(true);
    });
});
