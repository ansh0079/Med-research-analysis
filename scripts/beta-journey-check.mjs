#!/usr/bin/env node
/**
 * Live beta journey check — exercises the real deployed product the way a pilot
 * clinician would, and verifies one account cannot see another account's data.
 *
 * Journey per account:
 *   CSRF token -> disposable inbox (mail.tm) -> register (invite) -> verification
 *   email -> verify -> login -> /me -> search -> save article -> list saved ->
 *   history -> forgot password -> reset email -> reset -> login with new password
 *   -> logout
 *
 * Isolation: account B must not see account A's saved articles or history, and
 * must not reach admin endpoints.
 *
 * Usage:
 *   node scripts/beta-journey-check.mjs --base https://signalmd.co --invite CODE1 [--invite CODE2]
 *
 * One invite code is enough when its max_uses >= 2. Test mailboxes are disposable
 * (mail.tm); the accounts created are real production accounts named
 * "Beta Journey Probe" so they are easy to find and delete afterwards.
 */

const args = process.argv.slice(2);
function argValue(name) {
    const out = [];
    for (let i = 0; i < args.length; i++) {
        if (args[i] === `--${name}` && args[i + 1]) out.push(args[i + 1]);
        else if (args[i].startsWith(`--${name}=`)) out.push(args[i].split('=').slice(1).join('='));
    }
    return out;
}
const BASE = (argValue('base')[0] || 'https://signalmd.co').replace(/\/+$/, '');
const INVITES = argValue('invite');
const MAIL_API = 'https://api.mail.tm';
const EMAIL_POLL_MS = 150000;
const EMAIL_POLL_INTERVAL_MS = 5000;

if (!INVITES.length) {
    console.error('Usage: node scripts/beta-journey-check.mjs --base https://signalmd.co --invite CODE [--invite CODE2]');
    process.exit(2);
}

