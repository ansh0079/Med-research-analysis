'use strict';

const { limitBodySize, requireJson } = require('../../../utils/validation');
const { resolveProvider } = require('../../../utils/aiProvider');
const logger = require('../../../config/logger');

function registerReflectionRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit, serverConfig } = deps;

    app.post('/api/learning/reflections', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const {
                reflectionType = 'CBD',
                sourceType = 'manual',
                topic = '',
                whatHappened = '',
                whatILearned = '',
                whatIWillChange = '',
                evidenceUsed = '',
                supervisorDiscussion = '',
                status = 'draft',
                linkedCpdSessionId = null,
            } = req.body || {};
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            if (!String(topic).trim()) return res.status(400).json({ error: 'topic is required' });
            const reflection = await db.createPortfolioReflection(req.user.id, {
                reflectionType,
                sourceType,
                topic,
                whatHappened,
                whatILearned,
                whatIWillChange,
                evidenceUsed,
                supervisorDiscussion,
                status,
                linkedCpdSessionId,
            });
            res.status(201).json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Create portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/reflections', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const reflections = await db.listPortfolioReflections(req.user.id, {
                limit: Math.min(parseInt(req.query.limit, 10) || 50, 100),
                offset: parseInt(req.query.offset, 10) || 0,
                topic: String(req.query.topic || ''),
                status: String(req.query.status || ''),
            });
            res.json({ reflections });
        } catch (error) {
            req.log.error({ err: error }, 'List portfolio reflections error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.put('/api/learning/reflections/:id', limitBodySize(128 * 1024), requireJson, requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const id = parseInt(req.params.id, 10);
            if (!Number.isFinite(id) || id < 1) return res.status(400).json({ error: 'Invalid reflection id' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (req.body?.reflectionType && !validTypes.includes(req.body.reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }
            const validStatuses = ['draft', 'discussed', 'exported', 'submitted'];
            if (req.body?.status && !validStatuses.includes(req.body.status)) {
                return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
            }
            const reflection = await db.updatePortfolioReflection(req.user.id, id, req.body || {});
            if (!reflection) return res.status(404).json({ error: 'Reflection not found' });
            res.json({ reflection });
        } catch (error) {
            req.log.error({ err: error }, 'Update portfolio reflection error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.post('/api/learning/reflections/draft', requireJson, requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const { reflectionType = 'CBD', topic = '' } = req.body || {};
            const cleanTopic = String(topic).trim();
            if (!cleanTopic) return res.status(400).json({ error: 'topic is required' });
            const validTypes = ['CBD', 'mini-CEX', 'DOPS'];
            if (!validTypes.includes(reflectionType)) {
                return res.status(400).json({ error: `reflectionType must be one of: ${validTypes.join(', ')}` });
            }

            // Gather context: recent quiz attempts + topic knowledge seminal papers
            const [attempts, topicKnowledge] = await Promise.all([
                db.getQuizAttempts({ userId: req.user.id, topic: cleanTopic, limit: 10 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.getTopicKnowledge(cleanTopic).catch((err) => { logger.warn({ err }, 'getTopicKnowledge failed'); return null; }),
            ]);

            const attemptsText = (attempts || []).slice(0, 8).map((a, i) =>
                `${i + 1}. Q: ${String(a.question || '').slice(0, 200)} | Correct: ${a.isCorrect ? 'Yes' : 'No'} | Type: ${a.questionType || 'unknown'}${a.explanation ? ` | Explanation: ${String(a.explanation).slice(0, 200)}` : ''}`
            ).join('\n') || 'No quiz attempts recorded for this topic.';

            const seminalText = topicKnowledge?.knowledge?.seminalPapers?.slice(0, 3).map((p) =>
                `- ${p.title}${p.clinicalPrinciple ? `: ${p.clinicalPrinciple}` : ''}`
            ).join('\n') || '';

            const typeGuidance = {
                'CBD': 'Case-Based Discussion (CBD): reflects on a specific patient case, clinical decision-making, and evidence used.',
                'mini-CEX': 'Mini-Clinical Evaluation Exercise (mini-CEX): reflects on a brief clinical encounter, communication, and examination skills.',
                'DOPS': 'Direct Observation of Procedural Skills (DOPS): reflects on a procedural skill, technique, and patient safety considerations.',
            }[reflectionType];

            const prompt = `You are helping a medical trainee draft a ${reflectionType} portfolio reflection for topic: "${cleanTopic}".
${typeGuidance}

Recent quiz performance on this topic:
${attemptsText}
${seminalText ? `\nKey evidence for this topic:\n${seminalText}` : ''}

Write a professional, first-person portfolio reflection. Each field should be 2-4 concise sentences. Be specific and evidence-linked where possible.

Return ONLY valid JSON:
{
  "whatHappened": "What happened or was encountered — describe a realistic clinical encounter or learning event related to ${cleanTopic}",
  "whatILearned": "What was learned from this event — connect to quiz performance and key evidence above",
  "whatIWillChange": "What will change in future practice — specific, actionable, grounded in evidence",
  "evidenceUsed": "Key papers or guidelines referenced — derive from the evidence list above where possible"
}`;

            const { createAiService, PINNED_MODELS } = require('../../../services/aiService');
            const ai = createAiService({ serverConfig });
            const { provider: selectedProvider, model: selectedModel } = resolveProvider({ provider: 'auto' }, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }
            const rawText = await ai.callText(prompt, selectedProvider, selectedModel, { temperature: 0.5 });
            let draft;
            try {
                const match = rawText.match(/\{[\s\S]*\}/);
                draft = JSON.parse(match ? match[0] : rawText);
            } catch {
                return res.status(502).json({ error: 'AI returned an invalid response — try again' });
            }
            res.json({ draft, reflectionType, topic: cleanTopic });
        } catch (error) {
            req.log?.error?.({ err: error }, 'Reflection draft error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerReflectionRoutes };
