const { getStripe, PLANS } = require('../services/stripeService');
const logger = require('../config/logger');

const { getUserUsageSummary } = require('../services/usageService');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function registerBillingRoutes(app, deps) {
    const { db, requireAuthJwt } = deps;

    // ── GET /api/billing/usage ──────────────────────────────────────
    app.get('/api/billing/usage', requireAuthJwt, async (req, res) => {
        try {
            const row = await db.get(
                'SELECT subscription_plan, role FROM users WHERE id = ?',
                [req.user.id]
            );
            const user = {
                ...req.user,
                subscription_plan: row?.subscription_plan,
                role: row?.role || req.user.role,
            };
            const usage = await getUserUsageSummary(db, user);
            res.json(usage);
        } catch (err) {
            logger.error({ err }, 'billing usage error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── GET /api/billing/status ─────────────────────────────────────
    app.get('/api/billing/status', requireAuthJwt, async (req, res) => {
        try {
            const row = await db.get(
                'SELECT subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, role, trial_started_at, trial_ends_at, has_used_trial FROM users WHERE id = ?',
                [req.user.id]
            );
            res.json({
                status: row?.subscription_status || 'free',
                plan: row?.subscription_plan || 'free',
                role: row?.role || 'user',
                currentPeriodEnd: row?.subscription_current_period_end || row?.trial_ends_at || null,
                cancelAtPeriodEnd: Boolean(row?.subscription_cancel_at_period_end),
                trialStartedAt: row?.trial_started_at || null,
                trialEndsAt: row?.trial_ends_at || null,
                hasUsedTrial: Boolean(row?.has_used_trial),
                plans: Object.entries(PLANS).map(([id, p]) => ({
                    id,
                    name: p.name,
                    amount: p.amount,
                    currency: p.currency,
                    interval: p.interval,
                    features: p.features,
                    available: !!p.priceId,
                })),
                stripeConfigured: !!getStripe(),
            });
        } catch (err) {
            logger.error({ err }, 'billing status error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── POST /api/billing/start-trial ───────────────────────────────
    app.post('/api/billing/start-trial', requireAuthJwt, async (req, res) => {
        try {
            const { startProTrial } = require('../middleware/auth');
            const user = await db.get('SELECT id, has_used_trial, subscription_status FROM users WHERE id = ?', [req.user.id]);
            if (!user) return res.status(404).json({ error: 'User not found' });
            if (user.has_used_trial) {
                return res.status(409).json({ error: 'You have already used your free trial.' });
            }
            if (user.subscription_status === 'active' || user.subscription_status === 'trialing') {
                return res.status(409).json({ error: 'You already have an active subscription or trial.' });
            }
            await startProTrial(db, req.user.id);
            const fresh = await db.get('SELECT subscription_status, subscription_plan, trial_started_at, trial_ends_at FROM users WHERE id = ?', [req.user.id]);
            res.json({
                message: 'Your 14-day Pro trial has started. Enjoy full access — no credit card required.',
                trialEndsAt: fresh.trial_ends_at,
                status: fresh.subscription_status,
                plan: fresh.subscription_plan,
            });
        } catch (err) {
            logger.error({ err }, 'Start trial error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // ── POST /api/billing/create-checkout ──────────────────────────
    app.post('/api/billing/create-checkout', requireAuthJwt, async (req, res) => {
        const stripe = getStripe();
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });

        const { plan = 'pro' } = req.body;
        const planConfig = PLANS[plan];
        if (!planConfig?.priceId) {
            return res.status(400).json({ error: `Plan "${plan}" not configured. Set STRIPE_${plan.toUpperCase()}_PRICE_ID in .env` });
        }

        try {
            const user = await db.get('SELECT id, email, name, stripe_customer_id FROM users WHERE id = ?', [req.user.id]);

            // Reuse existing customer or create new one
            let customerId = user.stripe_customer_id;
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: user.email,
                    name: user.name || undefined,
                    metadata: { userId: String(user.id) },
                });
                customerId = customer.id;
                await db.run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, user.id]);
            }

            const appUrl = process.env.APP_URL || 'http://localhost:5173';
            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                line_items: [{ price: planConfig.priceId, quantity: 1 }],
                success_url: `${appUrl}/billing?session_id={CHECKOUT_SESSION_ID}&success=1`,
                cancel_url: `${appUrl}/billing?cancelled=1`,
                subscription_data: { metadata: { userId: String(user.id), plan } },
                allow_promotion_codes: true,
            });

            res.json({ url: session.url });
        } catch (err) {
            logger.error({ err }, 'Stripe checkout error');
            res.status(500).json({ error: 'Failed to create checkout session' });
        }
    });

    // ── POST /api/billing/portal ────────────────────────────────────
    app.post('/api/billing/portal', requireAuthJwt, async (req, res) => {
        const stripe = getStripe();
        if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

        try {
            const user = await db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id]);
            if (!user?.stripe_customer_id) {
                return res.status(400).json({ error: 'No active subscription found' });
            }

            const appUrl = process.env.APP_URL || 'http://localhost:5173';
            const session = await stripe.billingPortal.sessions.create({
                customer: user.stripe_customer_id,
                return_url: `${appUrl}/billing`,
            });

            res.json({ url: session.url });
        } catch (err) {
            logger.error({ err }, 'Stripe portal error');
            res.status(500).json({ error: 'Failed to create portal session' });
        }
    });

    // ── POST /api/billing/webhook ───────────────────────────────────
    // Raw body required — registered before express.json() in app.js
    app.post('/api/billing/webhook', async (req, res) => {
        const stripe = getStripe();
        if (!stripe) return res.status(503).send('Stripe not configured');

        const sig = req.headers['stripe-signature'];
        const secret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                logger.error('STRIPE_WEBHOOK_SECRET is not set in production — rejecting all webhook events');
                return res.status(503).send('Webhook not configured');
            }
            logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)');
        }

        let event;
        try {
            event = secret
                ? stripe.webhooks.constructEvent(req.body, sig, secret)
                : JSON.parse(req.body.toString());
        } catch (err) {
            logger.warn({ err }, 'Stripe webhook signature mismatch');
            return res.status(400).send('Webhook Error: invalid signature');
        }

        try {
            await handleWebhookEvent(event, db);
        } catch (err) {
            logger.error({ err, eventType: event.type }, 'Webhook handler error');
            return res.status(500).send('Webhook processing error');
        }

        res.json({ received: true });
    });
}