const results = [];
function record(step, ok, detail = '') {
    results.push({ step, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}
function section(title) { console.log(`\n== ${title} ==`); }

function randomHex(bytes = 8) {
    return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Minimal cookie jar + CSRF-aware client bound to one base URL. */
function makeClient() {
    const cookies = new Map();
    let csrfToken = null;
    // The server binds CSRF tokens to req.sessionId and mints a fresh one per request when the
    // header is absent, so - like the real frontend - we mint one id and send it consistently.
    const sessionId = crypto.randomUUID();
    return {
        get csrf() { return csrfToken; },
        async request(method, path, body, extraHeaders = {}) {
            const headers = { Accept: 'application/json', 'X-Session-Id': sessionId, ...extraHeaders };
            if (body !== undefined) headers['Content-Type'] = 'application/json';
            if (cookies.size) headers.Cookie = [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
            if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['x-csrf-token'] = csrfToken;
            const res = await fetch(`${BASE}${path}`, {
                method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual',
            });
            const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
            for (const sc of setCookies) {
                const [pair] = sc.split(';');
                const eq = pair.indexOf('=');
                if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
            }
            let json = null;
            const text = await res.text();
            try { json = JSON.parse(text); } catch { /* html or empty */ }
            return { status: res.status, json, text };
        },
        async fetchCsrf() {
            const res = await this.request('GET', '/api/csrf-token');
            if (res.status === 200 && res.json?.csrfToken) { csrfToken = res.json.csrfToken; return true; }
            return false;
        },
    };
}

/** Disposable inbox via mail.tm public API. */
async function makeInbox() {
    const domains = await (await fetch(`${MAIL_API}/domains`)).json();
    const domain = domains['hydra:member']?.find((d) => d.isActive)?.domain;
    if (!domain) throw new Error('mail.tm: no active domain');
    // mail.tm's active domains reject some local parts (hyphens, "beta*" names),
    // so use a natural-looking name and retry with a fresh suffix on 422.
    let create = null;
    let address = null;
    const password = `Mp!${randomHex(12)}`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        address = `mdjourney${Math.floor(100 + Math.random() * 900)}${randomHex(2)}@${domain}`;
        create = await fetch(`${MAIL_API}/accounts`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, password }),
        });
        if (create.ok) break;
        if (create.status !== 422) throw new Error(`mail.tm account create failed: HTTP ${create.status}`);
        await new Promise((r) => setTimeout(r, 3000));
    }
    if (!create || !create.ok) throw new Error(`mail.tm account create failed: HTTP ${create ? create.status : 'no-attempt'}`);
    const tokenRes = await fetch(`${MAIL_API}/token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password }),
    });
    if (!tokenRes.ok) throw new Error(`mail.tm token failed: HTTP ${tokenRes.status}`);
    const { token } = await tokenRes.json();
    return { address, token };
}

async function waitForEmail(inbox, { subjectIncludes, since }) {
    const deadline = Date.now() + EMAIL_POLL_MS;
    while (Date.now() < deadline) {
        const list = await (await fetch(`${MAIL_API}/messages`, {
            headers: { Authorization: `Bearer ${inbox.token}` },
        })).json();
        for (const msg of list['hydra:member'] || []) {
            if (new Date(msg.createdAt) < since) continue;
            if (subjectIncludes && !String(msg.subject || '').toLowerCase().includes(subjectIncludes.toLowerCase())) continue;
            const full = await (await fetch(`${MAIL_API}/messages/${msg.id}`, {
                headers: { Authorization: `Bearer ${inbox.token}` },
            })).json();
            const text = `${full.subject || ''}\n${full.text || ''}\n${(full.html || []).join('\n')}`;
            const match = text.match(/[?&]token=([0-9a-f]{64})/);
            return { subject: full.subject, token: match ? match[1] : null, receivedAt: msg.createdAt };
        }
        await new Promise((r) => setTimeout(r, EMAIL_POLL_INTERVAL_MS));
    }
    return null;
}

const APP_PASSWORD = `Bp!${randomHex(12)}a`;
const APP_PASSWORD_2 = `Bp!${randomHex(12)}b`;

async function runAccountJourney(label, inviteCode) {
    section(`${label}: register -> verify -> login -> use -> reset -> logout`);
    const client = makeClient();
    const ctx = { label };

    if (!(await client.fetchCsrf())) { record(`${label} CSRF token`, false, 'GET /api/csrf-token failed'); return ctx; }
    record(`${label} CSRF token`, true);

    let inbox;
    try { inbox = await makeInbox(); } catch (err) { record(`${label} disposable inbox`, false, err.message); return ctx; }
    ctx.email = inbox.address;
    record(`${label} disposable inbox`, true, inbox.address);

    const registeredAt = new Date(Date.now() - 10000);
    const reg = await client.request('POST', '/api/auth/register', {
        name: `Beta Journey Probe ${label} (automated, safe to delete)`,
        email: inbox.address, password: APP_PASSWORD, inviteCode,
    });
    if (reg.status !== 201) { record(`${label} register`, false, `HTTP ${reg.status}: ${reg.json?.error || reg.text.slice(0, 120)}`); return ctx; }
    record(`${label} register`, true, `user ${reg.json?.user?.id}`);
    ctx.userId = reg.json?.user?.id;

    const verification = await waitForEmail(inbox, { subjectIncludes: 'verif', since: registeredAt });
    if (!verification) {
        record(`${label} verification email delivered`, false, `nothing in inbox within ${EMAIL_POLL_MS / 1000}s — check email provider config on the server`);
        return ctx;
    }
    if (!verification.token) { record(`${label} verification email delivered`, false, `email arrived ("${verification.subject}") but no token link found`); return ctx; }
    record(`${label} verification email delivered`, true, `"${verification.subject}"`);

    const verify = await client.request('POST', '/api/auth/verify-email', { token: verification.token });
    record(`${label} verify email`, verify.status === 200 && verify.json?.user?.emailVerified === true,
        verify.status === 200 ? '' : `HTTP ${verify.status}: ${verify.json?.error || ''}`);

    const login = await client.request('POST', '/api/auth/login', { email: inbox.address, password: APP_PASSWORD });
    record(`${label} login`, login.status === 200, login.status === 200 ? '' : `HTTP ${login.status}: ${login.json?.error || ''}`);

    const me = await client.request('GET', '/api/auth/me');
    const meOk = me.status === 200 && (me.json?.user?.email || me.json?.email) === inbox.address;
    record(`${label} /api/auth/me`, meOk, me.status === 200 ? `plan ${me.json?.user?.subscriptionPlan || me.json?.subscriptionPlan}` : `HTTP ${me.status}`);

    const search = await client.request('GET', `/api/search?q=${encodeURIComponent('sepsis fluid resuscitation')}`);
    const articles = search.json?.articles || search.json?.results || [];
    record(`${label} authenticated search`, search.status === 200 && articles.length > 0,
        search.status === 200 ? `${articles.length} results` : `HTTP ${search.status}`);

    if (articles.length) {
        const a = articles[0];
        ctx.savedUid = a.uid || a.id;
        const save = await client.request('POST', '/api/user/save', { article: a });
        record(`${label} save article`, save.status === 200 || save.status === 201,
            save.status < 300 ? `uid ${ctx.savedUid}` : `HTTP ${save.status}: ${save.json?.error || save.text.slice(0, 100)}`);
        const saved = await client.request('GET', '/api/user/saved');
        const savedList = saved.json?.articles || saved.json?.saved || [];
        ctx.savedCount = savedList.length;
        record(`${label} saved list contains the article`, saved.status === 200 && savedList.length > 0,
            saved.status === 200 ? `${savedList.length} saved` : `HTTP ${saved.status}`);
    }

    const history = await client.request('GET', '/api/user/history');
    record(`${label} history recorded`, history.status === 200, history.status === 200 ? '' : `HTTP ${history.status}`);

    const resetAt = new Date(Date.now() - 5000);
    const forgot = await client.request('POST', '/api/auth/forgot-password', { email: inbox.address });
    if (forgot.status !== 200) { record(`${label} forgot-password accepted`, false, `HTTP ${forgot.status}`); }
    else {
        record(`${label} forgot-password accepted`, true);
        const resetMail = await waitForEmail(inbox, { subjectIncludes: 'reset', since: resetAt });
        if (!resetMail?.token) {
            record(`${label} reset email delivered`, false, resetMail ? `email arrived ("${resetMail.subject}") but no token` : `no reset email within ${EMAIL_POLL_MS / 1000}s`);
        } else {
            record(`${label} reset email delivered`, true, `"${resetMail.subject}"`);
            const reset = await client.request('POST', '/api/auth/reset-password', { token: resetMail.token, password: APP_PASSWORD_2 });
            record(`${label} reset password`, reset.status === 200, reset.status === 200 ? '' : `HTTP ${reset.status}: ${reset.json?.error || ''}`);
            const relogin = await client.request('POST', '/api/auth/login', { email: inbox.address, password: APP_PASSWORD_2 });
            record(`${label} login with new password`, relogin.status === 200, relogin.status === 200 ? '' : `HTTP ${relogin.status}`);
        }
    }

    const logout = await client.request('POST', '/api/auth/logout', {});
    record(`${label} logout`, logout.status === 200, logout.status === 200 ? '' : `HTTP ${logout.status}`);
    const meAfter = await client.request('GET', '/api/auth/me');
    record(`${label} session invalid after logout`, meAfter.status === 401, `HTTP ${meAfter.status}`);
    return ctx;
}

async function runIsolation(a, b, inviteForB) {
    section('Cross-account isolation (B must not see A)');
    const clientB = makeClient();
    await clientB.fetchCsrf();
    let inboxB;
    try { inboxB = await makeInbox(); } catch (err) { record('B inbox', false, err.message); return; }
    const regB = await clientB.request('POST', '/api/auth/register', {
        name: 'Beta Journey Probe B (automated, safe to delete)',
        email: inboxB.address, password: APP_PASSWORD, inviteCode: inviteForB,
    });
    if (regB.status !== 201) { record('B register', false, `HTTP ${regB.status}: ${regB.json?.error || ''}`); return; }
    record('B register (second invite use)', true);

    const savedB = await clientB.request('GET', '/api/user/saved');
    const listB = savedB.json?.articles || savedB.json?.saved || [];
    const seesA = a.savedUid && listB.some((x) => (x.uid || x.id) === a.savedUid);
    record('B cannot see A\'s saved articles', savedB.status === 200 && !seesA,
        savedB.status === 200 ? `B sees ${listB.length} saved (A saved ${a.savedCount ?? '?'})` : `HTTP ${savedB.status}`);

    const historyB = await clientB.request('GET', '/api/user/history');
    const histB = historyB.json?.history || historyB.json?.items || [];
    record('B history contains only B\'s activity', historyB.status === 200 && histB.length === 0,
        historyB.status === 200 ? `${histB.length} entries` : `HTTP ${historyB.status}`);

    const adminAttempt = await clientB.request('POST', '/api/admin/invite-codes', { label: 'probe', maxUses: 1 });
    record('B cannot reach admin invite creation', adminAttempt.status === 403, `HTTP ${adminAttempt.status}`);

    const meB = await clientB.request('GET', '/api/auth/me');
    record('B identity is itself', meB.status === 200 && (meB.json?.user?.email || meB.json?.email) === inboxB.address);
    await clientB.request('POST', '/api/auth/logout', {});
}

(async () => {
    console.log(`Beta journey check against ${BASE}`);
    console.log(`Invites: ${INVITES.length} code(s); emails via mail.tm disposable inboxes.\n`);

    const a = await runAccountJourney('A', INVITES[0]);
    if (a.userId) {
        await runIsolation(a, null, INVITES[1] || INVITES[0]);
    } else {
        console.log('\nSkipping isolation: account A could not be created.');
    }

    section('Summary');
    const failed = results.filter((r) => !r.ok);
    console.log(`${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) {
        for (const f of failed) console.log(`  FAILED: ${f.step} — ${f.detail}`);
        process.exit(1);
    }
})().catch((err) => { console.error('Journey check crashed:', err); process.exit(1); });
