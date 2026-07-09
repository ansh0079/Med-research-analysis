'use strict';

const crypto = require('crypto');
const { topicRefreshPriority } = require('./topicKnowledgeFreshness');
const { stableArticleUid } = require('../utils/articleKeys');
const {
    applyAbstractOnlyConfidence,
    isAbstractOnlySource,
    isHighCertaintyQuizEligible,
} = require('./paperSynopsisTrust');

function safeArray(value, max = 8) {
    return Array.isArray(value) ? value.filter(Boolean).slice(0, max) : [];
}

function safeString(value, max = 900) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function stableClaimKey(seed, text) {
    return crypto
        .createHash('sha256')
        .update(`${seed}|${safeString(text, 500)}`)
        .digest('hex')
        .slice(0, 24);
}

const CLAIM_VERIFICATION = {
    SOURCE_VERIFIED: 'source_verified',
    FULL_TEXT_AVAILABLE: 'full_text_available',
    ABSTRACT_ONLY: 'abstract_only',
    SYNTHESIS_INFERRED: 'synthesis_inferred',
    AGENT_DRAFT: 'agent_draft',
    GUIDELINE_SUPPORTED: 'guideline_supported',
    GUIDELINE_UNCERTAIN: 'guideline_uncertain',
    GUIDELINE_CONFLICT: 'guideline_conflict',
    STALE_NEEDS_REFRESH: 'stale_needs_refresh',
    HUMAN_REVIEWED: 'human_reviewed',
    UNVERIFIED: 'unverified',
};

function claimVerificationForPaper(article = {}, studyType = 'other', synopsisResult = {}) {
    if (studyType === 'guideline_or_statement') {
        return {
            verificationStatus: CLAIM_VERIFICATION.GUIDELINE_SUPPORTED,
            verificationReason: 'Claim is derived from a guideline or consensus document synopsis.',
        };
    }
    const fullTextCoverageRatio = Number(synopsisResult?.audit?.fullTextCoverageRatio ?? 0);
    if (Number.isFinite(fullTextCoverageRatio) && fullTextCoverageRatio > 0) {
        return {
            verificationStatus: CLAIM_VERIFICATION.SOURCE_VERIFIED,
            verificationReason: 'Claim is grounded in indexed full text used during synopsis generation.',
        };
    }
    const isOpen = article.pmcid || article.fullTextUrl || article.openAccessUrl || article.isFree || article.openAccess;
    return {
        verificationStatus: CLAIM_VERIFICATION.ABSTRACT_ONLY,
        verificationReason: isOpen
            ? 'Article appears open/free, but indexed full text was not confirmed during synopsis generation.'
            : 'Claim is grounded in available abstract/metadata rather than confirmed full text.',
    };
}

function evidenceQuoteFromArticle(article = {}, fallback = '') {
    const abstract = safeString(article.abstract || '', 900);
    if (abstract) return abstract;
    return safeString(fallback, 900) || null;
}

const CONCEPT_RELATIONS = {
    clinical_bottom_line: ['main_findings', 'quiz_focus'],
    main_findings: ['limitations', 'clinical_bottom_line'],
    limitations: ['misconception_trap', 'main_findings'],
    misconception_trap: ['clinical_bottom_line', 'quiz_focus'],
    quiz_focus: ['clinical_bottom_line', 'misconception_trap'],
    consensus_statement: ['agreement', 'clinical_bottom_line'],
    agreement: ['uncertainty', 'consensus_statement'],
    uncertainty: ['misconception_trap', 'agreement'],
};

