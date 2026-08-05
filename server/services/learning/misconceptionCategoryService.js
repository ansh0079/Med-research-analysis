'use strict';

const CATEGORY_LABELS = {
    mechanism: 'Mechanism / pathophysiology',
    indication: 'Indication / patient selection',
    dosing: 'Dosing / pharmacology',
    guideline: 'Guideline application',
    trial_interpretation: 'Trial interpretation / evidence',
    pitfall: 'Clinical pitfall / trap',
    diagnosis: 'Diagnosis / workup',
    recall: 'Factual recall',
    clinical_application: 'Clinical application',
    other: 'General misconception',
};

const QUESTION_TYPE_MAP = {
    recall: 'recall',
    clinical_application: 'clinical_application',
    trial_interpretation: 'trial_interpretation',
    guideline: 'guideline',
    pitfall: 'pitfall',
};

function inferMisconceptionCategory({
    questionType,
    reasoningTags = [],
    claimKey = null,
} = {}) {
    const tags = (Array.isArray(reasoningTags) ? reasoningTags : [])
        .map((tag) => String(tag).toLowerCase());

    if (tags.some((tag) => tag.includes('dose') || tag.includes('dosing') || tag.includes('pharmac'))) {
        return 'dosing';
    }
    if (tags.some((tag) => tag.includes('mechanism') || tag.includes('pathophys') || tag.includes('receptor'))) {
        return 'mechanism';
    }
    if (tags.some((tag) => tag.includes('indication') || tag.includes('contraind') || tag.includes('eligib'))) {
        return 'indication';
    }
    if (tags.some((tag) => tag.includes('diagnos') || tag.includes('workup') || tag.includes('differential'))) {
        return 'diagnosis';
    }
    if (QUESTION_TYPE_MAP[questionType]) {
        return QUESTION_TYPE_MAP[questionType];
    }
    if (claimKey) return 'clinical_application';
    return 'other';
}

function formatCategoryLabel(category) {
    return CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
}

function groupMisconceptionsByCategory(misconceptions = []) {
    const grouped = {};
    for (const row of Array.isArray(misconceptions) ? misconceptions : []) {
        const category = row.misconceptionCategory
            || row.misconception_category
            || inferMisconceptionCategory({
                questionType: row.questionType || row.question_type,
                reasoningTags: row.reasoningTags || row.reasoning_tags,
                claimKey: row.claimKey || row.claim_key,
            });
        if (!grouped[category]) {
            grouped[category] = { category, label: formatCategoryLabel(category), count: 0, examples: [] };
        }
        grouped[category].count += Number(row.count || 1);
        if (grouped[category].examples.length < 2) {
            grouped[category].examples.push({
                claimKey: row.claimKey || row.claim_key || null,
                wrongOptionText: row.wrongOptionText || row.wrong_option_text || null,
            });
        }
    }
    return Object.values(grouped).sort((a, b) => b.count - a.count);
}

function formatCategoryMisconceptionSummary(grouped = []) {
    if (!Array.isArray(grouped) || grouped.length === 0) return '';
    const lines = grouped.slice(0, 5).map((entry) => {
        const example = entry.examples?.[0];
        const exampleText = example?.wrongOptionText
            ? ` e.g. chose "${String(example.wrongOptionText).slice(0, 80)}"`
            : '';
        return `  - ${entry.label}: ${entry.count} miss(es)${exampleText}`;
    });
    return `MISCONCEPTION CATEGORIES (typed failure patterns):\n${lines.join('\n')}\nTarget the highest-count category with a discriminating question or explanation.`;
}

module.exports = {
    CATEGORY_LABELS,
    inferMisconceptionCategory,
    formatCategoryLabel,
    groupMisconceptionsByCategory,
    formatCategoryMisconceptionSummary,
};
