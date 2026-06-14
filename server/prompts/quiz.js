const { formatStoredTopicKnowledgeForPrompt } = require('./_helpers');
const { formatLearnerPromptSupplement } = require('../services/learnerContextService');

function buildQuizPrompt(topic, articles = [], options = {}, guidelines = [], userContext = null) {
    const safeCount = Math.min(Math.max(parseInt(String(options.count || 5), 10) || 5, 3), 10);
    let difficulty = ['easy', 'medium', 'hard', 'mixed'].includes(options.difficulty) ? options.difficulty : 'mixed';
    const profileEffectiveDifficulty = userContext?.profile?.effectiveDifficulty
        || userContext?.profile?.preferredDifficulty
        || null;
    const promptVariant = ['control', 'clinical_discriminator'].includes(options.promptVariant)
        ? options.promptVariant
        : 'control';

    const VALID_STAGES = ['preclinical', 'early_clinical', 'finals', 'foundation_doctor', 'clinician', 'specialist'];
    const trainingStage = VALID_STAGES.includes(options.trainingStage)
        ? options.trainingStage
        : (userContext?.profile?.trainingStage && VALID_STAGES.includes(userContext.profile.trainingStage)
            ? userContext.profile.trainingStage
            : 'finals');

    const explanationDepth = ['foundation', 'exam_focus', 'mechanistic'].includes(options.explanationDepth)
        ? options.explanationDepth
        : (userContext?.profile?.defaultExplanationDepth && ['foundation', 'exam_focus', 'mechanistic'].includes(userContext.profile.defaultExplanationDepth)
            ? userContext.profile.defaultExplanationDepth
            : 'exam_focus');

    const TRAINING_RUBRIC = {
        preclinical: `TRAINING LEVEL: preclinical (basic science / early medical school).
- Prioritise mechanism, definitions, physiology, pharmacology class effects, and classic associations.
- Vignettes: very short (1–2 sentences) or use non-vignette stems when appropriate.
- Discriminators: obvious; avoid subtle attending-level traps.
- Question mix: at least 40% recall, ≤30% clinical_application.`,
        early_clinical: `TRAINING LEVEL: early clinical (clerks / junior clinical years).
- Balance mechanisms with illness scripts and initial management priorities.
- Vignettes: moderate length (3–5 sentences); include key vitals and one lab or exam finding.
- Discriminators: realistic student-level — not obscure subspecialty trivia.
- Question mix: roughly balanced recall and clinical_application.`,
        finals: `TRAINING LEVEL: finals / high-stakes exit exams (e.g. MBBS finals style).
- Emphasis on discriminators, next diagnostic step, first-line management, contraindications, and exam traps.
- Vignettes: tight but complete (4–7 sentences) when using clinical_application.
- Include guideline-anchored and pitfall questions where evidence allows.
- Question mix: favour clinical_application, guideline, pitfall; ≤25% pure recall.`,
        foundation_doctor: `TRAINING LEVEL: foundation doctor / intern (F1–F2 style).
- Prioritise safe practical management, escalation, handover-relevant decisions, realistic NHS/ward context (generic).
- Vignettes: reflect on-call decisions, drug interactions, acute deterioration, and referral thresholds.
- Discriminators: plausible "real ward" wrong answers.
- Question mix: heavy clinical_application and guideline; include pitfall.`,
        clinician: `TRAINING LEVEL: practising clinician (post-training, general or specialist practice).
- Focus on guideline updates, evidence-based controversies, nuanced phenotyping, and rare presentations.
- Vignettes: complex multi-system with competing priorities; include pharmacovigilance and comorbidity management.
- Discriminators: subtle; assume solid foundational knowledge.
- Question mix: guideline, pitfall, trial_interpretation; minimal pure recall.`,
        specialist: `TRAINING LEVEL: specialist / subspecialty trainee or consultant.
- Target advanced management decisions, guideline conflicts between societies, emerging evidence, and edge cases.
- Vignettes: complex atypical presentations with conflicting data; test higher-order synthesis.
- Discriminators: expert-level — fine distinctions between similar regimens or diagnostic criteria.
- Question mix: predominantly guideline, trial_interpretation, pitfall; avoid recall entirely.`,
    };

    let adaptiveInstruction = '';
    if (userContext) {
        const { mastery, profile } = userContext;
        if (difficulty === 'mixed' && ['easy', 'medium', 'hard'].includes(profileEffectiveDifficulty)) {
            difficulty = profileEffectiveDifficulty;
            adaptiveInstruction = `\nADAPTIVE DIFFICULTY (auto-calibrated): effectiveDifficulty=${profileEffectiveDifficulty} from recent quiz performance.`;
        } else if (mastery && mastery.overallScore !== undefined && difficulty === 'mixed') {
            if (mastery.overallScore < 40) difficulty = 'easy';
            else if (mastery.overallScore < 70) difficulty = 'medium';
            else difficulty = 'hard';
            adaptiveInstruction = `\nADAPTIVE DIFFICULTY (within this training level): This learner has ${mastery.overallScore}% overall mastery on this topic. Target weakest types: ${[
                mastery.recallScore < 60 ? 'recall' : null,
                mastery.clinicalApplicationScore < 60 ? 'clinical_application' : null,
                mastery.trialInterpretationScore < 60 ? 'trial_interpretation' : null,
                mastery.guidelineScore < 60 ? 'guideline' : null,
                mastery.pitfallScore < 60 ? 'pitfall' : null,
            ].filter(Boolean).join(', ') || 'balanced mix'}.`;
        }
        if (profile?.persona) {
            adaptiveInstruction += `\nFORMAL PERSONA LABEL: ${profile.persona} (secondary to TRAINING LEVEL above).`;
        }
        if (userContext.topicMemory) {
            const tm = userContext.topicMemory;
            const tier = tm.memoryTier === 'strong' ? 'strong' : tm.memoryTier === 'building' ? 'building' : 'sparse';
            const label = tier === 'strong' ? 'topic memory strong' : tier === 'building' ? 'topic memory building' : 'topic memory sparse';
            adaptiveInstruction += `\nADAPTIVE TOPIC MEMORY: "${label}" — repeated searches≈${Number(tm.searchCount || 0)}, tracked papers≈${Number(tm.topPaperCount || 0)}, saves≈${Number(tm.savedPaperCount || 0)}, weak outline nodes≈${Array.isArray(tm.weakOutlineNodeIds) ? tm.weakOutlineNodeIds.length : 0}. Prefer questions that address weak outline nodes and under-tested angles when OUTLINE NODES exist; align with TARGET GAPS when listed.`;
        }
        const learnerSupplement = formatLearnerPromptSupplement(userContext, {
            misconceptionLog: userContext.misconceptionLog || null,
        });
        if (learnerSupplement) {
            adaptiveInstruction += `\n${learnerSupplement}`;
        }
    }

    const EXPLAIN_RUBRIC = {
        foundation: `EXPLANATION DEPTH: foundation / "first principles".
- Main explanation: define terms, state core principle, then why the keyed answer fits.
- distractorRationale: for EACH wrong option letter, 1–2 sentences from first principles (no jargon pile-on).`,
        exam_focus: `EXPLANATION DEPTH: exam-focused / concise.
- Main explanation: crisp discriminating features and the one best reason the answer is correct.
- distractorRationale: each wrong option — what feature or step it misses or mis-prioritises (exam style).`,
        mechanistic: `EXPLANATION DEPTH: mechanistic / pathophysiology-forward.
- Main explanation: include causal chain where relevant.
- explanationDeep: 3–6 sentences on mechanism, receptor, or pathway (may extend main explanation).
- distractorRationale: tie wrong answers to flawed mechanistic reasoning where possible.`,
    };

    const difficultyInstruction = difficulty === 'mixed'
        ? 'Use mixed difficulty across the set (still bounded by TRAINING LEVEL).'
        : `Make every question ${difficulty} difficulty (still bounded by TRAINING LEVEL).`;
    const context = (articles || [])
        .slice(0, 5)
        .map((a, i) => `[SOURCE ${i + 1}]
Title: ${String(a.title || '').slice(0, 240)}
Abstract: ${String(a.abstract || '').slice(0, 900)}`)
        .join('\n\n');

    const guidelineContext = guidelines.length > 0
        ? guidelines.map((g, i) => `[GUIDELINE ${i + 1}]
Source: ${g.source_body}${g.source_year ? ` (${g.source_year})` : ''}
Recommendation: ${g.recommendation_text}${g.recommendation_strength ? ` | Strength: ${g.recommendation_strength}` : ''}${g.recommendation_certainty ? ` | Certainty: ${g.recommendation_certainty}` : ''}`).join('\n\n')
        : 'No guideline context provided.';

    const topicBaseline = formatStoredTopicKnowledgeForPrompt(options.topicKnowledge || null);

    const targetNodes = Array.isArray(options.targetNodes) ? options.targetNodes : [];
    const communityTopPicks = Array.isArray(options.communityTopPicks) ? options.communityTopPicks : [];
    const claimAnchors = Array.isArray(options.claimAnchors) ? options.claimAnchors : [];
    const teachingObjectContext = String(options.teachingObjectContext || '').trim();
    const questionCount = claimAnchors.length > 0 ? Math.min(safeCount, claimAnchors.length) : safeCount;

    // Build outline node list so AI can tag questions with outlineNodeId
    let outlineContext = '';
    if (options.topicKnowledge) {
        const tk = options.topicKnowledge;
        const knowledge = tk.knowledge || {};
        const teachingPoints = Array.isArray(knowledge.teachingPoints) ? knowledge.teachingPoints
            : Array.isArray(knowledge.coreTeachingPoints) ? knowledge.coreTeachingPoints : [];
        const mcqAngles = Array.isArray(knowledge.mcqAngles) ? knowledge.mcqAngles : [];
        const nodeLines = [];
        teachingPoints.slice(0, 12).forEach((point, i) => {
            const label = typeof point === 'string' ? point : (point.claim || point.point || point.text || '');
            if (label) nodeLines.push(`  tp-${i + 1}: ${String(label).slice(0, 180)}`);
        });
        mcqAngles.slice(0, 8).forEach((angle, i) => {
            nodeLines.push(`  mcq-${i + 1}: ${String(angle).slice(0, 180)}`);
        });
        if (nodeLines.length > 0) {
            outlineContext = `\nOUTLINE NODES (set "outlineNodeId" on each question to the best-matching node ID below; use null if none fits):\n${nodeLines.join('\n')}\n`;
        }
    }

    const targetContext = targetNodes.length > 0
        ? `\nTARGET THESE STUDY-RUN GAPS FIRST (write at least one question for each where possible, and set outlineNodeId exactly to the listed ID):\n${targetNodes
            .slice(0, safeCount)
            .map((node, i) => `  ${i + 1}. ${node.id} [${node.reason || 'needs review'}]: ${String(node.label || '').slice(0, 220)}`)
            .join('\n')}\n`
        : '';

    // Community signal: articles that many clinicians engaged with (saved/dwelled on)
    const communityContext = communityTopPicks.length > 0
        ? `\nCOMMUNITY INSIGHT — these papers have high real-world engagement among clinicians on this topic:\n${communityTopPicks
            .slice(0, 3)
            .map((p, i) => `  ${i + 1}. ${p.title || p.article_uid || 'Unknown'} (engagement score: ${p.weighted_score || 'high'})`)
            .join('\n')}\nINSTRUCTION: Prioritise at least one question grounded in the community's most-engaged paper(s) above. These represent what practising clinicians find difficult or important.\n`
        : '';

    const claimAnchorContext = claimAnchors.length > 0
        ? `\nCLAIM-ANCHORED MODE — Each question MUST test exactly ONE of the following stored claims (provenance backbone). Use the claim text as the knowledge target; wrong answers should reflect common confusions around THAT claim only.\nFor every question object, set "claimKey" to the exact hex string from the list (do not invent IDs).\n\nSTORED CLAIMS:\n${claimAnchors.map((c, i) => {
            const ids = (c.sourceIds || []).slice(0, 6).join(', ');
            return `  ${i + 1}. claimKey="${c.claimKey}" | validation=${c.validationStatus || 'unvalidated'} | sources=[${ids}]\n     claim: ${String(c.claimText || '').slice(0, 520)}${String(c.claimText || '').length > 520 ? '…' : ''}`;
        }).join('\n')}\n\nRULES FOR CLAIM MODE:\n- Emit exactly ${questionCount} questions (one distinct claimKey per question; no duplicates).\n- The keyed correct option must be faithful to the claim; cite Source [n] or Guideline when the claim references evidence.\n- Do not introduce new clinical claims beyond what is implied by the listed claim + provided RESEARCH/GUIDELINE context.\n`
        : '';

    // Collective memory: misconceptions observed across ALL users on this topic
    let collectiveMisconceptionContext = '';
    const knownMisconceptions = Array.isArray(options.knownMisconceptions) ? options.knownMisconceptions : [];
    if (knownMisconceptions.length > 0) {
        const lines = knownMisconceptions.slice(0, 5).map((m, i) =>
            `  ${i + 1}. "${m.questionText}" — ${m.pickRate}% of users wrongly answered: "${m.wrongAnswer}"`
        ).join('\n');
        collectiveMisconceptionContext = `\nCOLLECTIVE MISCONCEPTIONS — across all learners on this topic, these wrong answers were consistently chosen:\n${lines}\nINSTRUCTION: Generate at least one question directly targeting the most common misconception above. Frame it so the wrong answer is a plausible distractor — explain clearly in the rationale why it is incorrect.\n`;
    }

    // Personal misconceptions: THIS specific learner's repeated wrong-answer patterns
    let personalMisconceptionContext = '';
    const personalMisconceptions = Array.isArray(options.personalMisconceptions) ? options.personalMisconceptions : [];
    if (personalMisconceptions.length > 0) {
        const lines = personalMisconceptions.slice(0, 3).map((m, i) => {
            const category = m.misconceptionCategory ? ` [${m.misconceptionCategory}]` : '';
            return `  ${i + 1}. Claim "${m.claimKey}"${category} — this learner has picked "${m.wrongOptionText}" ${m.count} time${m.count === 1 ? '' : 's'} instead of "${m.correctOptionText || 'the correct answer'}".`;
        }).join('\n');
        personalMisconceptionContext = `\nPERSONAL MISCONCEPTIONS — this learner has repeatedly chosen the wrong answer on these specific claims:\n${lines}\nINSTRUCTION: Generate at least one question that directly tests the same claim with a very similar distractor. In the explanation, explicitly contrast the wrong option with the correct one and clarify the distinguishing feature.\n`;
    }

    // Build a hint for nodes learners previously flagged as confusing, so the AI writes
    // richer, more mechanistic explanations for those specific concepts.
    let confusingNodeContext = '';
    if (options.topicKnowledge?.knowledge?.confusingNodes) {
        const confusingNodes = options.topicKnowledge.knowledge.confusingNodes;
        const flagged = Object.entries(confusingNodes)
            .filter(([, v]) => (v.confusingCount || 0) >= 2)
            .sort(([, a], [, b]) => (b.confusingCount || 0) - (a.confusingCount || 0))
            .slice(0, 4);
        if (flagged.length > 0) {
            confusingNodeContext = `\nLEARNER CONFUSION LOG — previous learners flagged these outline nodes as confusing:\n${flagged.map(([id, v]) => `  ${id}: flagged ${v.confusingCount} time${v.confusingCount === 1 ? '' : 's'}`).join('\n')}\nINSTRUCTION: When writing questions or explanations for these nodes, provide especially clear mechanistic reasoning. Spell out the causal chain rather than assuming background knowledge.\n`;
        }
    }

    const variantInstruction = promptVariant === 'clinical_discriminator'
        ? `\nPROMPT VARIANT: clinical_discriminator.
- Make each stem test the highest-yield discriminator between the keyed answer and the most tempting distractor.
- Prefer "next best step", "most likely explanation", or "safest action" framing when clinically appropriate.
- Explanations should explicitly name why the keyed answer beats the closest wrong answer.\n`
        : `\nPROMPT VARIANT: control.
- Use the standard balanced teaching style from the rubrics above.\n`;

    return `You are a medical educator writing single-best-answer MCQs aligned to a specific TRAINING LEVEL (not one-size-fits-all).
Generate ${questionCount} high-quality questions about "${String(topic || '').trim()}".

${TRAINING_RUBRIC[trainingStage] || TRAINING_RUBRIC.finals}

${EXPLAIN_RUBRIC[explanationDepth] || EXPLAIN_RUBRIC.exam_focus}

${variantInstruction}

${topicBaseline ? `${topicBaseline}\n` : ''}${teachingObjectContext ? `REUSABLE PAPER TEACHING OBJECTS:\n${teachingObjectContext}\n\nINSTRUCTION: Treat these as the preferred quiz seed for bottom line, misconception traps, and paper-specific appraisal angles. Still ground source-specific claims in RESEARCH CONTEXT indices.\n\n` : ''}${outlineContext}${targetContext}${communityContext}${claimAnchorContext}${collectiveMisconceptionContext}${personalMisconceptionContext}${confusingNodeContext}RESEARCH CONTEXT:
${context || 'No article context supplied. Use standard evidence-based medical knowledge for the topic, and avoid unsupported claims.'}

GUIDELINE CONTEXT:
${guidelineContext}

When explaining answers, append a source label in square brackets at the end of each explanation:
- Use [Trial] when the rationale comes from a randomised trial or study in the RESEARCH CONTEXT.
- Use [Guideline] when the rationale comes from the GUIDELINE CONTEXT.
- Use [Topic memory] when the rationale comes from the STORED TOPIC BASELINE or general topic knowledge.
Place the label at the very end of the explanation string, e.g. "...therefore first-line management is metformin. [Guideline]"

Difficulty instruction: ${difficultyInstruction}${adaptiveInstruction}

Return ONLY valid JSON with no prose. Use this exact shape:
{"questions":[
  {
    "type": "multiple_choice",
    "questionType": "recall" | "clinical_application" | "trial_interpretation" | "guideline" | "pitfall",
    "question": "Stem appropriate to TRAINING LEVEL (vignette length per rubric).",
    "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
    "correctAnswer": "B",
    "explanation": "Main explanation per EXPLANATION DEPTH.",
    "explanationDeep": "For mechanistic depth ONLY: non-empty mechanistic paragraph; otherwise use null or omit.",
    "whyOthersWrong": "One short paragraph summary of wrong options (legacy summary).",
    "distractorRationale": { "A": "why A is wrong", "B": "why B is wrong", "C": "...", "D": "..." },
    "visualExplanation": {
      "kind": "flowchart" | "comparison_table" | "mechanism",
      "title": "short title",
      "steps": ["Only for flowchart/mechanism: 3-5 concise causal or decision steps"],
      "columns": ["Only for comparison_table: 2-4 column headings"],
      "rows": [["Only for comparison_table: cells aligned to columns"]]
    },
    "difficulty": "easy" | "medium" | "hard",
    "sourceArticle": "article title or null",
    "sourceReference": "Source 1 or Source 1, 3",
    "sourceIndices": [1],
    "outlineNodeId": "tp-2 | mcq-1 | null"${claimAnchors.length > 0 ? ',\n    "claimKey": "<exact claimKey from STORED CLAIMS list>"' : ''}
  }
]}

Rules:
- Follow TRAINING LEVEL for vignette length, discriminant difficulty, and question-type mix.
- distractorRationale MUST include an entry for every option letter A–D; for the CORRECT option, the value should be brief: "Correct — keyed answer." or similar.
- visualExplanation is optional but SHOULD be present when it would clarify a mechanism, decision pathway, or close differential; keep it concise and factual.
- Prefer case-vignette clinical_application when TRAINING LEVEL allows; use recall-heavy stems only when rubric demands it.
- When a STORED TOPIC BASELINE is present, align several questions with its teaching points and MCQ angles while keeping every question answerable from RESEARCH CONTEXT (cite Source [n]) or GUIDELINE CONTEXT (cite Guideline [Gn]) — never cite baseline ordinals as if they were SOURCE numbers.
- Questions must be answerable using the provided RESEARCH CONTEXT when article context exists.
- If TARGET STUDY-RUN GAPS are provided, prioritize those nodes over broad topic coverage.
- outlineNodeId must be one of the listed target/outline node IDs when the question maps to one.
- Do not create true/false questions.
- correctAnswer must be the option letter only: "A", "B", "C", or "D".
- sourceIndices must be 1-based integers referencing SOURCE blocks above.
- For mechanistic explanationDepth, explanationDeep must be a non-empty string on every item.${claimAnchors.length > 0 ? '\n- CLAIM MODE: claimKey is REQUIRED on every object and must match one of the listed keys exactly; one question per claimKey.' : ''}`;
}

module.exports = { buildQuizPrompt };