async function handleWebhookEvent(event, db) {
    const { subscriptionStatusToRole } = require('../services/stripeService');

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            if (session.mode !== 'subscription') break;
            const userId = session.subscription_data?.metadata?.userId || session.metadata?.userId;
            const plan = session.subscription_data?.metadata?.plan || 'pro';
            if (!userId) break;

            const sub = await require('../services/stripeService').getStripe()
                .subscriptions.retrieve(session.subscription);
            const role = subscriptionStatusToRole(sub.status, plan);
            const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

            await db.run(
                `UPDATE users SET
                    stripe_subscription_id = ?,
                    subscription_status = ?,
                    subscription_plan = ?,
                    subscription_current_period_end = ?,
                    subscription_cancel_at_period_end = ?,
                    role = ?
                WHERE id = ?`,
                [sub.id, sub.status, plan, periodEnd, sub.cancel_at_period_end ? 1 : 0, role, userId]
            );
            logger.info({ userId, plan, status: sub.status }, 'Subscription activated');
            break;
        }

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const userId = sub.metadata?.userId;
            if (!userId) break;

            const plan = sub.metadata?.plan || 'pro';
            const role = subscriptionStatusToRole(sub.status, plan);
            const periodEnd = sub.current_period_end
                ? new Date(sub.current_period_end * 1000).toISOString()
                : null;

            await db.run(
                `UPDATE users SET
                    subscription_status = ?,
                    subscription_plan = ?,
                    subscription_current_period_end = ?,
                    subscription_cancel_at_period_end = ?,
                    role = ?
                WHERE id = ?`,
                [sub.status, plan, periodEnd, sub.cancel_at_period_end ? 1 : 0, role, userId]
            );
            logger.info({ userId, plan, status: sub.status }, 'Subscription updated');
            break;
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            await db.run(
                "UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = ?",
                [customerId]
            );
            logger.warn({ customerId }, 'Payment failed — subscription marked past_due');
            break;
        }

        default:
            // Unhandled event type — ignore
            break;
    }
}

module.exports = { registerBillingRoutes };
