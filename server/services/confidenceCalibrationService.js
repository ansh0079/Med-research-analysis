'use strict';

/**
 * Classify quiz attempts by confidence vs correctness for calibration analytics.
 */
function classifyCalibrationAttempt(attempt) {
    const confidence = Number(attempt.confidence || 0);
    const isCorrect = Boolean(attempt.isCorrect);
    if (!confidence) return { bucket: 'unreported', risk: 'unknown' };
    if (!isCorrect && confidence >= 4) {
        return { bucket: 'dangerous_misconception', risk: 'high', label: 'Wrong but high confidence' };
    }
    if (!isCorrect && confidence <= 2) {
        return { bucket: 'knowledge_gap', risk: 'medium', label: 'Wrong with low confidence' };
    }
    if (isCorrect && confidence <= 2) {
        return { bucket: 'needs_consolidation', risk: 'low', label: 'Right but low confidence' };
    }
    if (isCorrect && confidence >= 4) {
        return { bucket: 'well_calibrated', risk: 'none', label: 'Right with appropriate confidence' };
    }
    return { bucket: 'moderate', risk: 'low', label: 'Moderate calibration' };
}

function extendReasoningTagsForConfidence(attempt, tags) {
    const cal = classifyCalibrationAttempt(attempt);
    if (cal.bucket === 'dangerous_misconception') tags.add('high_confidence_wrong');
    if (cal.bucket === 'knowledge_gap') tags.add('knowledge_gap');
    if (cal.bucket === 'needs_consolidation') tags.add('needs_consolidation');
    return cal;
}

async function getConfidenceCalibrationProfile(db, userId, topic = '') {
    const uid = String(userId || '').trim();
    if (!uid) return { buckets: {}, attempts: 0 };
    const normalized = topic ? db.normalizeTopic(topic) : '';
    const clause = normalized ? 'AND normalized_topic = ?' : '';
    const params = normalized ? [uid, normalized] : [uid];
    const rows = await db.all(
        `SELECT confidence, is_correct, reasoning_tags, created_at, claim_key, topic
         FROM quiz_attempts
         WHERE user_id = ? ${clause} AND confidence IS NOT NULL AND confidence > 0
         ORDER BY created_at DESC
         LIMIT 200`,
        params
    );

    const buckets = {
        dangerous_misconception: [],
        knowledge_gap: [],
        needs_consolidation: [],
        well_calibrated: [],
        moderate: [],
        unreported: [],
    };

    for (const row of rows) {
        const attempt = {
            confidence: row.confidence,
            isCorrect: Boolean(row.is_correct),
        };
        const cal = classifyCalibrationAttempt(attempt);
        buckets[cal.bucket].push({
            claimKey: row.claim_key,
            topic: row.topic,
            confidence: row.confidence,
            isCorrect: Boolean(row.is_correct),
            createdAt: row.created_at,
            label: cal.label,
        });
    }

    return {
        topic: topic || null,
        attempts: rows.length,
        buckets: {
            dangerousMisconception: buckets.dangerous_misconception.length,
            knowledgeGap: buckets.knowledge_gap.length,
            needsConsolidation: buckets.needs_consolidation.length,
            wellCalibrated: buckets.well_calibrated.length,
            moderate: buckets.moderate.length,
        },
        recent: {
            dangerousMisconception: buckets.dangerous_misconception.slice(0, 5),
            knowledgeGap: buckets.knowledge_gap.slice(0, 5),
            needsConsolidation: buckets.needs_consolidation.slice(0, 5),
        },
    };
}

module.exports = {
    classifyCalibrationAttempt,
    extendReasoningTagsForConfidence,
    getConfidenceCalibrationProfile,
};
