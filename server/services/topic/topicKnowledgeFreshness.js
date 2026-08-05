const VOLATILITY_PROFILES = {
    high: {
        halfLifeDays: 90,
        keywords: [
            'covid', 'sars-cov-2', 'glp-1', 'glp1', 'semaglutide', 'tirzepatide',
            'obesity pharmacotherapy', 'immunotherapy', 'car-t', 'checkpoint inhibitor',
            'gene therapy', 'long covid',
        ],
    },
    moderate: {
        halfLifeDays: 180,
        keywords: [
            'sepsis', 'septic shock', 'heart failure', 'stroke', 'diabetes',
            'ards', 'oncology', 'hypertension', 'anticoagulation',
        ],
    },
    stable: {
        halfLifeDays: 365,
        keywords: [
            'anatomy', 'physiology', 'berlin definition', 'diagnostic criteria',
            'basic pharmacology',
        ],
    },
};

function daysSince(value, now = new Date()) {
    if (!value) return Infinity;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return Infinity;
    return Math.max(0, (now.getTime() - d.getTime()) / 86400000);
}

function inferTopicVolatility(topic, knowledge = {}) {
    const text = [
        topic,
        knowledge?.mentorMessage,
        ...(Array.isArray(knowledge?.keywords) ? knowledge.keywords : []),
    ].filter(Boolean).join(' ').toLowerCase();

    for (const profile of ['high', 'stable', 'moderate']) {
        if (VOLATILITY_PROFILES[profile].keywords.some((keyword) => text.includes(keyword))) {
            return profile;
        }
    }
    return 'moderate';
}

function decayTopicConfidence({
    confidence = 0,
    refreshedAt,
    topic = '',
    knowledge = {},
    now = new Date(),
}) {
    const baseConfidence = Math.max(0, Math.min(1, Number(confidence) || 0));
    const volatility = inferTopicVolatility(topic, knowledge);
    const halfLifeDays = VOLATILITY_PROFILES[volatility].halfLifeDays;
    const ageDays = daysSince(refreshedAt, now);

    if (!Number.isFinite(ageDays)) {
        return {
            baseConfidence,
            effectiveConfidence: 0,
            confidenceDecay: baseConfidence,
            ageDays,
            volatility,
            halfLifeDays,
        };
    }

    const effectiveConfidence = baseConfidence * Math.pow(0.5, ageDays / halfLifeDays);
    return {
        baseConfidence,
        effectiveConfidence: Number(effectiveConfidence.toFixed(4)),
        confidenceDecay: Number((baseConfidence - effectiveConfidence).toFixed(4)),
        ageDays: Math.round(ageDays),
        volatility,
        halfLifeDays,
    };
}

function topicRefreshPriority({
    confidence = 0,
    refreshedAt,
    topic = '',
    knowledge = {},
    totalSignals = 0,
    distinctArticles = 0,
    hasKnowledge = true,
    now = new Date(),
}) {
    if (!hasKnowledge) {
        return {
            ...decayTopicConfidence({ confidence: 0, refreshedAt, topic, knowledge, now }),
            priorityScore: Number((1 + Math.log1p(Number(totalSignals || 0))).toFixed(4)),
            reason: 'missing_knowledge',
        };
    }

    const decay = decayTopicConfidence({ confidence, refreshedAt, topic, knowledge, now });
    const signalWeight = Math.log1p(Number(totalSignals || 0)) / Math.log(21);
    const breadthWeight = Math.min(1, Number(distinctArticles || 0) / 6);
    const priorityScore = decay.confidenceDecay * (1 + signalWeight * 0.6 + breadthWeight * 0.3);
    return {
        ...decay,
        priorityScore: Number(priorityScore.toFixed(4)),
        reason: decay.volatility === 'high' ? 'confidence_decay_high_volatility' : 'confidence_decay',
    };
}

module.exports = {
    VOLATILITY_PROFILES,
    daysSince,
    decayTopicConfidence,
    inferTopicVolatility,
    topicRefreshPriority,
};
