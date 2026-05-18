/**
 * Live ARDS flagship QA runner.
 *
 * Requires a running local server and configured JWT_SECRET + AI provider.
 * It exercises search -> synthesis -> MCQ -> teaching case and writes:
 *   docs/ARDS_LIVE_QA_RESULTS.md
 *
 * Run:
 *   node server/scripts/qaArdsLive.js
 */

const fs = require('fs');
const jwt = require('jsonwebtoken');
const { loadEnv, serverConfig } = require('../../config');

loadEnv();

const base = `http://localhost:${serverConfig.ports.node}`;
const token = jwt.sign(
    { id: 'qa-user', name: 'QA User', email: 'qa@example.local', role: 'admin' },
    process.env.JWT_SECRET || 'change-this-in-production',
    { expiresIn: '1h' }
);
const cookie = `med_auth_token=${token}`;

function articleSeed(a) {
    return {
        uid: a.uid,
        title: a.title,
        abstract: a.abstract,
        doi: a.doi,
        pmid: a.pmid,
        pubdate: a.pubdate,
        source: a.source || a.journal,
        pmcrefcount: a.pmcrefcount,
        pubtype: a.pubtype,
        _source: a._source,
        _ebmScore: a._ebmScore,
        _isPreprint: a._isPreprint,
        _impact: a._impact,
        _quality: a._quality,
        _retraction: a._retraction,
        _curatedFlagship: a._curatedFlagship,
    };
}

