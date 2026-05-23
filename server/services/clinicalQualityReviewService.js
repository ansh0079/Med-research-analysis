'use strict';

/** Curator-facing quality queues (first-class review lanes). */
const QUALITY_QUEUES = [
    {
        id: 'overclaimed',
        label: 'Overclaimed',
        description: 'Curator-flagged or marked as overstating the evidence.',
        tone: 'warning',
    },
    {
        id: 'guideline_conflicts',
        label: 'Guideline conflicts',
        description: 'Claims that conflict with the guideline library.',
        tone: 'danger',
    },
    {
        id: 'stale',
        label: 'Stale claims',
        description: 'Needs synopsis regeneration or evidence refresh.',
        tone: 'warning',
    },
    {
        id: 'abstract_only',
        label: 'Abstract only',
        description: 'Not yet verified against full text.',
        tone: 'neutral',
    },
    {
        id: 'low_confidence',
        label: 'Low confidence',
        description: 'Model confidence below threshold or unvalidated draft.',
        tone: 'neutral',
    },
];

const LOW_CONFIDENCE_THRESHOLD = 0.55;

function queueMeta(id) {
    return QUALITY_QUEUES.find((q) => q.id === id) || null;
}

module.exports = {
    QUALITY_QUEUES,
    LOW_CONFIDENCE_THRESHOLD,
    queueMeta,
};
