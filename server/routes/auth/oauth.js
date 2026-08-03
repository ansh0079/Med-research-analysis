'use strict';

const crypto = require('crypto');
const logger = require('../../config/logger');
const {
    OAUTH_STATE_COOKIE,
    cookieBaseOptions,
    getOAuthBaseUrl,
    getOAuthReturnUrl,
    oauthConfigured,
    upsertOAuthUser,
    issueSession,
    timingSafeEqualStrings,
} = require('../../middleware/auth');

function registerAuthOauthRoutes(app, { db, rateLimit }) {
    const authRateLimit = rateLimit ? rateLimit(5, 60) : (req, res, next) => next();

    app.get('/api/auth/oauth/:provider/start', authRateLimit, (req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        if (!['google', 'orcid'].includes(provider)) return res.status(404).json({ error: 'Unsupported OAuth provider' });
        if (!oauthConfigured(provider)) return res.status(503).json({ error: `${provider} OAuth is not configured` });

        const state = crypto.randomBytes(24).toString('hex');
        res.cookie(OAUTH_STATE_COOKIE, state, {
            ...cookieBaseOptions(),
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
        });

        const redirectUri = `${getOAuthBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.ORCID_CLIENT_ID,
            redirect_uri: redirectUri,
            scope: provider === 'google' ? 'openid email profile' : 'openid email profile',
            state,
        });
        const authorizeUrl = provider === 'google'
            ? `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
            : `https://orcid.org/oauth/authorize?${params.toString()}`;
        res.redirect(authorizeUrl);
    });

    app.get('/api/auth/oauth/:provider/callback', authRateLimit, async (req, res) => {
        const provider = String(req.params.provider || '').toLowerCase();
        const { code, state } = req.query;
        const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
        res.clearCookie(OAUTH_STATE_COOKIE, cookieBaseOptions());

        const stateValid = Boolean(code)
            && Boolean(state)
            && Boolean(expectedState)
            && timingSafeEqualStrings(String(state), String(expectedState));

        if (!['google', 'orcid'].includes(provider) || !stateValid) {
            logger.warn({ provider, hasState: Boolean(state), hasExpected: Boolean(expectedState) }, 'OAuth state validation failed');
            return res.redirect(`${getOAuthReturnUrl()}?oauth=error`);
        }

        try {
            const redirectUri = `${getOAuthBaseUrl(req)}/api/auth/oauth/${provider}/callback`;
            const tokenUrl = provider === 'google'
                ? 'https://oauth2.googleapis.com/token'
                : 'https://orcid.org/oauth/token';
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                code: String(code),
                redirect_uri: redirectUri,
                client_id: provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.ORCID_CLIENT_ID,
                client_secret: provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.ORCID_CLIENT_SECRET,
            });
            const tokenRes = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
                body,
            });
            if (!tokenRes.ok) throw new Error(`OAuth token exchange failed: ${tokenRes.status}`);
            const tokenData = await tokenRes.json();

            const userInfoUrl = provider === 'google'
                ? 'https://openidconnect.googleapis.com/v1/userinfo'
                : 'https://orcid.org/oauth/userinfo';
            const userInfoRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
            });
            if (!userInfoRes.ok) throw new Error(`OAuth profile fetch failed: ${userInfoRes.status}`);
            const profileData = await userInfoRes.json();
            const user = await upsertOAuthUser(db, {
                provider,
                providerId: profileData.sub || profileData.orcid || profileData.id,
                email: profileData.email,
                emailVerified: profileData.email_verified !== false,
                name: profileData.name || [profileData.given_name, profileData.family_name].filter(Boolean).join(' '),
            });
            await issueSession(res, user);
            res.redirect(getOAuthReturnUrl());
        } catch (error) {
            logger.error({ err: error, provider }, 'OAuth login error');
            res.redirect(`${getOAuthReturnUrl()}?oauth=error`);
        }
    });
}

module.exports = { registerAuthOauthRoutes };
