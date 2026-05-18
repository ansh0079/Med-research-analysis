/**
 * Serialize a topic_knowledge row (from db.getTopicKnowledge) for inclusion in MCQ/case prompts.
 * Indices in this block refer to stored seminal extraction order, not necessarily SOURCE/EVIDENCE blocks below.
 *
 * @param {{ topic?: string; knowledge?: object; status?: string } | null | undefined} row
 * @returns {string}
 */
function formatStoredTopicKnowledgeForPrompt(row) {
    if (!row || !row.knowledge || typeof row.knowledge !== 'object') return '';
    const k = row.knowledge;
    const parts = [];
    if (k.mentorMessage) {
        parts.push(`Mentor framing:\n${String(k.mentorMessage).slice(0, 700)}`);
    }
    if (Array.isArray(k.seminalPapers) && k.seminalPapers.length) {
        const lines = k.seminalPapers.slice(0, 6).map((p, i) => {
            const title = p.title || 'Unknown';
            const prin = p.clinicalPrinciple ? ` Principle: ${p.clinicalPrinciple}` : '';
            const why = p.whySeminal ? ` Why seminal: ${p.whySeminal}` : '';
            return `${i + 1}. ${title}${prin}${why}`;
        });
        parts.push(`Seminal papers (topic memory):\n${lines.join('\n')}`);
    }
    const tps = Array.isArray(k.teachingPoints) ? k.teachingPoints : k.coreTeachingPoints;
    if (Array.isArray(tps) && tps.length) {
        const lines = tps.slice(0, 8).map((tp, i) => {
            const line = typeof tp === 'string' ? tp : (tp.point || tp.text || tp.claim || JSON.stringify(tp));
            return `${i + 1}. ${line}`;
        });
        parts.push(`Core teaching points:\n${lines.join('\n')}`);
    }
    if (Array.isArray(k.mcqAngles) && k.mcqAngles.length) {
        parts.push(`Suggested MCQ angles:\n${k.mcqAngles.slice(0, 5).map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
    }
    if (Array.isArray(k.caseGenerationHooks) && k.caseGenerationHooks.length) {
        parts.push(`Case scenario hooks:\n${k.caseGenerationHooks.slice(0, 5).map((h, i) => `${i + 1}. ${h}`).join('\n')}`);
    }
    if (!parts.length) return '';
    const statusNote = row.status ? ` [${row.status}]` : '';
    return `STORED TOPIC BASELINE${statusNote} — citation-grounded teaching memory for "${String(row.topic || '').slice(0, 120)}".
Use it to shape emphasis and question angles. Numbers here are topic-memory ordinals, not the SOURCE/EVIDENCE/SEED indices below unless titles clearly match.

${parts.join('\n\n')}
`;
}

module.exports = { formatStoredTopicKnowledgeForPrompt };
