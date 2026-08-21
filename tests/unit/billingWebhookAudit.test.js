'use strict';

const { handleWebhookEvent } = require('../../server/routes/billing');

describe('Stripe webhook billing audit', () => {
    test('logs billing event on subscription update', async () => {
        const db = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
            logBillingEvent: jest.fn().mockResolvedValue({ id: '1' }),
        };
        await handleWebhookEvent({
            id: 'evt_1',
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_1',
                    status: 'active',
                    current_period_end: Math.floor(Date.now() / 1000) + 86400,
                    cancel_at_period_end: false,
                    metadata: { userId: 'user-1', plan: 'pro' },
                },
            },
        }, db);

        expect(db.run).toHaveBeenCalled();
        expect(db.logBillingEvent).toHaveBeenCalledWith(expect.objectContaining({
            userId: 'user-1',
            action: 'webhook_subscription_updated',
            externalRef: 'sub_1',
        }));
    });

    test('logs payment_failed billing event', async () => {
        const db = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
            logBillingEvent: jest.fn().mockResolvedValue({ id: '1' }),
        };
        await handleWebhookEvent({
            id: 'evt_2',
            type: 'invoice.payment_failed',
            data: {
                object: {
                    id: 'in_1',
                    customer: 'cus_1',
                },
            },
        }, db);

        expect(db.logBillingEvent).toHaveBeenCalledWith(expect.objectContaining({
            action: 'webhook_payment_failed',
            externalRef: 'in_1',
        }));
    });
});
