'use strict';

/**
 * Mirrors src/utils/topicKnowledgeTrust.ts for Node/Jest without a TS transform.
 */
function isLandmarkSeedKnowledge(guidance) {
    if (!guidance) return false;
    const from = String(guidance.seededFrom || '');
    if (from === 'flagshipTopics.json' || from === 'curriculumSeedService') return true;
    const msg = String(guidance.mentorMessage || '').toLowerCase();
    return msg.includes('pending fuller') || msg.includes('curated landmark seed');
}

describe('isLandmarkSeedKnowledge', () => {
    test('detects flagship and curriculum seed provenance', () => {
        expect(isLandmarkSeedKnowledge({ seededFrom: 'flagshipTopics.json' })).toBe(true);
        expect(isLandmarkSeedKnowledge({ seededFrom: 'curriculumSeedService' })).toBe(true);
        expect(isLandmarkSeedKnowledge({ seededFrom: 'human_edit' })).toBe(false);
    });

    test('detects stub mentor copy without seededFrom', () => {
        expect(isLandmarkSeedKnowledge({
            mentorMessage: 'ARDS: curated landmark seed pending fuller AI/human synopsis refresh.',
        })).toBe(true);
        expect(isLandmarkSeedKnowledge({
            mentorMessage: 'Clinician-authored mentor brief for ARDS.',
        })).toBe(false);
    });
});
