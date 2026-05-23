const logger = require('../config/logger');
const { safeFetch } = require('../utils/fetch');
const { createAiService, PINNED_MODELS, TEMPERATURE } = require('../services/aiService');
const { resolveProvider } = require('../utils/aiProvider');
const { topicRefreshPriority } = require('../services/topicKnowledgeFreshness');
const { CLAIM_VERIFICATION, stableClaimKey } = require('../services/teachingObjectService');

const isDev = process.env.NODE_ENV === 'development';

function compactTeachingObject(object) {
    const payload = object?.payload || {};
    const synopsis = payload.synopsis || {};
    const seed = payload.quizSeed || {};
    return [
        `- ${object.title || object.objectKey}`,
        object.objectType ? `type: ${object.objectType}` : '',
        object.confidence != null ? `confidence: ${Number(object.confidence).toFixed(2)}` : '',
        payload.clinicalBottomLine ? `bottom line: ${String(payload.clinicalBottomLine).slice(0, 260)}` : '',
        synopsis.mainFindings ? `findings: ${String(synopsis.mainFindings).slice(0, 260)}` : '',
        Array.isArray(seed.focusPoints) && seed.focusPoints.length ? `quiz focus: ${seed.focusPoints.slice(0, 3).join('; ')}` : '',
    ].filter(Boolean).join(' | ');
}

function compactGroundedClaim(claim) {
    return [
        `[CLAIM-${claim.claimKey}] ${String(claim.claimText || '').slice(0, 360)}`,
        claim.sourcePath ? `source path: ${claim.sourcePath}` : '',
        claim.evidenceQuote ? `quote/snippet: ${String(claim.evidenceQuote).slice(0, 300)}` : '',
        claim.confidence != null ? `confidence: ${Number(claim.confidence).toFixed(2)}` : '',
        claim.verificationStatus ? `verification: ${claim.verificationStatus}` : '',
    ].filter(Boolean).join('\n  ');
}

function buildRetrievalContext(retrieval = {}) {
    const teachingObjects = Array.isArray(retrieval.teachingObjects) ? retrieval.teachingObjects.slice(0, 3) : [];
    const groundedClaims = Array.isArray(retrieval.groundedClaims) ? retrieval.groundedClaims.slice(0, 5) : [];
    const claimMastery = Array.isArray(retrieval.claimMastery) ? retrieval.claimMastery : [];
    const weakClaims = claimMastery.filter((claim) => claim.masteryState === 'weak').slice(0, 3);
    const untestedClaims = claimMastery.filter((claim) => claim.masteryState === 'untested').slice(0, 3);
    const freshness = retrieval.freshness;

    const parts = [];
    if (teachingObjects.length) {
        parts.push(`### Top reusable teaching objects
${teachingObjects.map(compactTeachingObject).join('\n')}`);
    }
    if (groundedClaims.length) {
        parts.push(`### Top grounded claims
${groundedClaims.map(compactGroundedClaim).join('\n\n')}`);
    }
    if (weakClaims.length || untestedClaims.length) {
        parts.push(`### User claim mastery gaps
${weakClaims.length ? `Previously weak claims:\n${weakClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)} (${c.accuracy ?? 0}% accuracy)`).join('\n')}` : ''}
${untestedClaims.length ? `Untested claims:\n${untestedClaims.map((c) => `- [CLAIM-${c.claimKey}] ${String(c.claimText || '').slice(0, 240)}`).join('\n')}` : ''}`);
    }
    const personalHooks = Array.isArray(retrieval.personalGraphHooks) ? retrieval.personalGraphHooks : [];
    if (personalHooks.length) {
        parts.push(`### Personal knowledge graph — prior mistakes to reference
${personalHooks.map((h) => `- ${h.prompt}`).join('\n')}
When a new paper tests the same boundary, explicitly connect it to the learner's prior mistake.`);
    }
    if (freshness) {
        parts.push(`### Freshness and volatility
- Volatility: ${freshness.volatility}
- Confidence decay: ${Math.round((freshness.confidenceDecay || 0) * 100)}%
- Effective confidence: ${Math.round((freshness.effectiveConfidence || 0) * 100)}%
- Refresh priority: ${freshness.priorityScore}
- Reason: ${freshness.reason}
${freshness.confidenceDecay > 0.25 ? '- Knowledge gap: this topic memory is stale enough to warn the learner and suggest refresh/re-quiz.' : ''}`);
    }
    return parts.join('\n\n') || 'No reusable teaching objects or grounded claim mastery available yet.';
}