function buildKnowledgeGraphRelationships({
    objectKey,
    objectType,
    topic = '',
    articleUid = null,
    includedArticleUids = [],
    claimAnchors = [],
} = {}) {
    const normalizedTopic = String(topic || '').trim().toLowerCase().replace(/\s+/g, '-');
    const topicNodeId = normalizedTopic ? `topic:${normalizedTopic}` : null;
    const nodes = [];
    const edges = [];
    const seenNodes = new Set();

    const addNode = (node) => {
        if (!node?.id || seenNodes.has(node.id)) return;
        seenNodes.add(node.id);
        nodes.push(node);
    };
    const addEdge = (from, to, relation, meta = {}) => {
        if (!from || !to) return;
        edges.push({ from, to, relation, ...meta });
    };

    if (topicNodeId) {
        addNode({ id: topicNodeId, type: 'topic', label: topic, objectKey });
    }

    const paperUids = [
        ...(articleUid ? [articleUid] : []),
        ...includedArticleUids,
    ].filter(Boolean);
    const uniquePaperUids = [...new Set(paperUids)].slice(0, 12);
    for (const uid of uniquePaperUids) {
        const paperId = `paper:${uid}`;
        addNode({ id: paperId, type: 'paper', label: uid, articleUid: uid, objectKey });
        if (topicNodeId) addEdge(paperId, topicNodeId, 'supports_topic', { objectType });
    }

    const anchorsByConcept = new Map();
    for (const claim of claimAnchors) {
        const claimNodeId = `claim:${claim.claimKey}`;
        addNode({
            id: claimNodeId,
            type: 'claim',
            label: safeString(claim.claimText, 120),
            claimKey: claim.claimKey,
            conceptKey: claim.conceptKey || null,
            confidence: claim.confidence ?? null,
            verificationStatus: claim.verificationStatus || null,
            objectKey,
        });
        if (topicNodeId) addEdge(topicNodeId, claimNodeId, 'teaches', { conceptKey: claim.conceptKey || null });
        if (claim.articleUid) addEdge(`paper:${claim.articleUid}`, claimNodeId, 'grounds', { objectKey });

        const conceptKey = claim.conceptKey || 'teaching_object';
        if (!anchorsByConcept.has(conceptKey)) anchorsByConcept.set(conceptKey, []);
        anchorsByConcept.get(conceptKey).push(claim);
    }

    for (const [conceptKey, anchors] of anchorsByConcept.entries()) {
        const relatedConcepts = CONCEPT_RELATIONS[conceptKey] || [];
        for (const relatedConcept of relatedConcepts) {
            const relatedAnchors = anchorsByConcept.get(relatedConcept) || [];
            for (const source of anchors.slice(0, 2)) {
                for (const target of relatedAnchors.slice(0, 2)) {
                    if (source.claimKey === target.claimKey) continue;
                    const relation = conceptKey === 'misconception_trap' || relatedConcept === 'misconception_trap'
                        ? 'contrasts'
                        : 'relates_to';
                    addEdge(`claim:${source.claimKey}`, `claim:${target.claimKey}`, relation, {
                        fromConcept: conceptKey,
                        toConcept: relatedConcept,
                    });
                }
            }
        }
    }

    if (objectType === 'topic_consensus' && includedArticleUids.length > 1) {
        for (let i = 0; i < Math.min(includedArticleUids.length - 1, 4); i++) {
            addEdge(
                `paper:${includedArticleUids[i]}`,
                `paper:${includedArticleUids[i + 1]}`,
                'co_cited',
                { objectKey }
            );
        }
    }

    return {
        objectKey,
        objectType,
        topic,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes,
        edges,
    };
}

