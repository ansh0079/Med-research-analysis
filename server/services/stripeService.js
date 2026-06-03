const logger = require('../config/logger');

let _stripe = null;

function getStripe() {
    if (_stripe) return _stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    try {
        const Stripe = require('stripe');
        _stripe = new Stripe(key, { apiVersion: '2024-06-20' });
        return _stripe;
    } catch (err) {
        logger.error({ err }, 'Failed to initialise Stripe');
        return null;
    }
}

const PLANS = {
    researcher: {
        name: 'Researcher',
        priceId: process.env.STRIPE_RESEARCHER_PRICE_ID,
        amount: 1500,
        currency: 'usd',
        interval: 'month',
        features: [
            '75 searches per day',
            '25 AI paper analyses per month',
            'Multi-source literature search',
            'Vector search & saved articles',
            'Basic BibTeX export',
        ],
    },
    pro: {
        name: 'Pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        amount: 2900,
        currency: 'usd',
        interval: 'month',
        features: [
            'Unlimited AI paper analysis',
            'Evidence synthesis across 100M+ papers',
            'Clinical Case Mode',
            'Systematic Review Assistant',
            'PICO extraction & PRISMA tracking',
            'CSV export',
            'Priority support',
        ],
    },
    team: {
        name: 'Team',
        priceId: process.env.STRIPE_TEAM_PRICE_ID,
        amount: 9900,
        currency: 'usd',
        interval: 'month',
        features: [
            'Everything in Pro',
            'Up to 10 team members',
            'Shared collections & annotations',
            'Team workspace & comments',
            'Admin analytics dashboard',
            'Dedicated support',
        ],
    },
};

/** Map Stripe subscription status → app role */
function subscriptionStatusToRole(status, plan) {
    if (status === 'active' || status === 'trialing') {
        if (plan === 'team') return 'enterprise';
        if (plan === 'researcher') return 'researcher';
        return 'pro';
    }
    return 'user';
}

module.exports = { getStripe, PLANS, subscriptionStatusToRole };
