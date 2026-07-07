'use strict';

function recordLearningEventSafe(db, logger, event) {
    return db.recordLearningEvent(event).catch((err) => {
        logger.warn({ err, eventType: event?.eventType }, 'recordLearningEvent failed');
        return null;
    });
}

module.exports = { recordLearningEventSafe };
