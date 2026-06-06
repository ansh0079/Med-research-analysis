const { emit } = require('../../server/lib/eventBus');
const {
    buildInteractionPayload,
    trackUserInteraction,
    registerInteractionHandlers,
} = require('../../server/services/userInteractionService');

describe('userInteractionService', () => {
    test('buildInteractionPayload normalizes fields', () => {
        const payload = buildInteractionPayload({
            type: 'paper_view',
            userId: 'u1',
            paperId: 'pmid-99',
            duration: 12000,
            sectionsRead: ['abstract'],
            position: 2,
        });
        expect(payload.paperId).toBe('pmid-99');
        expect(payload.sectionsRead).toEqual(['abstract']);
        expect(payload.position).toBe(2);
    });

    test('trackUserInteraction emits and persists', async () => {
        const events = [];
        const off = require('../../server/lib/eventBus').on('user.interaction', (p) => events.push(p));
        const db = {
            recordUserInteraction: jest.fn().mockResolvedValue(null),
            recordLearningEvent: jest.fn().mockResolvedValue({ id: 1 }),
        };
        await trackUserInteraction(db, {
            type: 'paper_click',
            rawType: 'click',
            userId: 'user-1',
            sessionId: 'sess-1',
            paperId: 'pmid-1',
            searchId: 42,
            duration: 5000,
        });
        off();
        expect(events).toHaveLength(1);
        expect(db.recordUserInteraction).toHaveBeenCalled();
        expect(db.recordLearningEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'paper_click',
            userId: 'user-1',
        }));
    });

    test('registerInteractionHandlers logs analytics events', async () => {
        const db = { logEvent: jest.fn().mockResolvedValue(null) };
        const off = registerInteractionHandlers({ db });
        emit('user.interaction', {
            sessionId: 'sess',
            type: 'paper_view',
            paperId: 'pmid-2',
            searchId: 7,
            duration: 1000,
            sectionsRead: ['abstract'],
        });
        await new Promise((r) => setImmediate(r));
        off();
        expect(db.logEvent).toHaveBeenCalledWith('user_interaction', 'sess', expect.objectContaining({
            paperId: 'pmid-2',
        }));
    });
});