function buildClaimAnchors(seed, candidates, {
    article = {},
    topic = '',
    confidence = 0.5,
    verification = {},
    abstractOnly = false,
    reviewState = 'unreviewed',
} = {}) {
    const seen = new Set();
    const out = [];
    candidates.forEach((candidate) => {
        const claimText = safeString(candidate.claimText || candidate.text, 700);
        if (!claimText) return;
        const claimKey = stableClaimKey(seed, claimText);
        if (seen.has(claimKey)) return;
        seen.add(claimKey);
        const conceptKey = candidate.conceptKey || safeString(candidate.sourcePath || 'teaching_object', 80);
        const verificationStatus = candidate.verificationStatus || verification.verificationStatus || CLAIM_VERIFICATION.UNVERIFIED;
        const rawConfidence = Math.max(0, Math.min(1, Number(candidate.confidence || confidence || 0.5)));
        const cappedConfidence = applyAbstractOnlyConfidence(rawConfidence, conceptKey, abstractOnly);
        const claimReviewState = candidate.reviewState || reviewState || 'unreviewed';
        const claim = {
            claimKey,
            ordinal: out.length,
            claimText,
            evidenceQuote: safeString(candidate.evidenceQuote || evidenceQuoteFromArticle(article, claimText), 900),
            sourcePath: candidate.sourcePath || 'article.abstract',
            articleUid: article.uid || article.pmid || article.doi || null,
            topic,
            conceptKey,
            confidence: cappedConfidence,
            verificationStatus,
            verificationReason: candidate.verificationReason || verification.verificationReason || null,
            verifiedAt: candidate.verifiedAt || verification.verifiedAt || null,
            reviewState: claimReviewState,
            highCertaintyEligible: isHighCertaintyQuizEligible({
                verificationStatus,
                conceptKey,
                reviewState: claimReviewState,
            }),
        };
        if (abstractOnly && verificationStatus === CLAIM_VERIFICATION.ABSTRACT_ONLY && !claim.verificationReason) {
            claim.verificationReason = 'Lower-trust abstract-only claim; not eligible for high-certainty quiz or guideline promotion.';
        }
        out.push(claim);
    });
    return out.slice(0, 12);
}

function inferStudyType(article = {}, synopsis = {}) {
    const text = [
        synopsis.studyDesign,
        article.studyDesign,
        ...(Array.isArray(article.pubtype) ? article.pubtype : []),
        article.title,
    ].filter(Boolean).join(' ').toLowerCase();
    if (/meta|systematic review/.test(text)) return 'meta_analysis';
    if (/random|rct|trial/.test(text)) return 'randomized_trial';
    if (/cohort/.test(text)) return 'cohort';
    if (/case.control/.test(text)) return 'case_control';
    if (/guideline|consensus|statement/.test(text)) return 'guideline_or_statement';
    return 'other';
}

