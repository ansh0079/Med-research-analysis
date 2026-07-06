'use strict';

const { buildDigestHtml } = require('../../server/services/emailService');

describe('emailService', () => {
    test('buildDigestHtml escapes article titles in alert sections', () => {
        const html = buildDigestHtml({
            userName: 'Dr Smith',
            date: '2026-07-06',
            alertResults: [{
                alert: { query: 'SGLT2' },
                articles: [{ title: 'Trial <b>beta</b>', journal: 'Lancet', pubdate: '2024' }],
            }],
            appUrl: 'https://signalmd.co',
            spacedRepData: null,
        });
        expect(html).toContain('Trial &lt;b&gt;beta&lt;/b&gt;');
        expect(html).toContain('SGLT2');
        expect(html).toContain('https://signalmd.co');
    });
});
