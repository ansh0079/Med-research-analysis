'use strict';

/** @param {typeof import('../index').Database} Sup */
module.exports = function applyM11LlmUsage(Sup) {
    return class M11LlmUsage extends Sup {
        async logLlmUsage(entry = {}) {
            const now = new Date().toISOString();
            const topic = entry.topic ? this.normalizeTopic(entry.topic) : null;
            await this.run(
                `INSERT INTO llm_usage_log (
                    operation, provider, model, normalized_topic, user_id,
                    prompt_chars, response_chars, estimated_input_tokens, estimated_output_tokens,
                    estimated_cost_usd, success, error_message, duration_ms, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    String(entry.operation || 'unknown').slice(0, 80),
                    entry.provider ? String(entry.provider).slice(0, 40) : null,
                    entry.model ? String(entry.model).slice(0, 80) : null,
                    topic,
                    entry.userId != null ? Number(entry.userId) : null,
                    Number(entry.promptChars || 0),
                    Number(entry.responseChars || 0),
                    Number(entry.estimatedInputTokens || 0),
                    Number(entry.estimatedOutputTokens || 0),
                    Number(entry.estimatedCostUsd || 0),
                    entry.success === false ? 0 : 1,
                    entry.errorMessage ? String(entry.errorMessage).slice(0, 500) : null,
                    entry.durationMs != null ? Number(entry.durationMs) : null,
                    now,
                ]
            );
        }

        async getAdminLlmCostDashboard({ days = 30, limit = 15 } = {}) {
            const safeDays = Math.min(Math.max(parseInt(String(days), 10) || 30, 1), 365);
            const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 15, 1), 50);
            const since = new Date(Date.now() - safeDays * 86400000).toISOString();

            const [
                totals,
                byOperation,
                failedCalls,
                highCostTopics,
                synopsisCount,
            ] = await Promise.all([
                this.get(
                    `SELECT
                        COUNT(*) AS call_count,
                        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success_count,
                        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed_count,
                        SUM(COALESCE(estimated_cost_usd, 0)) AS estimated_cost_usd,
                        SUM(COALESCE(estimated_input_tokens, 0) + COALESCE(estimated_output_tokens, 0)) AS estimated_tokens
                     FROM llm_usage_log
                     WHERE created_at >= ?`,
                    [since]
                ),
                this.all(
                    `SELECT operation, COUNT(*) AS call_count,
                            SUM(COALESCE(estimated_cost_usd, 0)) AS estimated_cost_usd,
                            SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failed_count
                     FROM llm_usage_log
                     WHERE created_at >= ?
                     GROUP BY operation
                     ORDER BY estimated_cost_usd DESC, call_count DESC
                     LIMIT ?`,
                    [since, safeLimit]
                ),
                this.all(
                    `SELECT operation, provider, model, normalized_topic, error_message, created_at
                     FROM llm_usage_log
                     WHERE created_at >= ? AND success = 0
                     ORDER BY created_at DESC
                     LIMIT ?`,
                    [since, Math.min(safeLimit, 30)]
                ),
                this.all(
                    `SELECT normalized_topic AS normalized_topic,
                            COUNT(*) AS call_count,
                            SUM(COALESCE(estimated_cost_usd, 0)) AS estimated_cost_usd
                     FROM llm_usage_log
                     WHERE created_at >= ? AND normalized_topic IS NOT NULL AND normalized_topic <> ''
                     GROUP BY normalized_topic
                     ORDER BY estimated_cost_usd DESC, call_count DESC
                     LIMIT ?`,
                    [since, safeLimit]
                ),
                this.get(
                    `SELECT COUNT(*) AS count FROM llm_usage_log
                     WHERE created_at >= ? AND operation IN ('synopsis', 'paper_synopsis', 'consensus_synopsis', 'synthesis')`,
                    [since]
                ).catch(() => ({ count: 0 })),
            ]);

            const failedJobs = await this.all(
                `SELECT job_key, job_type, status, error_message, updated_at
                 FROM ai_generation_jobs
                 WHERE status = 'failed' AND updated_at >= ?
                 ORDER BY updated_at DESC
                 LIMIT ?`,
                [since, Math.min(safeLimit, 30)]
            ).catch(() => []);

            return {
                generatedAt: new Date().toISOString(),
                windowDays: safeDays,
                totals: {
                    llmCalls: Number(totals?.call_count || 0),
                    successCalls: Number(totals?.success_count || 0),
                    failedCalls: Number(totals?.failed_count || 0),
                    estimatedCostUsd: Math.round(Number(totals?.estimated_cost_usd || 0) * 10000) / 10000,
                    estimatedTokens: Number(totals?.estimated_tokens || 0),
                    synopsesGenerated: Number(synopsisCount?.count || 0),
                },
                byOperation: byOperation.map((r) => ({
                    operation: r.operation,
                    callCount: Number(r.call_count || 0),
                    estimatedCostUsd: Math.round(Number(r.estimated_cost_usd || 0) * 10000) / 10000,
                    failedCount: Number(r.failed_count || 0),
                })),
                failedLlmCalls: failedCalls.map((r) => ({
                    operation: r.operation,
                    provider: r.provider,
                    model: r.model,
                    normalizedTopic: r.normalized_topic,
                    errorMessage: r.error_message,
                    createdAt: r.created_at,
                })),
                failedGenerationJobs: failedJobs.map((r) => ({
                    jobKey: r.job_key,
                    jobType: r.job_type,
                    errorMessage: r.error_message,
                    updatedAt: r.updated_at,
                })),
                highCostTopics: highCostTopics.map((r) => ({
                    normalizedTopic: r.normalized_topic,
                    callCount: Number(r.call_count || 0),
                    estimatedCostUsd: Math.round(Number(r.estimated_cost_usd || 0) * 10000) / 10000,
                })),
            };
        }
    };
};
