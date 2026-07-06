'use strict';

const logger = require('../config/logger');
const { formatMisconceptionPromptBlock } = require('../utils/misconceptionPromptBlock');
const { formatLearnerSnapshot } = require('./learnerStateService');

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

function buildAgentEvidenceAnchors({ currentArticles = [], guidelines = [], groundedClaims = [] } = {}) {
    return [
        ...(Array.isArray(currentArticles) ? currentArticles.slice(0, 5).map((article) => ({
            type: 'paper',
            uid: article.uid || article.pmid || article.doi || null,
            title: article.title,
            source: article.source || article.journal || null,
            confidence: article._quality?.score != null ? Number(article._quality.score) / 100 : null,
        })) : []),
        ...(Array.isArray(guidelines) ? guidelines.slice(0, 3).map((guideline) => ({
            type: 'guideline',
            uid: guideline.id || guideline.guidelineId || null,
            title: guideline.recommendationText || guideline.title,
            source: [guideline.sourceBody, guideline.sourceYear].filter(Boolean).join(' '),
            confidence: guideline.confidence || null,
            verificationStatus: guideline.reviewStatus || null,
        })) : []),
        ...(Array.isArray(groundedClaims) ? groundedClaims.slice(0, 6).map((claim) => ({
            type: 'grounded_claim',
            uid: claim.claimKey || null,
            title: claim.claimText,
            source: claim.sourcePath || null,
            confidence: claim.confidence || null,
            verificationStatus: claim.verificationStatus || null,
        })) : []),
    ];
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
        const effectiveDifficulty = profile?.effectiveDifficulty || preferredDifficulty;
        const dailyGoalMins = profile?.dailyGoalMinutes || 15;
        const weakTopicLabels = [
            ...(Array.isArray(weakTopics) ? weakTopics.map((t) => t.topic || t).filter(Boolean) : []),
            ...(Array.isArray(userContext.profileWeakTopics) ? userContext.profileWeakTopics : []),
        ];
        const weakList = [...new Set(weakTopicLabels)].slice(0, 8).join(', ') || 'none identified yet';

        const velocityLine = userContext?.learningVelocity
            ? ` Learning velocity: ${userContext.learningVelocity.pointsPerDay > 0 ? '+' : ''}${userContext.learningVelocity.pointsPerDay} points/day (${userContext.learningVelocity.trend}).`
            : '';

        const masteryText = mastery
            ? `Mastery on this topic: ${mastery.overallScore}% overall. Breakdown — Recall: ${mastery.recallScore}%, Clinical Application: ${mastery.clinicalApplicationScore}%, Trial Interpretation: ${mastery.trialInterpretationScore}%, Guidelines: ${mastery.guidelineScore}%, Pitfalls: ${mastery.pitfallScore}%.${velocityLine}`
            : 'No mastery data for this topic yet.';

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
            mixed: 'varied depth',
        };
        const difficultyInstruction = `Calibrated difficulty: ${effectiveDifficulty} (preferred: ${preferredDifficulty}) — aim for ${difficultyMap[effectiveDifficulty] || difficultyMap[preferredDifficulty] || 'varied depth'}.`;

        const previousQueries = userContext?.previousQueries || [];
        const trajectoryContext = previousQueries.length > 0
            ? `Session trajectory: ${previousQueries.join(' -> ')}\nKNOWLEDGE DELTA INSTRUCTION: The user has already explored the above topics in this session. Focus on NEW evidence, nuances, or contradictions NOT covered in previous steps. Avoid repeating basic points.`
            : '';

        const weakOutlineNodes = userContext?.weakOutlineNodes || [];
        const uncoveredOutlineNodes = userContext?.uncoveredOutlineNodes || [];
        const weakNodeContext = weakOutlineNodes.length > 0
            ? `Weak outline nodes for this topic:\n${weakOutlineNodes.map((node) => `- [${node.id}] ${node.label}`).join('\n')}`
            : (userContext?.topicMemory?.weakOutlineNodeIds?.length
                ? `Weak outline nodes for this topic: ${userContext.topicMemory.weakOutlineNodeIds.join(', ')}`
                : '');
        const uncoveredNodeContext = uncoveredOutlineNodes.length > 0
            ? `Uncovered outline nodes (not yet quizzed for this learner):\n${uncoveredOutlineNodes.map((node) => `- [${node.id}] ${node.label}`).join('\n')}\nPROACTIVE INSTRUCTION: Surface at least one uncovered node when relevant — offer to teach or quiz it without waiting for the learner to ask.`
            : '';

        const persistedSummary = userContext?.persistedConversationSummary
            ? String(userContext.persistedConversationSummary).trim().slice(0, 2400)
            : '';
        const persistedSummaryBlock = persistedSummary
            ? `\n## Prior thread memory (persisted)\n${persistedSummary}\nContinue from this state; do not re-teach basics already covered unless the learner asks.`
            : '';

        const trajectoryText = userContext?.learningTrajectory
            ? String(userContext.learningTrajectory).trim().slice(0, 2000)
            : '';
        const trajectoryBlock = trajectoryText
            ? `\n## Learning trajectory (recent platform activity)\n${trajectoryText}`
            : '';

        const snapshotText = formatLearnerSnapshot(userContext?.learnerSnapshot);
        const snapshotBlock = snapshotText
            ? `\n## Learner snapshot from past chats\n${snapshotText}`
            : '';

        const synapseContext = synapseTopics.length > 0
            ? `Cross-topic synapses in current evidence: ${synapseTopics.join(', ')}`
            : '';

        const { normaliseAgentStage } = require('../prompts/trainingStages');
        const rawStage = profile?.trainingStage || profile?.training_stage || '';
        const normalisedStage = normaliseAgentStage(rawStage);

        const stageSpecifics = {
            preclinical: 'SCAFFOLDING: Focus on mechanism and basic physiology. Use simple analogies. Avoid complex trial statistics. Prioritise definitions, drug classes, and classic associations. Do NOT cite methodological limitations or subgroup contradictions.',
            early_clinical: 'SCAFFOLDING: Focus on illness scripts and initial management priorities. Use moderate-length vignettes. Emphasise "what would you do first" reasoning. Moderate clinical depth — avoid advanced statistical critique.',
            finals: 'SCAFFOLDING: Focus on discriminators, next diagnostic steps, first-line management, contraindications, and exam traps. Include guideline-anchored reasoning. Aim for exam-ready precision.',
            foundation_doctor: 'SCAFFOLDING: Focus on ESCALATION and SAFETY. Prioritise: (1) when to call a senior, (2) safe prescribing thresholds and drug interactions, (3) NEWS/deterioration criteria, (4) referral pathways, (5) what could go wrong acutely. Keep explanations practical and ward-applicable. Avoid abstract trial methodology.',
            clinician: 'SCAFFOLDING: Focus on METHODOLOGICAL NUANCE and SUBGROUP CONTRADICTIONS. Critique study design, internal validity, and applicability limits. Discuss NNT/NNH in the context of comorbidity. Surface practice-changing uncertainties and areas of genuine expert disagreement. Do NOT oversimplify — the learner is a practising clinician.',
        };

        const scaffolding = stageSpecifics[normalisedStage] || stageSpecifics.finals;

        const misconceptionBlock = formatMisconceptionPromptBlock({
            personalMisconceptions: userContext.personalMisconceptions,
            inferredMisconceptions: userContext.inferredMisconceptions,
            style: 'agent',
        });

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
${uncoveredNodeContext ? '\n' + uncoveredNodeContext : ''}
${synapseContext ? '\n' + synapseContext : ''}
${persistedSummaryBlock}
${trajectoryBlock}
${snapshotBlock}

CRITICAL INSTRUCTION: All responses MUST respect the SCAFFOLDING directive above.
ACTIVE REMEDIATION: If the learner has low mastery in a specific area (see mastery breakdown), provide scaffolding first, then build up to current evidence.
PROACTIVE LINKING: If the current query relates to one of the user's 'weak topics' or 'weak outline nodes', explicitly point out the connection and how this new evidence helps resolve that previous gap.
BREAKTHROUGH CONTINUITY: If breakthrough moments are listed in the learner snapshot, reference them when building on prior understanding — do not re-explain from scratch what the learner already clicked on.
BRIDGE BUILDING: If the user pivots topics (e.g. from Sepsis to AKI), identify 'Synapses'—points where the evidence for the old and new topics intersect.${misconceptionBlock}`;
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

function formatRecentMessages(conversationHistory, count = 4) {
    if (!Array.isArray(conversationHistory)) return [];
    return conversationHistory.slice(-count).map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: String(msg.content || '').slice(0, 2000),
    }));
}

async function summarizeOlderMessages(ai, conversationHistory, recentCount = 4, provider, model) {
    if (!Array.isArray(conversationHistory) || conversationHistory.length <= recentCount) {
        return null;
    }
    const olderMessages = conversationHistory.slice(0, -recentCount);
    if (olderMessages.length === 0) return null;

    const olderText = olderMessages
        .slice(-12)
        .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 500)}`)
        .join('\n');

    if (olderText.length < 100) return null;

    if (!ai) {
        return olderMessages.slice(-4)
            .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 200)}`)
            .join('\n');
    }

    try {
        const summary = await ai.callText(
            `Summarise this medical education conversation into 3-5 bullet points. Focus on: topics discussed, key conclusions reached, questions still open, and areas the learner struggled with.\n\n${olderText}`,
            provider,
            model,
            { temperature: 0.0, maxOutputTokens: 300, timeoutMs: 6000 }
        );
        return String(summary || '').trim() || null;
    } catch (err) {
        logger.debug({ err }, 'Conversation summarization failed, using truncation fallback');
        return olderMessages.slice(-4)
            .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${String(msg.content || '').slice(0, 200)}`)
            .join('\n');
    }
}

function buildSessionFeedbackContext(sessionFeedback) {
    if (!sessionFeedback) return '';
    const { topic, score, totalQuestions, weakAreas, lastExplanationTopic } = sessionFeedback;
    if (score == null || totalQuestions == null) return '';
    const pct = Math.round((score / totalQuestions) * 100);
    if (pct >= 60) return '';

    const parts = [
        '\n## Session feedback — previous explanation did not land',
        `The learner just scored ${score}/${totalQuestions} (${pct}%) on "${topic || lastExplanationTopic || 'this topic'}" immediately after your explanation.`,
        'Your previous teaching approach was insufficient. Adapt your strategy:',
        '- Try a DIFFERENT angle: use analogies, clinical scenarios, or step-by-step reasoning instead of repeating the same points.',
        '- Start from fundamentals before building to complexity.',
        '- Ask the learner what confused them before launching into another explanation.',
    ];
    if (Array.isArray(weakAreas) && weakAreas.length > 0) {
        parts.push(`- Specific weak areas: ${weakAreas.join(', ')}. Focus here.`);
    }
    return parts.join('\n');
}

function parseHistoryForProvider(conversationHistory, _provider) {
    return formatRecentMessages(conversationHistory, 12);
}

module.exports = {
    buildAgentSystemPrompt,
    buildRetrievalContext,
    buildAgentEvidenceAnchors,
    buildSessionFeedbackContext,
    summarizeOlderMessages,
    formatRecentMessages,
    parseHistoryForProvider,
};
