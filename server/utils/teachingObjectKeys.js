'use strict';

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

module.exports = {
    teachingObjectTopicSlug,
    coldStartMcqKey,
    guidelineMcqKey,
};
