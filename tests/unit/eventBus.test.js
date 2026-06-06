const { emit, on } = require('../../server/lib/eventBus');

describe('eventBus', () => {
    test('emit delivers payloads to subscribers', () => {
        const received = [];
        const unsubscribe = on('user.interaction', (payload) => {
            received.push(payload);
        });
        emit('user.interaction', { type: 'paper_view', paperId: 'pmid-1' });
        unsubscribe();
        expect(received).toHaveLength(1);
        expect(received[0].paperId).toBe('pmid-1');
    });
});
