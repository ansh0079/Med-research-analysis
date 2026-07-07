'use strict';

const { formatMisconceptionPromptBlock } = require('../../utils/misconceptionPromptBlock');
const { formatLearnerSnapshot } = require('../../services/learnerStateService');
const { buildRetrievalContext } = require('./agentHelpers');

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
        const difficultyInstruction = `Calibrated difficulty: ${effectiveDifficulty} (preferred: ${preferredDifficulty}) — aim for ${difficultyMap[effectiveDifficulty] || difficultyMap[preferredDifficulty] || 'varied depth'}.`;

        // Session trajectory
        const previousQueries = userContext?.previousQueries || [];
        const trajectoryContext = previousQueries.length > 0
            ? `Session trajectory: ${previousQueries.join(' -> ')}\nKNOWLEDGE DELTA INSTRUCTION: The user has already explored the above topics in this session. Focus on NEW evidence, nuances, or contradictions NOT covered in previous steps. Avoid repeating basic points.`
            : '';

        // Weak and uncovered outline nodes (with labels when available)
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

module.exports = { buildAgentSystemPrompt };
