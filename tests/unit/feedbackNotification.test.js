'use strict';

/**
 * A tester's written feedback has to reach a person. It was stored in product_quality_feedback and
 * nothing in the app ever selected the comment column.
 */

const { notifyFeedback } = require('../../server/routes/analytics');

const req = (over = {}) => ({ user: { email: 'tester@example.org' }, sessionId: 'abcdef123456', get: () => 'https://signalmd.co/search', ...over });

test('a comment is emailed to the alert recipients, with who sent it and from where', async () => {
    const sendEmail = jest.fn(async () => ({ success: true }));
    const sent = await notifyFeedback(
        { type: 'beta', topic: 'sepsis', comment: 'Quiz button did nothing', rating: 2, req: req() },
        { loadRecipients: () => ['ops@example.org'], sendEmail },
    );
    expect(sent).toBe(true);
    const message = sendEmail.mock.calls[0][0];
    expect(message.to).toEqual(['ops@example.org']);
    expect(message.subject).toContain('[Signal MD feedback] beta');
    expect(message.text).toContain('tester@example.org');
    expect(message.text).toContain('https://signalmd.co/search');
    expect(message.text).toContain('Quiz button did nothing');
});

test('the comment is escaped in the HTML body, since it is tester-supplied', async () => {
    const sendEmail = jest.fn(async () => ({}));
    await notifyFeedback(
        { type: 'beta', comment: '<img src=x onerror=alert(1)>', req: req() },
        { loadRecipients: () => ['ops@example.org'], sendEmail },
    );
    expect(sendEmail.mock.calls[0][0].html).not.toContain('<img');
    expect(sendEmail.mock.calls[0][0].html).toContain('&lt;img');
});

test('with no recipients configured nothing is sent', async () => {
    const sendEmail = jest.fn();
    const sent = await notifyFeedback(
        { type: 'beta', comment: 'x', req: req({ user: null }) },
        { loadRecipients: () => [], sendEmail },
    );
    expect(sent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
});