function buildPaperTeachingObject({ article, synopsisResult, topic = '' }) {
    const synopsis = synopsisResult?.synopsis || {};
    const articleUid = stableArticleUid(article);
    const studyType = inferStudyType(article, synopsis);
    const title = article.title || synopsis.title || articleUid;
    const generatedAt = synopsisResult?.timestamp || new Date().toISOString();
    const objectKey = `paper:${articleUid}`;
    const confidence = synopsis.trustRating === 'HIGH' ? 0.85
        : synopsis.trustRating === 'MODERATE' ? 0.68
            : synopsis.trustRating === 'LOW' ? 0.45 : 0.3;
    const verification = claimVerificationForPaper(article, studyType, synopsisResult);
    const fullTextCoverageRatio = Number(synopsisResult?.audit?.fullTextCoverageRatio ?? 0);
    const abstractOnly = isAbstractOnlySource(fullTextCoverageRatio);
    const reviewState = synopsisResult?.audit?.reviewState || 'unreviewed';
    const objectConfidence = abstractOnly
        ? Math.min(confidence, 0.42)
        : confidence;
    const claimAnchors = buildClaimAnchors(objectKey, [
        { claimText: synopsis.bottomLine || synopsis.clinicalMeaning || synopsis.practiceImplication, sourcePath: 'synopsis.bottomLine', conceptKey: 'clinical_bottom_line' },
        { claimText: synopsis.mainFindings, sourcePath: 'synopsis.mainFindings', conceptKey: 'main_findings' },
        { claimText: synopsis.limitations, sourcePath: 'synopsis.limitations', conceptKey: 'limitations' },
        ...safeArray(synopsis.quizFocusPoints, 5).map((item) => ({ claimText: item, sourcePath: 'synopsis.quizFocusPoints', conceptKey: 'quiz_focus' })),
        ...safeArray(synopsis.whatNotToOverclaim, 5).map((item) => ({ claimText: item, sourcePath: 'synopsis.whatNotToOverclaim', conceptKey: 'misconception_trap' })),
    ], { article, topic, confidence: objectConfidence, verification, abstractOnly, reviewState });
    const knowledgeGraph = buildKnowledgeGraphRelationships({
        objectKey,
        objectType: 'paper',
        topic,
        articleUid,
        claimAnchors,
    });
    return {
        objectKey,
        objectType: 'paper',
        articleUid,
        topic,
        title,
        provider: synopsisResult?.provider || null,
        model: synopsisResult?.model || null,
        confidence: objectConfidence,
        reviewState,
        generatedAt,
        payload: {
            kind: 'paper_teaching_object',
            generatedAt,
            reviewState,
            sourceMode: abstractOnly ? 'abstract_only' : 'full_text_used',
            citationValidation: synopsisResult?.audit?.citationValidation || null,
            paper: {
                uid: articleUid,
                title,
                pmid: article.pmid || null,
                pmcid: article.pmcid || null,
                doi: article.doi || null,
                journal: article.journal || article.source || null,
                pubdate: article.pubdate || (article.year ? String(article.year) : null),
                studyType,
                isFree: Boolean(article.isFree || article.pmcid || article.openAccess || article.fullTextUrl || article.openAccessUrl),
                fullTextUsed: Number.isFinite(fullTextCoverageRatio) && fullTextCoverageRatio > 0,
            },
            synopsis,
            pico: {
                population: synopsis.population || null,
                intervention: synopsis.intervention || null,
                comparator: synopsis.comparator || null,
                outcomes: [
                    synopsis.primaryOutcome || synopsis.outcomes,
                    ...safeArray(synopsis.secondaryOutcomes, 5),
                    ...safeArray(synopsis.safetyOutcomes, 5),
                ].filter(Boolean).slice(0, 8),
            },
            appraisal: {
                clinicalQuestion: synopsis.clinicalQuestion || null,
                mainFindings: synopsis.mainFindings || null,
                limitations: synopsis.limitations || null,
                strengths: safeArray(synopsis.strengths, 6),
                weaknesses: safeArray(synopsis.weaknesses, 6),
                trustRating: synopsis.trustRating || 'MODERATE',
                trustRationale: synopsis.trustRationale || null,
                whatNotToOverclaim: safeArray(synopsis.whatNotToOverclaim, 6),
            },
            claimAnchors,
            knowledgeGraph,
            clinicalBottomLine: synopsis.bottomLine || synopsis.clinicalMeaning || synopsis.practiceImplication || null,
            quizSeed: {
                focusPoints: safeArray(synopsis.quizFocusPoints, 8),
                misconceptionTraps: safeArray(synopsis.whatNotToOverclaim, 6),
                preferredQuestionTypes: studyType === 'randomized_trial'
                    ? ['trial_interpretation', 'clinical_application', 'pitfall']
                    : studyType === 'guideline_or_statement'
                        ? ['guideline', 'clinical_application', 'pitfall']
                        : ['clinical_application', 'recall', 'pitfall'],
            },
        },
    };
}

