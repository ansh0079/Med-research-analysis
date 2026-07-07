'use strict';

const EMAIL_ENV_KEYS = [
    'RESEND_API_KEY',
    'SENDGRID_API_KEY',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'EMAIL_SUPPRESSION_LIST',
];

describe('emailService', () => {
    let savedEnv;
    let savedFetch;

    beforeEach(() => {
        savedEnv = {};
        for (const key of EMAIL_ENV_KEYS) {
            savedEnv[key] = process.env[key];
            delete process.env[key];
        }
        savedFetch = global.fetch;
        jest.resetModules();
    });

    afterEach(() => {
        for (const key of EMAIL_ENV_KEYS) {
            if (savedEnv[key] === undefined) delete process.env[key];
            else process.env[key] = savedEnv[key];
        }
        global.fetch = savedFetch;
        jest.restoreAllMocks();
    });

    function load() {
        return require('../../server/services/emailService');
    }

    function mockFetchOk(body = { id: 'msg-1' }, headers = {}) {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => body,
            headers: { get: (name) => headers[name] ?? null },
        });
        global.fetch = fetchMock;
        return fetchMock;
    }

    // ── provider selection ──────────────────────────────────────────────────

    describe('sendEmail() provider priority', () => {
        it('uses Resend when RESEND_API_KEY is set', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            const fetchMock = mockFetchOk({ id: 'resend-123' });
            const { sendEmail } = load();

            const result = await sendEmail({ to: 'a@b.co', subject: 'Hi', html: '<p>Hello</p>' });

            expect(result).toEqual({ success: true, messageId: 'resend-123', suppressedCount: 0 });
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, opts] = fetchMock.mock.calls[0];
            expect(url).toBe('https://api.resend.com/emails');
            expect(opts.headers.Authorization).toBe('Bearer re_test_key');
            const payload = JSON.parse(opts.body);
            expect(payload.to).toEqual(['a@b.co']);
            expect(payload.text).toBe('Hello'); // derived from html when text absent
        });

        it('uses SendGrid when only SENDGRID_API_KEY is set', async () => {
            process.env.SENDGRID_API_KEY = 'sg_test_key';
            const fetchMock = mockFetchOk({}, { 'x-message-id': 'sg-42' });
            const { sendEmail } = load();

            const result = await sendEmail({ to: 'a@b.co', subject: 'Hi', html: '<p>Hello</p>' });

            expect(result.success).toBe(true);
            expect(result.messageId).toBe('sg-42');
            const [url, opts] = fetchMock.mock.calls[0];
            expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
            const payload = JSON.parse(opts.body);
            expect(payload.personalizations[0].to).toEqual([{ email: 'a@b.co' }]);
        });

        it('falls back to console logging when no provider is configured', async () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            global.fetch = jest.fn(); // must not be called
            const { sendEmail } = load();

            const result = await sendEmail({ to: 'a@b.co', subject: 'Hi', html: '<p>x</p>' });

            expect(result).toEqual({ success: true, logged: true, suppressedCount: 0 });
            expect(global.fetch).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalled();
            expect(logSpy).toHaveBeenCalled();
        });

        it('throws when Resend responds non-ok', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status: 422,
                json: async () => ({ message: 'invalid recipient' }),
            });
            const { sendEmail } = load();

            await expect(sendEmail({ to: 'bad', subject: 'Hi', html: '<p>x</p>' }))
                .rejects.toThrow('Resend error 422: invalid recipient');
        });
    });

    // ── SMTP transporter ─────────────────────────────────────────────────────

    describe('getTransporter()', () => {
        it('returns null when SMTP env is incomplete', () => {
            process.env.SMTP_HOST = 'smtp.example.com';
            // no user/pass
            const { getTransporter } = load();
            expect(getTransporter()).toBeNull();
        });

        it('creates a nodemailer transport when SMTP env is complete', () => {
            process.env.SMTP_HOST = 'smtp.example.com';
            process.env.SMTP_PORT = '465';
            process.env.SMTP_USER = 'user';
            process.env.SMTP_PASS = 'pass';
            jest.doMock('nodemailer', () => ({
                createTransport: jest.fn().mockReturnValue({ sendMail: jest.fn() }),
            }));
            const nodemailer = require('nodemailer');
            const { getTransporter } = load();

            const t = getTransporter();
            expect(t).not.toBeNull();
            expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
                host: 'smtp.example.com',
                port: 465,
                secure: true, // port 465 implies TLS
            }));
            // Cached on second call
            getTransporter();
            expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
        });
    });

    // ── suppression list ─────────────────────────────────────────────────────

    describe('suppression list', () => {
        it('skips sending entirely when every recipient is suppressed', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            process.env.EMAIL_SUPPRESSION_LIST = 'Blocked@Example.com';
            global.fetch = jest.fn();
            const { sendEmail } = load();

            const result = await sendEmail({ to: 'blocked@example.com', subject: 'Hi', html: '<p>x</p>' });

            expect(result).toEqual({ success: true, suppressed: true, suppressedCount: 1 });
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('sends only to non-suppressed recipients and reports the count', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            process.env.EMAIL_SUPPRESSION_LIST = 'blocked@example.com';
            const fetchMock = mockFetchOk({ id: 'ok' });
            const { sendEmail } = load();

            const result = await sendEmail({
                to: 'blocked@example.com, ok@example.com',
                subject: 'Hi',
                html: '<p>x</p>',
            });

            expect(result.suppressedCount).toBe(1);
            const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(payload.to).toEqual(['ok@example.com']);
        });
    });

    // ── transactional templates ──────────────────────────────────────────────

    describe('sendVerificationEmail()', () => {
        it('includes the tokenised verification link and default subject', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            const fetchMock = mockFetchOk();
            const { sendVerificationEmail } = load();

            await sendVerificationEmail({
                to: 'new@user.co',
                name: 'Asha',
                token: 'tok123',
                appUrl: 'https://signalmd.co',
            });

            const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(payload.subject).toBe('Verify your Signal MD account');
            expect(payload.html).toContain('https://signalmd.co/verify-email?token=tok123');
        });

        it('HTML-escapes the user-supplied name', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            const fetchMock = mockFetchOk();
            const { sendVerificationEmail } = load();

            await sendVerificationEmail({
                to: 'new@user.co',
                name: '<script>alert(1)</script>',
                token: 't',
                appUrl: 'https://signalmd.co',
            });

            const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(payload.html).not.toContain('<script>alert(1)</script>');
            expect(payload.html).toContain('&lt;script&gt;');
        });
    });

    describe('sendPasswordResetEmail()', () => {
        it('includes the tokenised reset link and 1-hour expiry copy', async () => {
            process.env.RESEND_API_KEY = 're_test_key';
            const fetchMock = mockFetchOk();
            const { sendPasswordResetEmail } = load();

            await sendPasswordResetEmail({
                to: 'user@x.co',
                name: 'Sam',
                token: 'rst456',
                appUrl: 'https://signalmd.co',
            });

            const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
            expect(payload.subject).toBe('Reset your Signal MD password');
            expect(payload.html).toContain('https://signalmd.co/reset-password?token=rst456');
            expect(payload.html).toContain('1 hour');
        });
    });

    describe('buildDigestHtml()', () => {
        it('renders alert sections and escapes topic names', () => {
            const { buildDigestHtml } = load();
            const html = buildDigestHtml({
                userName: 'Asha',
                date: '2026-07-07',
                appUrl: 'https://signalmd.co',
                alertResults: [{
                    alert: { query: 'sepsis & <lactate>' },
                    articles: [{ title: 'Trial <A>', journal: 'NEJM', pubdate: '2026' }],
                }],
                spacedRepData: { dueCount: 3, topTopic: 'Sepsis & shock' },
            });

            expect(html).toContain('2026-07-07');
            expect(html).toContain('3 cards overdue');
            expect(html).toContain('Sepsis &amp; shock');
            expect(html).not.toContain('<lactate>');
        });
    });
});
