'use strict';

const {
    reconcileConversationHistory,
} = require('../../server/services/agentHelpers');

describe('agentHelpers conversation reconciliation', () => {
    test('prefers persisted server messages and appends only the overlapping client tail', () => {
        const reconciled = reconcileConversationHistory(
            [
                { role: 'user', content: 'Persisted question' },
                { role: 'assistant', content: 'Persisted answer' },
                { role: 'user', content: 'New unsynced question' },
            ],
            {
                messages: [
                    { role: 'user', content: 'Persisted question' },
                    { role: 'assistant', content: 'Persisted answer' },
                ],
            }
        );

        expect(reconciled).toEqual([
            { role: 'user', content: 'Persisted question' },
            { role: 'assistant', content: 'Persisted answer' },
            { role: 'user', content: 'New unsynced question' },
        ]);
    });

    test('does not resurrect stale client history when it cannot be aligned to server history', () => {
        const reconciled = reconcileConversationHistory(
            [
                { role: 'user', content: 'Old client-only question' },
                { role: 'assistant', content: 'Old client-only answer' },
            ],
            {
                messages: [
                    { role: 'user', content: 'Server question' },
                    { role: 'assistant', content: 'Server answer' },
                ],
            }
        );

        expect(reconciled).toEqual([
            { role: 'user', content: 'Server question' },
            { role: 'assistant', content: 'Server answer' },
        ]);
    });

    test('caps reconciled history after deduplication', () => {
        const reconciled = reconcileConversationHistory(
            [
                { role: 'user', content: 'one' },
                { role: 'assistant', content: 'two' },
                { role: 'user', content: 'three' },
            ],
            null,
            { maxMessages: 2 }
        );

        expect(reconciled).toEqual([
            { role: 'assistant', content: 'two' },
            { role: 'user', content: 'three' },
        ]);
    });
});
