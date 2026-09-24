const { filterRelevantArticles } = require('../../server/services/search/searchPipeline');

describe('Pinned landmark topicality guard', () => {
  function pinnedArticle(overrides = {}) {
    return {
      uid: overrides.uid || 'pubmed-pinned',
      title: overrides.title || 'Pinned landmark',
      abstract: overrides.abstract || '',
      pubdate: overrides.pubdate || '2023',
      pubtype: overrides.pubtype || ['Randomized Controlled Trial'],
      _pinnedLandmark: true,
      _source: 'pubmed',
      ...overrides,
    };
  }

  test('AF guideline pin is rejected for a CAP query', () => {
    const afGuideline = pinnedArticle({
      uid: 'pubmed-38033089',
      title: '2023 ACC/AHA/ACCP/HRS Guideline for the Diagnosis and Management of Atrial Fibrillation',
      pubtype: ['Practice Guideline'],
    });
    const filtered = filterRelevantArticles([afGuideline], {
      query: 'community-acquired pneumonia',
      specificity: 'moderate',
      queryMeshTerms: ['Pneumonia'],
      parsedYearFilters: [],
      pico: null,
      queryAliases: [], // no AF aliases for a CAP query
    });
    expect(filtered).toHaveLength(0);
  });

  test('LEADER pin is rejected for an epilepsy query', () => {
    const leader = pinnedArticle({
      uid: 'pubmed-27295427',
      title: 'Liraglutide and cardiovascular outcomes in type 2 diabetes (LEADER)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const filtered = filterRelevantArticles([leader], {
      query: 'seizures and epilepsy',
      specificity: 'moderate',
      queryMeshTerms: ['Epilepsy'],
      parsedYearFilters: [],
      pico: null,
      queryAliases: [],
    });
    expect(filtered).toHaveLength(0);
  });

  test('SPRINT pin is rejected for cellulitis', () => {
    const sprint = pinnedArticle({
      uid: 'pubmed-26551272',
      title: 'A randomized trial of intensive versus standard blood-pressure control (SPRINT)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const filtered = filterRelevantArticles([sprint], {
      query: 'cellulitis',
      specificity: 'moderate',
      queryMeshTerms: ['Cellulitis'],
      parsedYearFilters: [],
      pico: null,
      queryAliases: [],
    });
    expect(filtered).toHaveLength(0);
  });

  test('SPRINT pin is accepted for a hypertension query (alias hit)', () => {
    const sprint = pinnedArticle({
      uid: 'pubmed-26551272',
      title: 'A randomized trial of intensive versus standard blood-pressure control (SPRINT)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const filtered = filterRelevantArticles([sprint], {
      query: 'intensive blood pressure control hypertension',
      specificity: 'moderate',
      queryMeshTerms: ['Hypertension'],
      parsedYearFilters: [],
      pico: null,
      // Include the trial alias to simulate clinicalQueryAliases() output
      queryAliases: ['SPRINT'],
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].uid).toBe('pubmed-26551272');
    expect(filtered[0]._eligibilityRoute).toBe('curated_landmark');
  });

  test('Cardiometabolic pins are rejected for ectopic/early pregnancy bleeding', () => {
    const credence = pinnedArticle({
      uid: 'pubmed-30990260',
      title: 'Canagliflozin and Renal Outcomes in Type 2 Diabetes (CREDENCE)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const reliance = pinnedArticle({
      uid: 'pubmed-19717844',
      title: 'Dabigatran versus warfarin in atrial fibrillation (RE-LY)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const aristotle = pinnedArticle({
      uid: 'pubmed-21870978',
      title: 'Apixaban versus warfarin in atrial fibrillation (ARISTOTLE)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const sprint = pinnedArticle({
      uid: 'pubmed-26551272',
      title: 'A randomized trial of intensive versus standard blood-pressure control (SPRINT)',
      pubtype: ['Randomized Controlled Trial'],
    });
    const filtered = filterRelevantArticles([credence, reliance, aristotle, sprint], {
      query: 'early pregnancy bleeding ectopic pregnancy',
      specificity: 'moderate',
      queryMeshTerms: ['Pregnancy, Ectopic'],
      parsedYearFilters: [],
      pico: null,
      queryAliases: [],
    });
    expect(filtered).toHaveLength(0);
  });

  test('SPRINT/AHA HF prevention are rejected for pre‑eclampsia queries', () => {
    const sprint = pinnedArticle({
      uid: 'pubmed-26551272',
      title: 'SPRINT: intensive blood pressure control',
      pubtype: ['Randomized Controlled Trial'],
    });
    const ahaPrevention = pinnedArticle({
      uid: 'pubmed-32776619',
      title: 'AHA Scientific Statement: Primary Prevention of Heart Failure',
      pubtype: ['Practice Guideline'],
    });
    const filtered = filterRelevantArticles([sprint, ahaPrevention], {
      query: 'pre‑eclampsia hypertensive disorders of pregnancy',
      specificity: 'moderate',
      queryMeshTerms: ['Pre-Eclampsia'],
      parsedYearFilters: [],
      pico: null,
      queryAliases: [],
    });
    expect(filtered).toHaveLength(0);
  });
});

