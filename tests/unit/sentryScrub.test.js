'use strict';

const { scrubSentryEvent } = require('../../server/lib/sentryScrub');

describe('scrubSentryEvent', () => {
    test('drops search text, prompts, and the query string', () => {
        const event = scrubSentryEvent({
            request: {
                method: 'GET',
                url: 'https://signalmd.co/search?q=acute+kidney+injury',
                data: { prompt: 'write a synopsis of this abstract' },
                cookies: { refresh: 'secret' },
                headers: { authorization: 'Bearer token' },
            },
            user: { id: 'u1', email: 'clinician@hospital.example' },
            extra: { topic: 'AKI', route: '/api/search' },
            breadcrumbs: [{ message: 'search', data: { query: 'AKI steroids', status: 500 } }],
            exception: { values: [{ type: 'Error', value: 'synthesis failed' }] },
        });

        expect(event.request).toEqual({
            method: 'GET',
            url: 'https://signalmd.co/search',
        });
        expect(event.user).toEqual({ id: 'u1' });
        expect(event.extra.topic).toBe('[redacted]');
        expect(event.extra.route).toBe('/api/search');
        expect(event.breadcrumbs[0].data.query).toBe('[redacted]');
        expect(event.breadcrumbs[0].data.status).toBe(500);
        expect(event.exception.values[0].type).toBe('Error');
    });
});
