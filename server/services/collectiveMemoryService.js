const logger = require('../config/logger');

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

        const highDiscrimination = [];
        const tooEasy = [];
        const tooHard = [];

        for (const q of questionStats) {
            const rate = q.total_attempts > 0 ? q.correct_count / q.total_attempts : 0;
            const entry = {
                conceptHash: q.concept_hash,
                questionText: q.question_text,
                questionType: q.question_type,
                correctRate: Math.round(rate * 100),
                totalAttempts: q.total_attempts,
                uniqueUsers: q.unique_users,
            };
            if (rate >= 0.40 && rate <= 0.75) highDiscrimination.push(entry);
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
            highDiscriminationMcqs: highDiscrimination.slice(0, 15),
            tooEasyMcqs: tooEasy.map((q) => q.conceptHash),
            tooHardMcqs: tooHard.map((q) => q.conceptHash),
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
