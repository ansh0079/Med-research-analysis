/**
 * Entitlement model — single source of truth for all plan capabilities.
 *
 * Tiers (maps to users.subscription_plan):
 *   free        → default for new signups
 *   researcher  → $15/month (search + AI analysis)
 *   pro         → $29/month individual
 *   team        → $99/month, up to 10 seats
 *   institution → custom pricing, SSO, BAA/DPA
 *
 * Role aliases that map to tiers:
 *   admin       → treated as institution (full access)
 *   researcher  → paid Researcher tier (legacy role name preserved)
 *   enterprise  → treated as institution
 */

'use strict';

// ──────────────────────────────────────────────────────────
// Plan definitions
// ──────────────────────────────────────────────────────────
const PLANS = {
    free: {
        label: 'Free',
        monthlyPriceCents: 0,
        stripeProductKey: null,

        limits: {
            searchesPerDay: 50,
            savedArticles: 25,
            aiAnalysesPerMonth: 5,
            synthesisPerMonth: 0,
            exportFormats: [],          // no exports on free
            teamSeats: 0,
        },

        features: {
            search: true,
            save: true,
            history: true,
            alerts: false,             // digest alerts require email verify + pro
            aiAnalysis: true,          // limited by aiAnalysesPerMonth
            aiSynthesis: false,
            aiExplain: true,
            journalClub: false,
            caseMode: false,
            grantWriting: false,
            reviewAssistant: false,
            picoExtraction: false,
            screeningAssist: false,
            csvExport: false,
            bibtexExport: true,        // basic citation export is free
            pdfFullText: false,
            vectorSearch: false,
            teamWorkspace: false,
            teamReviewAssignment: false,
            teamActivity: false,
            collaboration: false,
            guidelineAlignment: false,
            sso: false,
            adminControls: false,
            baa: false,
            dedicatedDeployment: false,
            apiAccess: false,
        },
    },

    pro: {
        label: 'Pro',
        monthlyPriceCents: 2900,
        stripeProductKey: 'pro',

        limits: {
            searchesPerDay: 20,
            savedArticles: 500,
            aiAnalysesPerMonth: 150,
            synthesisPerMonth: 30,
            exportFormats: ['bibtex', 'csv', 'ris'],
            teamSeats: 0,
        },

        features: {
            search: true,
            save: true,
            history: true,
            alerts: true,
            aiAnalysis: true,
            aiSynthesis: true,
            aiExplain: true,
            journalClub: true,
            caseMode: true,
            grantWriting: true,
            reviewAssistant: true,
            picoExtraction: true,
            screeningAssist: true,
            csvExport: true,
            bibtexExport: true,
            pdfFullText: true,
            vectorSearch: true,
            teamWorkspace: false,
            teamReviewAssignment: false,
            teamActivity: false,
            collaboration: false,
            guidelineAlignment: true,
            sso: false,
            adminControls: false,
            baa: false,
            dedicatedDeployment: false,
            apiAccess: true,
        },
    },

    researcher: {
        label: 'Researcher',
        monthlyPriceCents: 1500,
        stripeProductKey: 'researcher',

        limits: {
            searchesPerDay: 75,
            savedArticles: 150,
            aiAnalysesPerMonth: 25,
            synthesisPerMonth: 0,
            exportFormats: ['bibtex'],
            teamSeats: 0,
        },

        features: {
            search: true,
            save: true,
            history: true,
            alerts: false,
            aiAnalysis: true,
            aiSynthesis: false,
            aiExplain: true,
            journalClub: false,
            caseMode: false,
            grantWriting: false,
            reviewAssistant: false,
            picoExtraction: false,
            screeningAssist: false,
            csvExport: false,
            bibtexExport: true,
            pdfFullText: false,
            vectorSearch: true,
            teamWorkspace: false,
            teamReviewAssignment: false,
            teamActivity: false,
            collaboration: false,
            guidelineAlignment: false,
            sso: false,
            adminControls: false,
            baa: false,
            dedicatedDeployment: false,
            apiAccess: false,
        },
    },

    team: {
        label: 'Team',
        monthlyPriceCents: 9900,
        stripeProductKey: 'team',

        limits: {
            searchesPerDay: 1000,      // shared pool
            savedArticles: 5000,       // shared workspace
            aiAnalysesPerMonth: 500,   // shared pool
            synthesisPerMonth: 100,
            exportFormats: ['bibtex', 'csv', 'ris', 'endnote'],
            teamSeats: 10,
        },

        features: {
            search: true,
            save: true,
            history: true,
            alerts: true,
            aiAnalysis: true,
            aiSynthesis: true,
            aiExplain: true,
            journalClub: true,
            caseMode: true,
            grantWriting: true,
            reviewAssistant: true,
            picoExtraction: true,
            screeningAssist: true,
            csvExport: true,
            bibtexExport: true,
            pdfFullText: true,
            vectorSearch: true,
            teamWorkspace: true,
            teamReviewAssignment: true,
            teamActivity: true,
            collaboration: true,
            guidelineAlignment: true,
            sso: false,
            adminControls: false,
            baa: false,
            dedicatedDeployment: false,
            apiAccess: true,
        },
    },

    institution: {
        label: 'Institution',
        monthlyPriceCents: null,       // custom pricing
        stripeProductKey: null,

        limits: {
            searchesPerDay: Infinity,
            savedArticles: Infinity,
            aiAnalysesPerMonth: Infinity,
            synthesisPerMonth: Infinity,
            exportFormats: ['bibtex', 'csv', 'ris', 'endnote', 'zotero'],
            teamSeats: Infinity,
        },

        features: {
            search: true,
            save: true,
            history: true,
            alerts: true,
            aiAnalysis: true,
            aiSynthesis: true,
            aiExplain: true,
            journalClub: true,
            caseMode: true,
            grantWriting: true,
            reviewAssistant: true,
            picoExtraction: true,
            screeningAssist: true,
            csvExport: true,
            bibtexExport: true,
            pdfFullText: true,
            vectorSearch: true,
            teamWorkspace: true,
            teamReviewAssignment: true,
            teamActivity: true,
            collaboration: true,
            guidelineAlignment: true,
            sso: true,
            adminControls: true,
            baa: true,
            dedicatedDeployment: true,
            apiAccess: true,
        },
    },
};

// ──────────────────────────────────────────────────────────
// Role → plan resolution
// Stripe webhook sets subscription_plan on users table.
// Role field provides a fast path without a DB hit.
// ──────────────────────────────────────────────────────────
const ROLE_TO_PLAN = {
    admin: 'institution',
    enterprise: 'institution',
    researcher: 'researcher',
    pro: 'pro',
    team: 'team',
    free: 'free',
    user: 'free',
};

/**
 * Resolve the effective plan for a user object.
 * Priority: subscription_plan column > role mapping > 'free'.
 */
function resolvePlan(user) {
    if (!user) return PLANS.free;
    const plan = user.subscription_plan || ROLE_TO_PLAN[user.role] || 'free';
    return PLANS[plan] || PLANS.free;
}

/**
 * Check if a user has a specific feature enabled.
 */
function hasFeature(user, featureName) {
    const plan = resolvePlan(user);
    return plan.features[featureName] === true;
}

/**
 * Get the numeric limit for a user (e.g. aiAnalysesPerMonth).
 */
function getLimit(user, limitName) {
    const plan = resolvePlan(user);
    const val = plan.limits[limitName];
    return val === undefined ? 0 : val;
}

module.exports = { PLANS, ROLE_TO_PLAN, resolvePlan, hasFeature, getLimit };