async function request(path, options = {}) {
    const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Cookie: cookie,
        },
    });
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        body = { raw: text };
    }
    if (!res.ok) {
        const err = new Error(`${path} failed: ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

function containsAny(text, terms) {
    const lower = String(text || '').toLowerCase();
    return terms.some((term) => lower.includes(term));
}

function summarizeChecks({ search, synthesis, quiz, vignette }) {
    const synthText = JSON.stringify(synthesis || {});
    const quizText = JSON.stringify(quiz || {});
    const caseText = JSON.stringify(vignette || {});
    const questions = quiz.questions || [];
    const caseMcqs = vignette.caseMCQs || [];
    const bouquet = search.topicIntelligence?.evidenceBouquet?.topPapers || [];

    return [
        { check: 'Topic intelligence present', pass: Boolean(search.topicIntelligence) },
        { check: 'Evidence bouquet has 5 papers', pass: (search.topicIntelligence?.evidenceBouquet?.count || 0) >= 5 },
        {
            check: 'Evidence bouquet uses curated seminal ARDS papers',
            pass: bouquet.slice(0, 3).some((p) => /berlin|tidal|prone/i.test(p.title || '')),
        },
        { check: 'Agent guidance present', pass: Boolean(search.agentGuidance?.mentorMessage) },
        { check: 'Guideline snapshot present', pass: (search.topicIntelligence?.guidelineSnapshot?.count || 0) >= 1 },
        {
            check: 'Synthesis has clinical bottom line or consensus',
            pass: Boolean(synthesis.synthesis?.clinicalBottomLine || synthesis.synthesis?.consensus),
        },
        {
            check: 'Synthesis references ARDS core management',
            pass: containsAny(synthText, ['tidal volume', 'lung-protective', 'prone', 'plateau', 'fluid']),
        },
        { check: 'Quiz produced 3-5 questions', pass: questions.length >= 3 && questions.length <= 5 },
        {
            check: 'Quiz includes clinical/application style content',
            pass: containsAny(quizText, ['patient', 'pao2', 'fio2', 'ventilat', 'prone', 'plateau']),
        },
        {
            check: 'Quiz has source indices or references',
            pass: questions.some((q) => Array.isArray(q.sourceIndices) && q.sourceIndices.length > 0) ||
                questions.some((q) => q.sourceReference || q.sourceArticle),
        },
        {
            check: 'Teaching vignette generated',
            pass: Boolean(vignette.presentingComplaint || vignette.history || vignette.vignette || vignette.patientPresentation),
        },
        {
            check: 'Teaching case includes management reasoning',
            pass: containsAny(caseText, ['management', 'reasoning', 'prone', 'ventilat', 'fluid', 'ecmo']),
        },
        { check: 'Teaching case includes MCQs', pass: caseMcqs.length >= 3 },
        {
            check: 'Safety framing present',
            pass: containsAny(caseText + synthText + quizText, ['research', 'education', 'clinical judgement', 'clinician']),
        },
    ];
}

function compact(text, max = 1200) {
    return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function writeMarkdown(report) {
    const lines = [];
    lines.push('# ARDS Live QA Results');
    lines.push('');
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push('');
    lines.push(`Result: ${report.summary.passed}/${report.summary.total} checks passed.`);
    lines.push('');
    lines.push('## Checks');
    lines.push('');
    report.checks.forEach((c) => lines.push(`- ${c.pass ? 'PASS' : 'FAIL'}: ${c.check}`));
    lines.push('');
    lines.push('## Search');
    lines.push('');
    lines.push(`- Results: ${report.search.count}`);
    lines.push(`- Knowledge available: ${report.search.knowledgeAvailable}`);
    lines.push(`- Evidence bouquet count: ${report.search.evidenceBouquetCount}`);
    lines.push(`- Guideline count: ${report.search.guidelineCount}`);
    lines.push(`- Mentor status: ${report.search.mentorStatus}`);
    lines.push('');
    lines.push('Top papers:');
    report.search.topPapers.forEach((p) => {
        lines.push(`- [${p.index}] ${p.title} (${p.source || 'unknown'})${p.curated ? ' - curated' : ''}`);
    });
    lines.push('');
    lines.push('## Synthesis');
    lines.push('');
    lines.push(`- Provider/model: ${report.synthesis.provider || 'unknown'} / ${report.synthesis.model || 'unknown'}`);
    lines.push(`- Evidence grade: ${report.synthesis.evidenceGrade || 'not supplied'}`);
    lines.push(`- Clinical bottom line: ${compact(report.synthesis.clinicalBottomLine || report.synthesis.consensus)}`);
    lines.push('');
    lines.push('## MCQs');
    lines.push('');
    lines.push(`- Provider: ${report.quiz.provider || 'unknown'}`);
    lines.push(`- Question count: ${report.quiz.questionCount}`);
    report.quiz.questions.forEach((q) => {
        lines.push(`- Q${q.index} (${q.questionType || 'unknown'}, ${q.difficulty || 'unknown'}): ${compact(q.question, 260)}`);
    });
    lines.push('');
    lines.push('## Teaching Case');
    lines.push('');
    lines.push(`- Provider/model: ${report.vignette.provider || 'unknown'} / ${report.vignette.model || 'unknown'}`);
    lines.push(`- Presenting complaint: ${compact(report.vignette.presentingComplaint)}`);
    lines.push(`- History: ${compact(report.vignette.history, 600)}`);
    lines.push(`- Investigations: ${compact(report.vignette.investigations, 600)}`);
    lines.push(`- Management reasoning: ${compact(report.vignette.managementReasoning, 800)}`);
    lines.push(`- Case MCQs: ${report.vignette.mcqCount}`);
    lines.push(`- Evidence applications: ${report.vignette.evidenceApplicationCount}`);
    lines.push('');
    lines.push('## Raw Summary JSON');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(report, null, 2).slice(0, 30000));
    lines.push('```');
    fs.writeFileSync('docs/ARDS_LIVE_QA_RESULTS.md', lines.join('\n'));
}

async function main() {
    const search = await request('/api/search?q=ARDS&limit=8&sources=pubmed');
    const top = (search.topicIntelligence?.evidenceBouquet?.topPapers || search.articles || [])
        .slice(0, 5)
        .map(articleSeed);

    const synthesis = await request('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'ARDS', articles: top, provider: 'mistral' }),
    });

    const quiz = await request('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'ARDS', articles: top, count: 5, difficulty: 'mixed' }),
    });

    const vignette = await request('/api/cases/teaching-vignette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'ARDS', seedArticles: top, learningMode: 'resident', provider: 'mistral' }),
    });

    const checks = summarizeChecks({ search, synthesis, quiz, vignette });
    const passed = checks.filter((c) => c.pass).length;
    const failed = checks.filter((c) => !c.pass);
    const report = {
        generatedAt: new Date().toISOString(),
        base,
        topic: 'ARDS',
        summary: { passed, total: checks.length, failed: failed.map((f) => f.check) },
        search: {
            count: search.count,
            knowledgeAvailable: search.knowledgeAvailable,
            evidenceBouquetCount: search.topicIntelligence?.evidenceBouquet?.count,
            guidelineCount: search.topicIntelligence?.guidelineSnapshot?.count,
            mentorStatus: search.agentGuidance?.status,
            topPapers: top.map((a, i) => ({
                index: i + 1,
                title: a.title,
                source: a.source,
                pmid: a.pmid,
                doi: a.doi,
                curated: a._curatedFlagship,
            })),
        },
        synthesis: {
            provider: synthesis.audit?.provider,
            model: synthesis.audit?.model,
            evidenceGrade: synthesis.synthesis?.evidenceGrade,
            clinicalBottomLine: synthesis.synthesis?.clinicalBottomLine || '',
            consensus: synthesis.synthesis?.consensus || '',
            keyFindings: synthesis.synthesis?.keyFindings || [],
            sourceCount: synthesis.sources?.length || 0,
            disclaimerPresent: Boolean(synthesis.disclaimer),
        },
        quiz: {
            provider: quiz.provider,
            questionCount: quiz.questions?.length || 0,
            questions: (quiz.questions || []).map((q, i) => ({
                index: i + 1,
                questionType: q.questionType,
                difficulty: q.difficulty,
                question: q.question,
                sourceIndices: q.sourceIndices || [],
                sourceReference: q.sourceReference || q.sourceArticle || null,
            })),
            disclaimerPresent: Boolean(quiz.disclaimer),
        },
        vignette: {
            provider: vignette.provider,
            model: vignette.model,
            presentingComplaint: vignette.presentingComplaint || vignette.vignette || '',
            history: vignette.history || vignette.patientPresentation || '',
            investigations: vignette.investigations || '',
            managementReasoning: vignette.managementReasoning || vignette.keyDecisionPoint || '',
            mcqCount: vignette.caseMCQs?.length || 0,
            evidenceApplicationCount: vignette.evidenceLinks?.length || vignette.howTopPapersApply?.length || 0,
            disclaimerPresent: Boolean(vignette.disclaimer),
        },
        checks,
    };

    writeMarkdown(report);
    console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((err) => {
    console.error(JSON.stringify({ error: err.message, status: err.status, body: err.body }, null, 2));
    process.exit(1);
});