function buildConsensusTeachingObject({ topic, consensusSynopsis, articles = [] }) {
    const normalizedTopic = String(topic || '').trim();
    const generatedAt = consensusSynopsis?.generatedAt || new Date().toISOString();
    const objectKey = `topic-consensus:${normalizedTopic.toLowerCase().replace(/\s+/g, '-')}`;
    const confidence = consensusSynopsis?.evidenceStrength === 'HIGH' ? 0.86
        : consensusSynopsis?.evidenceStrength === 'MODERATE' ? 0.7
            : consensusSynopsis?.evidenceStrength === 'LOW' ? 0.48 : 0.3;
    const quoteArticle = articles.find((a) => a?.abstract) || articles[0] || {};
    const claimAnchors = buildClaimAnchors(objectKey, [
        { claimText: consensusSynopsis?.statement, sourcePath: 'consensus.statement', conceptKey: 'consensus_statement' },
        { claimText: consensusSynopsis?.clinicalBottomLine, sourcePath: 'consensus.clinicalBottomLine', conceptKey: 'clinical_bottom_line' },
        ...safeArray(consensusSynopsis?.areasOfAgreement, 5).map((item) => ({ claimText: item, sourcePath: 'consensus.areasOfAgreement', conceptKey: 'agreement' })),
        ...safeArray(consensusSynopsis?.areasOfUncertainty, 5).map((item) => ({ claimText: item, sourcePath: 'consensus.areasOfUncertainty', conceptKey: 'uncertainty' })),
        ...safeArray(consensusSynopsis?.whatNotToOverclaim, 5).map((item) => ({ claimText: item, sourcePath: 'consensus.whatNotToOverclaim', conceptKey: 'misconception_trap' })),
    ], {
        article: quoteArticle,
        topic: normalizedTopic,
        confidence,
        verification: {
            verificationStatus: CLAIM_VERIFICATION.SYNTHESIS_INFERRED,
            verificationReason: 'Claim is inferred from a multi-paper consensus synopsis.',
        },
    });
    const includedArticleUids = articles.map(stableArticleUid).filter(Boolean).slice(0, 12);
    const reviewState = consensusSynopsis?.reviewState
        || (consensusSynopsis?.citationValidation?.ok ? 'machine_checked' : 'needs_revision');
    const knowledgeGraph = buildKnowledgeGraphRelationships({
        objectKey,
        objectType: 'topic_consensus',
        topic: normalizedTopic,
        includedArticleUids,
        claimAnchors,
    });
    return {
        objectKey,
        objectType: 'topic_consensus',
        topic: normalizedTopic,
        title: `Consensus synopsis: ${normalizedTopic}`,
        provider: consensusSynopsis?.provider || null,
        confidence,
        reviewState,
        generatedAt,
        payload: {
            kind: 'topic_consensus_teaching_object',
            generatedAt,
            reviewState,
            topic: normalizedTopic,
            consensusSynopsis,
            includedArticleUids,
            claimAnchors,
            knowledgeGraph,
            quizSeed: {
                focusPoints: safeArray(consensusSynopsis?.quizFocusPoints, 8),
                agreement: safeArray(consensusSynopsis?.areasOfAgreement, 6),
                uncertainty: safeArray(consensusSynopsis?.areasOfUncertainty, 6),
                misconceptionTraps: safeArray(consensusSynopsis?.whatNotToOverclaim, 6),
                preferredQuestionTypes: ['clinical_application', 'trial_interpretation', 'pitfall'],
            },
        },
    };
}

async function persistPaperTeachingObject({ db, article, synopsisResult, topic = '' }) {
    if (!db?.upsertTeachingObject || !article || !synopsisResult?.synopsis) return null;
    return db.upsertTeachingObject(buildPaperTeachingObject({ article, synopsisResult, topic }));
}

async function persistConsensusTeachingObject({ db, topic, consensusSynopsis, articles = [] }) {
    if (!db?.upsertTeachingObject || !topic || !consensusSynopsis) return null;
    return db.upsertTeachingObject(buildConsensusTeachingObject({ topic, consensusSynopsis, articles }));
}

function teachingObjectsToQuizContext(teachingObjects = []) {
    const lines = [];
    for (const object of teachingObjects.slice(0, 5)) {
        const payload = object.payload || {};
        const seed = payload.quizSeed || {};
        const focus = safeArray(seed.focusPoints, 4).join('; ');
        const traps = safeArray(seed.misconceptionTraps, 3).join('; ');
        const bottomLine = payload.clinicalBottomLine || payload.consensusSynopsis?.clinicalBottomLine || '';
        const claims = safeArray(payload.claimAnchors, 4)
            .map((claim) => `claimKey="${claim.claimKey}" ${safeString(claim.claimText, 240)}`)
            .join('\n');
        if (!focus && !traps && !bottomLine) continue;
        lines.push([
            `TEACHING OBJECT ${lines.length + 1}: ${object.title || object.articleUid || object.topic}`,
            bottomLine ? `Bottom line: ${String(bottomLine).slice(0, 500)}` : '',
            claims ? `Grounded claims:\n${claims}` : '',
            focus ? `Quiz focus: ${focus}` : '',
            traps ? `Misconception traps: ${traps}` : '',
        ].filter(Boolean).join('\n'));
    }
    return lines.join('\n\n');
}

