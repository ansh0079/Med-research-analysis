'use strict';

describe('beta access mode', () => {
    const originalBetaMode = process.env.BETA_MODE;
    const originalOpenAccess = process.env.BETA_OPEN_ACCESS;

    afterEach(() => {
        if (originalBetaMode === undefined) delete process.env.BETA_MODE;
        else process.env.BETA_MODE = originalBetaMode;
        if (originalOpenAccess === undefined) delete process.env.BETA_OPEN_ACCESS;
        else process.env.BETA_OPEN_ACCESS = originalOpenAccess;
        jest.resetModules();
    });

    function loadMiddleware(openAccess) {
        process.env.BETA_MODE = 'true';
        process.env.BETA_OPEN_ACCESS = String(openAccess);
        jest.resetModules();
        return require('../../server/lib/auth/middleware');
    }

    test('an invitation-only beta does not admit an anonymous session', async () => {
        const { requireAuthOrBeta, BETA_OPEN_ACCESS } = loadMiddleware(false);
        const next = jest.fn();
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

        await requireAuthOrBeta({ sessionId: 'anonymous-session', headers: {}, cookies: {} }, res, next);

        expect(BETA_OPEN_ACCESS).toBe(false);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('anonymous access requires the explicit open-access switch', async () => {
        const { requireAuthOrBeta, BETA_OPEN_ACCESS } = loadMiddleware(true);
        const req = { sessionId: 'anonymous-session', headers: {}, cookies: {} };
        const next = jest.fn();
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };

        await requireAuthOrBeta(req, res, next);

        expect(BETA_OPEN_ACCESS).toBe(true);
        expect(req.betaAnonymous).toBe(true);
        expect(next).toHaveBeenCalled();
    });
});
