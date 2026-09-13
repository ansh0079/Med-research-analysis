'use strict';

const { assessTopicRelevance, classifyImportedDocument, isUsableImportedSource, normalizeStoredDocument } = require('../../server/utils/importEvidenceQuality');

test('recency and publication type cannot make an off-topic paper relevant', () => {
    expect(assessTopicRelevance('achalasia endoscopic therapy', { title: 'NICE guidelines on diabetes', pubYear: 2026 }).accepted).toBe(false);
    expect(assessTopicRelevance('achalasia endoscopic therapy', { title: 'Endoscopic management of achalasia' }).accepted).toBe(true);
});

test('a review mentioning guidelines is not an issuing-body guideline', () => {
    expect(classifyImportedDocument({ title: 'Review of NICE guidelines', pubTypeList: { pubType: ['Review'] } })).toBe('review_article');
    expect(classifyImportedDocument({ title: 'Treatment recommendations', journalTitle: 'NICE', pubType: ['Guideline'] })).toBe('article');
    expect(classifyImportedDocument({ title: 'EASL clinical practice guidelines on ascites', pubType: ['Practice Guideline'] })).toBe('clinical_practice_guideline');
    expect(classifyImportedDocument({ title: 'A nonrandomized trial of therapy' })).toBe('article');
});

test('coverage requires text and a topic match', () => {
    expect(isUsableImportedSource('achalasia endoscopic therapy', { title: 'Endoscopic achalasia therapy', bodyStored: false })).toBe(false);
    expect(isUsableImportedSource('achalasia endoscopic therapy', { title: 'Diabetes recommendations', bodyStored: true })).toBe(false);
});

test('old imported documents cannot keep an unverified guideline badge when served', () => {
    expect(normalizeStoredDocument({ document_label: 'clinical_practice_guideline', evidence_tier: 'guideline', title: 'Advances in treatment and updated management guidelines', source_body: null }))
        .toMatchObject({ document_label: 'article', evidence_tier: 'literature', attribution_status: 'unverified' });
    expect(normalizeStoredDocument({ document_label: 'clinical_practice_guideline', title: 'EASL clinical practice guidelines on ascites' }).document_label).toBe('clinical_practice_guideline');
});
