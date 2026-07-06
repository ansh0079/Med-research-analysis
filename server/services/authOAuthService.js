'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function getOAuthBaseUrl(req) {
    return process.env.API_URL || `${req.protocol}://${req.get('host')}`;
}

function getOAuthReturnUrl() {
    return process.env.OAUTH_SUCCESS_REDIRECT || process.env.CLIENT_URL || process.env.APP_URL || '/';
}

function oauthConfigured(provider) {
    if (provider === 'google') return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    if (provider === 'orcid') return Boolean(process.env.ORCID_CLIENT_ID && process.env.ORCID_CLIENT_SECRET);
    return false;
}

async function upsertOAuthUser(database, profile) {
    const email = String(profile.email || '').toLowerCase().trim();
    if (!email) {
        const err = new Error('OAuth provider did not return a verified email address');
        err.status = 400;
        throw err;
    }

    const existing = await database.getUserByEmail(email);
    if (existing) {
        await database.updateUser(existing.id, {
            name: existing.name || profile.name || email,
            email_verified: profile.emailVerified ? 1 : existing.email_verified,
            last_login: new Date().toISOString(),
        });
        return {
            ...existing,
            name: existing.name || profile.name || email,
            email_verified: profile.emailVerified ? 1 : existing.email_verified,
        };
    }

    const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const user = {
        id: crypto.randomUUID(),
        name: profile.name || email,
        email,
        password: hashedPassword,
        role: 'user',
        preferences: JSON.stringify({ oauthProvider: profile.provider, oauthSubject: profile.providerId || null }),
        email_verified: profile.emailVerified ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
    };
    await database.createUser(user);
    return user;
}

module.exports = {
    getOAuthBaseUrl,
    getOAuthReturnUrl,
    oauthConfigured,
    upsertOAuthUser,
};
