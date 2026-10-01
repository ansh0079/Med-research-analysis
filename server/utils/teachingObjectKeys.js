'use strict';

const crypto = require('crypto');

function teachingObjectTopicSlug(db, topic) {
    const normalized = typeof db?.normalizeTopic === 'function'
        ? db.normalizeTopic(topic)
        : String(topic || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized.replace(/\s+/g, '-');
}

function coldStartMcqKey(db, topic) {
    return `cold-start-mcq:${teachingObjectTopicSlug(db, topic)}`;
}

function guidelineMcqKey(db, topic) {
    return `guideline-mcq:${teachingObjectTopicSlug(db, topic)}`;
}

function liveQuizMcqKey(db, topic) {
    return `live-quiz-mcq:${teachingObjectTopicSlug(db, topic)}`;
}

function liveQuizMcqBatchKey(db, topic, flow = 'topic', userId = null) {
    const scope = userId ? `user:${userId}` : 'shared';
    const scopeHash = crypto.createHash('sha256').update(scope).digest('hex').slice(0, 16);
    return `live-quiz-mcq:${teachingObjectTopicSlug(db, topic)}:${flow}:${scopeHash}`.slice(0, 240);
}

module.exports = {
    teachingObjectTopicSlug,
    coldStartMcqKey,
    guidelineMcqKey,
    liveQuizMcqKey,
    liveQuizMcqBatchKey,
};
