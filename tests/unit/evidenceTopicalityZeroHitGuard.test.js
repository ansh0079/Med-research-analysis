'use strict';

const { evaluateEligibility } = require('../../server/services/search/evidenceLanes');

function makeArticle(overrides = {}) {
  return {
    title: 'Placeholder',
    abstract: 'Placeholder abstract text.',
    pubtype: ['Randomized Controlled Trial'],
    journal: 'N Engl J Med',
    year: 2015,
    ...overrides,
  };
}

describe('zero-hit topicality hard guard', () => {
  test('off-topic curated cardiometabolic landmark is rejected under pubmed_zero_hit', () => {
    const empareg = makeArticle({
      _pinnedLandmark: true,
      title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes',
      abstract: 'In patients with type 2 diabetes, empagliflozin reduced cardiovascular outcomes.',
    });
    const verdict = evaluateEligibility(empareg, {
      query: 'drug rashes SCAR',
      queryMeshTerms: [],
      queryAliases: [], // no alias hit for EMPA-REG on a dermatology query
      hardZeroHitGuard: true,
    });
    expect(verdict.eligible).toBe(false);
    expect(verdict.rejectionReason).toMatch(/zero_hit|pinned/i);
  });

  test('genuine on-topic landmark from topic memory still passes with alias under pubmed_zero_hit', () => {
    const scarLandmark = makeArticle({
      _fromTopicEvidenceMemory: true,
      _memoryRole: 'landmark',
      title: 'Severe cutaneous adverse reactions (SCAR): management update',
      abstract: 'SCAR management overview including SJS/TEN.',
    });
    const verdict = evaluateEligibility(scarLandmark, {
      query: 'drug rashes SCAR',
      queryMeshTerms: [],
      // High-signal alias present (all-caps acronym) to reflect genuine on-topic landmark
      queryAliases: ['SCAR'],
      hardZeroHitGuard: true,
    });
    expect(verdict.eligible).toBe(true);
    expect(verdict.route).toBe('verified_topic_link');
  });

  test('cardiology/diabetes query still admits its curated landmark with alias under pubmed_zero_hit', () => {
    const empareg = makeArticle({
      _pinnedLandmark: true,
      title: 'Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes',
      abstract: 'In patients with type 2 diabetes, empagliflozin reduced cardiovascular outcomes.',
    });
    const verdict = evaluateEligibility(empareg, {
      query: 'type 2 diabetes cardiovascular outcomes',
      queryMeshTerms: [],
      queryAliases: ['EMPA-REG OUTCOME'], // alias match present
      hardZeroHitGuard: true,
    });
    expect(verdict.eligible).toBe(true);
    expect(verdict.route).toBe('curated_landmark');
  });
});