function mergeTeachingObjectGraphs(teachingObjects = []) {
    const nodes = [];
    const edges = [];
    const seenNodeIds = new Set();
    const seenEdgeKeys = new Set();

    for (const object of teachingObjects.slice(0, 8)) {
        const graph = object.payload?.knowledgeGraph;
        if (!graph) continue;
        for (const node of safeArray(graph.nodes, 40)) {
            if (!node?.id || seenNodeIds.has(node.id)) continue;
            seenNodeIds.add(node.id);
            nodes.push(node);
        }
        for (const edge of safeArray(graph.edges, 60)) {
            const key = `${edge.from}|${edge.to}|${edge.relation}`;
            if (seenEdgeKeys.has(key)) continue;
            seenEdgeKeys.add(key);
            edges.push(edge);
        }
    }

    return {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodes: nodes.slice(0, 80),
        edges: edges.slice(0, 120),
    };
}

function buildEvidenceMap({ topic, topicKnowledge = null, articles = [], teachingObjects = [], relatedTopics = [], clusterArticles = [], consensusSynopsis = null } = {}) {
    const knowledge = topicKnowledge?.knowledge || {};
    const freshness = topicRefreshPriority({
        confidence: Number(topicKnowledge?.confidence || 0),
        refreshedAt: topicKnowledge?.lastRefreshedAt,
        topic,
        knowledge,
        totalSignals: articles.length,
        distinctArticles: articles.length,
        hasKnowledge: Boolean(topicKnowledge),
    });
    return {
        topic,
        generatedAt: new Date().toISOString(),
        freshness,
        nodes: {
            landmarkPapers: safeArray(knowledge.seminalPapers || knowledge.landmarkPapers, 8),
            teachingPoints: safeArray(knowledge.teachingPoints || knowledge.coreTeachingPoints, 10),
            liveEvidence: articles.slice(0, 10).map((a) => ({
                uid: stableArticleUid(a),
                title: a.title,
                year: a.year || parseInt(String(a.pubdate || '').slice(0, 4), 10) || null,
                source: a.source || a.journal || null,
                isFree: Boolean(a.isFree || a.pmcid || a.openAccess),
                ebmScore: a._ebmScore || null,
            })),
            teachingObjects: teachingObjects.slice(0, 12).map((object) => ({
                objectKey: object.objectKey,
                objectType: object.objectType,
                articleUid: object.articleUid,
                title: object.title,
                confidence: object.confidence,
                claimCount: safeArray(object.payload?.claimAnchors, 99).length,
                graphEdgeCount: object.payload?.knowledgeGraph?.edgeCount ?? 0,
                updatedAt: object.updatedAt,
            })),
            knowledgeGraph: mergeTeachingObjectGraphs(teachingObjects),
            relatedTopics,
            clusterArticles,
        },
        consensusSynopsis,
        alerts: {
            stale: freshness.confidenceDecay > 0.25 || freshness.priorityScore > 0.35,
            reason: freshness.reason,
            message: freshness.confidenceDecay > 0.25
                ? `Evidence memory for ${topic} has decayed; refresh and re-quiz this topic.`
                : null,
        },
    };
}

module.exports = {
    CLAIM_VERIFICATION,
    stableArticleUid,
    stableClaimKey,
    claimVerificationForPaper,
    buildKnowledgeGraphRelationships,
    mergeTeachingObjectGraphs,
    buildPaperTeachingObject,
    buildConsensusTeachingObject,
    persistPaperTeachingObject,
    persistConsensusTeachingObject,
    teachingObjectsToQuizContext,
    buildEvidenceMap,
};
