const logger = require('../config/logger');
const { computeItemPsychometrics } = require('./itemPsychometricsService');

async function aggregateCollectiveMemory(db) {
    const topicRows = await db.all(
        `SELECT normalized_topic,
                COUNT(*) as total_attempts,
                COUNT(DISTINCT user_id) as unique_users
         FROM quiz_attempts
         GROUP BY normalized_topic
         HAVING total_attempts >= 1`
    );

    if (topicRows.length === 0) {
        return { topics: 0, message: 'No quiz attempt data yet.' };
    }

    let processed = 0;

    for (const row of topicRows) {
        const normalizedTopic = row.normalized_topic;

        const questionStats = await db.all(
            `SELECT concept_hash,
                    MAX(question_text) as question_text,
                    MAX(question_type) as question_type,
                    COUNT(*) as total_attempts,
                    SUM(is_correct) as correct_count,
                    COUNT(DISTINCT user_id) as unique_users
             FROM quiz_attempts
             WHERE normalized_topic = ?
             GROUP BY concept_hash
             HAVING total_attempts >= 3`,
            [normalizedTopic]
        );

        const wrongAnswers = await db.all(
            `SELECT concept_hash,
                    MAX(question_text) as question_text,
                    user_answer,
                    COUNT(*) as pick_count,
                    total.total_attempts
             FROM quiz_attempts qa
             JOIN (
                 SELECT concept_hash, COUNT(*) as total_attempts
                 FROM quiz_attempts WHERE normalized_topic = ? GROUP BY concept_hash
             ) total USING (concept_hash)
             WHERE qa.normalized_topic = ? AND qa.is_correct = 0
             GROUP BY concept_hash, user_answer
             HAVING CAST(pick_count AS REAL) / total_attempts >= 0.25
             ORDER BY pick_count DESC`,
            [normalizedTopic, normalizedTopic]
        );

        // Raw (user, item, correctness) rows for real point-biserial discrimination —
        // see itemPsychometricsService.js for why a p-value band isn't discrimination.
        const rawAttempts = await db.all(
            `SELECT concept_hash, user_id, is_correct FROM quiz_attempts WHERE normalized_topic = ? AND concept_hash IS NOT NULL`,
            [normalizedTopic]
        );
        const attemptsByItem = new Map();
        const userTotals = new Map(); // userId -> { correct, total }
        for (const a of rawAttempts) {
            if (!attemptsByItem.has(a.concept_hash)) attemptsByItem.set(a.concept_hash, []);
            attemptsByItem.get(a.concept_hash).push({ userId: a.user_id, isCorrect: !!a.is_correct });
            const u = userTotals.get(a.user_id) || { correct: 0, total: 0 };
            u.correct += a.is_correct ? 1 : 0;
            u.total += 1;
            userTotals.set(a.user_id, u);
        }

        const highDiscrimination = [];
        const tooEasy = [];
        const tooHard = [];
        const flaggedItems = [];

        for (const q of questionStats) {
            const rate = q.total_attempts > 0 ? q.correct_count / q.total_attempts : 0;
            const itemAttempts = attemptsByItem.get(q.concept_hash) || [];
            // "Other items" accuracy for each user who attempted this item — excludes
            // this item's own contribution so the item isn't correlated with itself.
            const otherAccuracyByUser = new Map();
            for (const { userId } of itemAttempts) {
                if (otherAccuracyByUser.has(userId)) continue;
                const itemOwnAttempts = itemAttempts.filter((a) => a.userId === userId);
                const itemOwnCorrect = itemOwnAttempts.filter((a) => a.isCorrect).length;
                const total = userTotals.get(userId);
                const otherTotal = total.total - itemOwnAttempts.length;
                const otherCorrect = total.correct - itemOwnCorrect;
                if (otherTotal > 0) otherAccuracyByUser.set(userId, otherCorrect / otherTotal);
            }
            const psychometrics = computeItemPsychometrics(itemAttempts, otherAccuracyByUser);

            const entry = {
                conceptHash: q.concept_hash,
                questionText: q.question_text,
                questionType: q.question_type,
                correctRate: Math.round(rate * 100),
                totalAttempts: q.total_attempts,
                uniqueUsers: q.unique_users,
                discrimination: psychometrics.discrimination != null ? Math.round(psychometrics.discrimination * 100) / 100 : null,
                discriminationLabel: psychometrics.discriminationLabel,
                sampleSize: psychometrics.sampleSize,
                reliable: psychometrics.sampleSize >= 30,
            };
            if (psychometrics.discriminationLabel === 'flag_negative' && psychometrics.sampleSize >= 5) flaggedItems.push(entry);
            else if (rate >= 0.40 && rate <= 0.75 && ['good', 'excellent'].includes(psychometrics.discriminationLabel)) highDiscrimination.push(entry);
            else if (rate > 0.90) tooEasy.push(entry);
            else if (rate < 0.20) tooHard.push(entry);
        }

        const sharedMisconceptions = wrongAnswers.slice(0, 8).map((w) => ({
            conceptHash: w.concept_hash,
            questionText: w.question_text?.slice(0, 200),
            wrongAnswer: w.user_answer,
            pickRate: Math.round((w.pick_count / w.total_attempts) * 100),
        }));

        const collective_memory = {
            interactionCount: Number(row.total_attempts),
            uniqueUsers: Number(row.unique_users),
            highDiscrimination: highDiscrimination.slice(0, 15),
            tooEasy: tooEasy.slice(0, 15),
            tooHard: tooHard.slice(0, 15),
            // Items where weaker performers outscore stronger ones — a strong signal
            // of a miskeyed answer or an ambiguous distractor, worth human review.
            flaggedForReview: flaggedItems.slice(0, 10),
            sharedMisconceptions,
            lastAggregatedAt: new Date().toISOString(),
        };

        const existing = await db.get(
            `SELECT topic, knowledge FROM topic_knowledge WHERE normalized_topic = ? LIMIT 1`,
            [normalizedTopic]
        );

        if (existing) {
            let knowledge = {};
            try { knowledge = JSON.parse(existing.knowledge || '{}'); } catch (err) {
                logger.debug({ err, normalizedTopic }, 'Collective memory knowledge JSON parse failed');
            }
            knowledge.collective_memory = collective_memory;
            await db.run(
                `UPDATE topic_knowledge SET knowledge = ?, updated_at = ? WHERE normalized_topic = ?`,
                [JSON.stringify(knowledge), new Date().toISOString(), normalizedTopic]
            );
            processed++;
        }
    }

    return { topics: processed, message: `Aggregated collective memory for ${processed} topic(s).` };
}

module.exports = { aggregateCollectiveMemory };