function buildAgentSystemPrompt(topicKnowledge, currentArticles, guidelines = [], userContext = null, crossTopicBridges = [], retrieval = {}) {
    const k = topicKnowledge?.knowledge;
    const topic = topicKnowledge?.topic || 'this medical topic';

    const seminalText = k?.seminalPapers?.slice(0, 5).map((p, i) =>
        `[MEM-${p.sourceIndex || i + 1}] ${p.title}${p.clinicalPrinciple ? ` — ${p.clinicalPrinciple}` : ''}`
    ).join('\n') || 'None stored yet.';

    const teachingText = k?.teachingPoints?.slice(0, 5).map((tp, i) =>
        `${i + 1}. ${typeof tp === 'string' ? tp : tp.point || tp.text || JSON.stringify(tp)}`
    ).join('\n') || k?.coreTeachingPoints?.slice(0, 5).map((tp, i) =>
        `${i + 1}. ${typeof tp === 'string' ? tp : tp.point || tp.text || JSON.stringify(tp)}`
    ).join('\n') || 'None stored yet.';

    const currentText = (currentArticles || []).slice(0, 6).map((a, i) =>
        `[RES-${i + 1}] ${a.title || 'Untitled'} (${a.pubdate || 'n.d.'}) — ${(a.abstract || '').slice(0, 250)}`
    ).join('\n\n') || 'No current results provided.';

    // Collect synapse topics from current articles
    const synapseTopics = [...new Set((currentArticles || []).flatMap((a) => a._synapseTopics || []))];

    const guidelineText = guidelines.length > 0
        ? guidelines.map((g, i) => `[G${i + 1}] ${g.source_body}${g.source_year ? ` (${g.source_year})` : ''}: ${g.recommendation_text.slice(0, 300)}`).join('\n')
        : 'No guideline context provided.';
    const retrievalText = buildRetrievalContext(retrieval);

    let learnerContext = '';
    if (userContext) {
        const { profile, mastery, weakTopics } = userContext;
        const persona = profile?.persona || 'learner';
        const preferredDifficulty = profile?.preferredDifficulty || 'mixed';
        const dailyGoalMins = profile?.dailyGoalMinutes || 15;
        const weakList = weakTopics?.length ? weakTopics.map((t) => t.topic).join(', ') : 'none identified yet';

        const masteryText = mastery
            ? `Mastery on this topic: ${mastery.overallScore}% overall. Breakdown — Recall: ${mastery.recallScore}%, Clinical Application: ${mastery.clinicalApplicationScore}%, Trial Interpretation: ${mastery.trialInterpretationScore}%, Guidelines: ${mastery.guidelineScore}%, Pitfalls: ${mastery.pitfallScore}%.`
            : 'No mastery data for this topic yet.';

        // Identify the learner's weakest question types for this topic
        const weakTypes = mastery ? [
            mastery.recallScore < 60 ? 'Recall' : null,
            mastery.clinicalApplicationScore < 60 ? 'Clinical Application' : null,
            mastery.trialInterpretationScore < 60 ? 'Trial Interpretation' : null,
            mastery.guidelineScore < 60 ? 'Guidelines' : null,
            mastery.pitfallScore < 60 ? 'Pitfalls' : null,
        ].filter(Boolean) : [];

        const weakTypeInstruction = weakTypes.length > 0
            ? `The learner consistently struggles with: ${weakTypes.join(', ')}. Prioritise these areas when generating MCQs or teaching.`
            : 'No specific weak areas detected for this topic yet.';

        const difficultyMap = {
            easy: 'foundational explanations and basic illness scripts',
            medium: 'intermediate depth focusing on initial management and diagnostics',
            hard: 'advanced nuance, trial critique, and controversial subgroup analysis',
            mixed: 'varied depth'
        };
        const difficultyInstruction = `Preferred difficulty: ${preferredDifficulty} — aim for ${difficultyMap[preferredDifficulty] || 'varied depth'}.`;

        // Session trajectory
        const previousQueries = userContext?.previousQueries || [];
        const trajectoryContext = previousQueries.length > 0
            ? `Session trajectory: ${previousQueries.join(' -> ')}\nKNOWLEDGE DELTA INSTRUCTION: The user has already explored the above topics in this session. Focus on NEW evidence, nuances, or contradictions NOT covered in previous steps. Avoid repeating basic points.`
            : '';

        // Weak outline nodes
        const weakOutlineNodeIds = userContext?.topicMemory?.weakOutlineNodeIds || [];
        const weakNodeContext = weakOutlineNodeIds.length > 0
            ? `Weak outline nodes for this topic: ${weakOutlineNodeIds.join(', ')}`
            : '';

        // Cross-topic synapses
        const synapseContext = synapseTopics.length > 0
            ? `Cross-topic synapses in current evidence: ${synapseTopics.join(', ')}`
            : '';

        // Normalise training stage: DB may return snake_case or camelCase; 'specialist' aliases 'clinician'
        const rawStage = profile?.trainingStage || profile?.training_stage || '';
        const normalisedStage = rawStage === 'specialist' ? 'clinician' : rawStage;

        const stageSpecifics = {
            'preclinical': 'SCAFFOLDING: Focus on mechanism and basic physiology. Use simple analogies. Avoid complex trial statistics. Prioritise definitions, drug classes, and classic associations. Do NOT cite methodological limitations or subgroup contradictions.',
            'early_clinical': 'SCAFFOLDING: Focus on illness scripts and initial management priorities. Use moderate-length vignettes. Emphasise "what would you do first" reasoning. Moderate clinical depth — avoid advanced statistical critique.',
            'finals': 'SCAFFOLDING: Focus on discriminators, next diagnostic steps, first-line management, contraindications, and exam traps. Include guideline-anchored reasoning. Aim for exam-ready precision.',
            'foundation_doctor': 'SCAFFOLDING: Focus on ESCALATION and SAFETY. Prioritise: (1) when to call a senior, (2) safe prescribing thresholds and drug interactions, (3) NEWS/deterioration criteria, (4) referral pathways, (5) what could go wrong acutely. Keep explanations practical and ward-applicable. Avoid abstract trial methodology.',
            'clinician': 'SCAFFOLDING: Focus on METHODOLOGICAL NUANCE and SUBGROUP CONTRADICTIONS. Critique study design, internal validity, and applicability limits. Discuss NNT/NNH in the context of comorbidity. Surface practice-changing uncertainties and areas of genuine expert disagreement. Do NOT oversimplify — the learner is a practising clinician.',
            'specialist': 'SCAFFOLDING: Focus on METHODOLOGICAL NUANCE and SUBGROUP CONTRADICTIONS. Critique study design, internal validity, and applicability limits. Discuss NNT/NNH in the context of comorbidity. Surface practice-changing uncertainties and areas of genuine expert disagreement. Do NOT oversimplify — the learner is a practising clinician.',
        };

        const scaffolding = stageSpecifics[normalisedStage] || stageSpecifics['finals'];

        learnerContext = `\n## Learner Profile
- Role / Persona: ${persona}
- Training Stage: ${normalisedStage || 'not specified'}
- ${scaffolding}
- Study streak: ${profile?.currentStreak || 0} days (personal best: ${profile?.longestStreak || 0})
- Daily goal: ${dailyGoalMins} minutes
- Weak topics across all study: ${weakList}
- ${masteryText}
- ${weakTypeInstruction}
- ${difficultyInstruction}
${trajectoryContext ? '\n' + trajectoryContext : ''}
${weakNodeContext ? '\n' + weakNodeContext : ''}
${synapseContext ? '\n' + synapseContext : ''}

CRITICAL INSTRUCTION: All responses MUST respect the SCAFFOLDING directive above.
ACTIVE REMEDIATION: If the learner has low mastery in a specific area (see mastery breakdown), provide scaffolding first, then build up to current evidence.
PROACTIVE LINKING: If the current query relates to one of the user's 'weak topics' or 'weak outline nodes', explicitly point out the connection and how this new evidence helps resolve that previous gap.
BRIDGE BUILDING: If the user pivots topics (e.g. from Sepsis to AKI), identify 'Synapses'—points where the evidence for the old and new topics intersect.`;
    }

    return `You are a clinical education mentor assistant specialising in evidence-based medicine.
You are helping a learner explore the topic: "${topic}".
Your goal is to evolve the learner's mental model with every interaction.${learnerContext}

## Your stored knowledge base for this topic
### Seminal papers
${seminalText}

### Core teaching points
${teachingText}

## Relevant clinical guidelines
${guidelineText}

## Retrieved app knowledge budget
${retrievalText}

## Current search results (live)
${currentText}
${crossTopicBridges.length > 0 ? `
## Cross-topic bridges
Papers stored in adjacent knowledge bases that intersect with this topic. These are NOT in the current search results but may be relevant when the learner's question spans related areas:
${crossTopicBridges.map((b, i) => `[BRIDGE-${i + 1}] "${b.paper}" — from the knowledge base on "${b.relatedTopic}"${b.principle ? `. Key principle: ${b.principle}` : ''}`).join('\n')}

PROACTIVE BRIDGE INSTRUCTION: If the user's question touches on a related area (e.g. ${crossTopicBridges.map((b) => `"${b.relatedTopic}"`).join(', ')}), proactively mention the relevant [BRIDGE-n] paper and explain how it connects to the current topic. Do not fabricate — only cite BRIDGE papers listed above.` : ''}

## Your role
- Guide the learner through the evidence, citing papers by their [index] number (RES-n for current search, MEM-n for topic memory) and guidelines by their [Gn] number.
- Answer clinical questions concisely and accurately, grounded in the papers and guidelines above.
- Clearly label whether a teaching point comes from a GUIDELINE or from RESEARCH PAPERS.
- PROACTIVE MENTORING: If you notice a logical gap or a missing piece of evidence in the user's query, suggest looking at specific papers from the 'Current search results' that address it.
- When asked, generate a brief MCQ or clinical vignette grounded in the evidence and guidelines.
- If something is uncertain or outside the papers/guidelines, say so explicitly.
- Keep responses focused: 2-4 sentences for simple questions, structured paragraphs for complex ones.
- If the learner asks to "generate a case" or "quiz me", respond with a short structured vignette or MCQ immediately.
- When generating quizzes, target the learner's weak areas (see Learner Profile above).
- If the learner has low mastery in a specific area, provide scaffolding and simpler explanations.
- Use the "Retrieved app knowledge budget" before general medical knowledge.
- KNOWLEDGE GAPS: When relevant, explicitly mention if a claim is untested, previously weak, or if topic memory is stale.
- CLAIM GROUNDING: If you rely on a grounded claim, cite it as [CLAIM-key] alongside paper/guideline references.
- CLAIM TRUST: Prefer human_reviewed, source_verified, guideline_supported, and abstract_only claims. Treat synthesis_inferred cautiously and agent_draft as unverified teaching notes.
- GUIDELINE ALIGNMENT: If evidence and guidelines appear misaligned or one is absent, say so conservatively and do not invent guideline positions.

Never fabricate references. If you cite a paper or guideline, it must appear in the lists above.`;
}

function inferDemandIntent(message) {
    const text = String(message || '').toLowerCase();
    if (/quiz|mcq|test me|question/.test(text)) return 'quiz';
    if (/case|vignette|scenario/.test(text)) return 'case';
    if (/guideline|nice|aha|esc|who|recommendation/.test(text)) return 'guideline';
    if (/limit|bias|overclaim|critique|method|validity/.test(text)) return 'appraisal';
    if (/summary|summarise|synopsis|bottom line/.test(text)) return 'synopsis';
    return 'agent_chat';
}

function extractGroundedClaimsFromReply(reply, { topic, objectKey }) {
    const claimRefPattern = /\[(?:CLAIM-[a-f0-9]{8,}|RES-\d+|MEM-\d+|G\d+)[^\]]*\]/i;
    return String(reply || '')
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length >= 40 && sentence.length <= 700 && claimRefPattern.test(sentence))
        .slice(0, 6)
        .map((sentence, ordinal) => ({
            claimKey: stableClaimKey(objectKey, sentence),
            ordinal,
            claimText: sentence,
            evidenceQuote: null,
            sourcePath: 'agent.answer',
            topic,
            conceptKey: 'agent_grounded_answer',
            confidence: 0.45,
            verificationStatus: CLAIM_VERIFICATION.AGENT_DRAFT,
            verificationReason: 'Claim was extracted from an agent chat answer and has not been source-verified.',
        }));
}

function parseHistoryForProvider(conversationHistory, _provider) {
    if (!Array.isArray(conversationHistory)) return [];
    return conversationHistory.slice(-12).map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content || '').slice(0, 2000),
    }));
}

const { setupSSE, sendSSE } = require('../utils/sse');

function registerAgentRoutes(app, { serverConfig, db, rateLimit, requireJson, requireAuthJwt }) {
    const ai = createAiService({ serverConfig, fetchImpl: safeFetch });

    app.post('/api/agent/chat', requireJson, requireAuthJwt, rateLimit(20, 60), async (req, res) => {
        const { topic, message, conversationHistory = [], currentArticles = [], previousQueries = [] } = req.body;

        if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
            return res.status(400).json({ error: 'topic is required' });
        }
        if (!message || typeof message !== 'string' || message.trim().length < 1) {
            return res.status(400).json({ error: 'message is required' });
        }

        const trimmedTopic = topic.trim().slice(0, 200);
        const trimmedMessage = message.trim().slice(0, 1000);

        try {
            const topicKnowledge = await db.getTopicKnowledge(trimmedTopic);

            const guidelines = await db.getGuidelinesByTopic(trimmedTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'getGuidelinesByTopic failed'); return []; });
            const normalizedTopic = db.normalizeTopic(trimmedTopic);
            const [teachingObjects, groundedClaims, claimMastery] = await Promise.all([
                db.listTeachingObjectsForTopic(trimmedTopic, { limit: 3 }).catch((err) => { logger.warn({ err }, 'all failed'); return []; }),
                db.listTeachingObjectClaimsForTopic(trimmedTopic, { limit: 5 }).catch((err) => { logger.warn({ err }, 'listTeachingObjectClaimsForTopic failed'); return []; }),
                req.user?.id ? db.getUserClaimMastery(req.user.id, trimmedTopic, { limit: 25 }).catch((err) => { logger.warn({ err }, 'getUserClaimMastery failed'); return []; }) : Promise.resolve([]),
            ]);
            const freshness = topicRefreshPriority({
                confidence: Number(topicKnowledge?.confidence || 0),
                refreshedAt: topicKnowledge?.lastRefreshedAt,
                topic: trimmedTopic,
                knowledge: topicKnowledge?.knowledge || {},
                totalSignals: currentArticles.length,
                distinctArticles: currentArticles.length,
                hasKnowledge: Boolean(topicKnowledge),
            });
            let personalGraphHooks = [];
            if (req.user?.id) {
                try {
                    const { buildPersonalKnowledgeGraph } = require('../services/personalKnowledgeGraphService');
                    const graph = await buildPersonalKnowledgeGraph(db, req.user.id, trimmedTopic);
                    personalGraphHooks = graph.agentHooks || [];
                } catch (err) {
                    logger.warn({ err }, 'personal knowledge graph for agent skipped');
                }
            }
            const retrieval = { teachingObjects, groundedClaims, claimMastery, freshness, personalGraphHooks };

            // Cross-topic bridge lookup: find seminal papers from related knowledge bases
            // that the current search didn't surface, using this topic's keywords as query seeds.
            const crossTopicBridges = [];
            if (topicKnowledge?.knowledge?.keywords?.length) {
                const keywords = (topicKnowledge.knowledge.keywords || []).slice(0, 3);
                const currentTitlesLower = new Set((currentArticles || []).map((a) => String(a.title || '').toLowerCase()));
                const seenTopics = new Set([trimmedTopic.toLowerCase()]);
                for (const kw of keywords) {
                    if (crossTopicBridges.length >= 4) break;
                    const { topics: relatedRows } = await db.listTopicKnowledge({ query: kw, limit: 5 }).catch((err) => { logger.warn({ err }, 'listTopicKnowledge failed'); return { topics: [] }; });
                    for (const rt of relatedRows) {
                        if (crossTopicBridges.length >= 4) break;
                        const rtName = String(rt.topic || '').toLowerCase();
                        if (seenTopics.has(rtName)) continue;
                        seenTopics.add(rtName);
                        const seminal = rt.knowledge?.seminalPapers?.[0];
                        if (seminal?.title && !currentTitlesLower.has(seminal.title.toLowerCase())) {
                            crossTopicBridges.push({
                                relatedTopic: rt.topic,
                                paper: seminal.title,
                                principle: seminal.clinicalPrinciple || seminal.whySeminal || '',
                            });
                        }
                    }
                }
            }

            // Fetch learner context if authenticated
            let userContext = null;
            if (req.user && req.user.id) {
                const [profile, mastery] = await Promise.all([
                    db.getLearningProfile(req.user.id).catch((err) => { logger.warn({ err }, 'getLearningProfile failed'); return null; }),
                    db.getUserTopicMastery(req.user.id, trimmedTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMastery failed'); return null; }),
                ]);
                const weakTopics = await db.listUserTopicMastery(req.user.id, { limit: 10, offset: 0 })
                    .then((list) => list.filter((m) => m.overallScore < 60).sort((a, b) => a.overallScore - b.overallScore).slice(0, 5))
                    .catch((err) => { logger.warn({ err }, 'operation failed'); return []; });
                userContext = {
                    profile,
                    mastery,
                    weakTopics,
                    previousQueries: Array.isArray(previousQueries) ? previousQueries.slice(-5) : [],
                    topicMemory: req.user?.id ? await db.getUserTopicMemory(req.user.id, trimmedTopic).catch((err) => { logger.warn({ err }, 'getUserTopicMemory failed'); return null; }) : null,
                };
            }

            const systemPrompt = buildAgentSystemPrompt(topicKnowledge, currentArticles, guidelines, userContext, crossTopicBridges, retrieval);
            const history = parseHistoryForProvider(conversationHistory);

            const { provider: selectedProvider, model: selectedModel } = resolveProvider({}, serverConfig);
            if (!selectedProvider) {
                return res.status(503).json({ error: 'No AI provider configured' });
            }

            // Build a single user turn that includes system context so aiService
            // stream methods can carry it as a prefix (Gemini handles systemInstruction
            // natively; Mistral gets it as the system role via callMistralStream).
            const fullPrompt = `${systemPrompt}\n\n---\n\n${trimmedMessage}`;

            setupSSE(res);

            let reply = '';
            try {
                const streamIter = selectedProvider === 'gemini'
                    ? ai.callGeminiStream(fullPrompt, selectedModel, { temperature: TEMPERATURE.explain, maxOutputTokens: 1800 })
                    : ai.callMistralStream(fullPrompt, selectedModel, { temperature: TEMPERATURE.explain, maxOutputTokens: 1800 });

                for await (const chunk of streamIter) {
                    reply += chunk;
                    sendSSE(res, 'chunk', { text: chunk });
                }
            } catch (streamErr) {
                sendSSE(res, 'error', { message: isDev ? streamErr.message : 'Stream failed' });
                return res.end();
            }

            if (!reply) {
                sendSSE(res, 'error', { message: 'AI returned an empty response' });
                return res.end();
            }

            sendSSE(res, 'done', { topic: trimmedTopic });
            res.end();

            // Post-response side effects — fire-and-forget, don't block the stream
            void (async () => {
                try {
                    await db.logEvent?.('agent_chat', req.sessionId, {
                        topic: trimmedTopic,
                        messageLength: trimmedMessage.length,
                        provider: selectedProvider,
                        historyTurns: history.length,
                        groundedClaimCount: groundedClaims.length,
                        weakClaimCount: claimMastery.filter((c) => c.masteryState === 'weak').length,
                    });
                    if (typeof db.recordLearningEvent === 'function') {
                        await Promise.allSettled([
                            db.recordLearningEvent({
                                userId: req.user?.id || null,
                                eventType: 'agent_message',
                                topic: trimmedTopic,
                                sourceType: 'agent_chat',
                                sourceId: req.sessionId || null,
                                payload: {
                                    role: 'user',
                                    messageLength: trimmedMessage.length,
                                    intent: inferDemandIntent(trimmedMessage),
                                    historyTurns: history.length,
                                },
                            }),
                            db.recordLearningEvent({
                                userId: req.user?.id || null,
                                eventType: 'agent_message',
                                topic: trimmedTopic,
                                sourceType: 'agent_chat',
                                sourceId: req.sessionId || null,
                                payload: {
                                    role: 'assistant',
                                    messageLength: reply.length,
                                    provider: selectedProvider,
                                    model: selectedModel,
                                    groundedClaimCount: groundedClaims.length,
                                    weakClaimCount: claimMastery.filter((c) => c.masteryState === 'weak').length,
                                },
                            }),
                        ]);
                    }
                    await Promise.allSettled([
                        db.recordTopicDemandSignal(trimmedTopic, trimmedTopic, inferDemandIntent(trimmedMessage)),
                        previousQueries?.length
                            ? db.maybeRegisterTopicAlias(trimmedTopic, previousQueries[previousQueries.length - 1])
                            : Promise.resolve(),
                    ]);
                    const crypto = require('crypto');
                    const answerObjectKey = `agent-answer:${crypto
                        .createHash('sha256')
                        .update(`${trimmedTopic}|${trimmedMessage}|${reply.slice(0, 800)}`)
                        .digest('hex')
                        .slice(0, 24)}`;
                    const answerClaims = extractGroundedClaimsFromReply(reply, { topic: trimmedTopic, objectKey: answerObjectKey });
                    if (answerClaims.length > 0) {
                        await db.upsertTeachingObject({
                            objectKey: answerObjectKey,
                            objectType: 'agent_answer',
                            topic: trimmedTopic,
                            title: `Agent answer: ${trimmedTopic}`,
                            confidence: 0.45,
                            provider: selectedProvider,
                            model: selectedProvider === 'gemini' ? PINNED_MODELS.gemini : PINNED_MODELS.mistral,
                            payload: {
                                kind: 'agent_answer_teaching_object',
                                prompt: trimmedMessage,
                                answer: reply,
                                claimAnchors: answerClaims,
                            },
                        }).catch((err) => req.log?.warn?.({ err }, 'Agent answer claim persistence skipped'));
                    }
                } catch (err) {
                    req.log?.warn?.({ err }, 'Agent post-stream side-effects failed');
                }
            })();
        } catch (error) {
            req.log?.error?.({ err: error, topic: trimmedTopic }, 'Agent chat error');
            if (!res.headersSent) {
                return res.status(500).json({ error: isDev ? error.message : 'Agent error — please try again' });
            }
            sendSSE(res, 'error', { message: isDev ? error.message : 'Agent error — please try again' });
            res.end();
        }
    });
}

module.exports = { registerAgentRoutes, buildAgentSystemPrompt, buildRetrievalContext, extractGroundedClaimsFromReply };
