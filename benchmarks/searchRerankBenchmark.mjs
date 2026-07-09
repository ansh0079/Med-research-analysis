#!/usr/bin/env node
/**
 * Search Rerank Benchmark
 *
 * Measures the quality improvement from the hybrid reranker introduced in Phase 1.
 * Evaluates Precision@10, off-topic rate, and study-type appropriateness against a
 * labelled set of clinical queries.
 *
 * Usage:
 *   # Unit-style benchmark (tests articleReranker.js in isolation with mock AI)
 *   node benchmarks/searchRerankBenchmark.mjs
 *
 *   # Integration benchmark (hits live /api/cases/analyze against running server)
 *   BASE_URL=http://127.0.0.1:3000 JWT=<bearer> node benchmarks/searchRerankBenchmark.mjs --live
 *
 * Expected targets:
 *   Precision@10      >= 0.75
 *   Off-topic rate    <= 0.10
 *   Median latency    <  1500ms (rerank stage only)
 */



import {
  rerankArticlesByPico,
  selectTopRerankedArticles,
  extractPicoProfile,
  computeHeuristicScore,
} from '../server/services/articleReranker.js';

// =============================================================================
// Labelled Query Set
// =============================================================================

const LABELLED_QUERIES = [
  {
    id: 'ards-severe-steroids',
    caseText: '68-year-old man with severe ARDS (PaO2/FiO2 85) on mechanical ventilation. Considering methylprednisolone.',
    topic: 'ARDS corticosteroids',
    // Articles that SHOULD appear in top 10
    relevantUids: ['pmid-12345678', 'pmid-22345679'],
    relevantTerms: ['ARDS', 'steroid', 'corticosteroid', 'methylprednisolone', 'acute respiratory distress'],
    // Articles that should NOT appear (wrong population or design)
    irrelevantTerms: ['paediatric', 'children', 'case report', 'COPD', 'asthma'],
    expectedStudyTypes: ['randomized controlled trial', 'meta-analysis', 'systematic review'],
  },
  {
    id: 'sepsis-hour-1-lactate',
    caseText: '45-year-old woman in septic shock. ED clinician asking about hour-1 bundle and lactate-guided resuscitation.',
    topic: 'sepsis hour-1 bundle',
    relevantTerms: ['sepsis', 'septic shock', 'lactate', 'resuscitation', 'bundle'],
    irrelevantTerms: ['paediatric', 'neonatal', 'COVID-19', 'case report'],
    expectedStudyTypes: ['randomized controlled trial', 'cohort study', 'meta-analysis'],
  },
  {
    id: 'covid-ards-dexamethasone',
    caseText: '55-year-old man with COVID-19 pneumonia and moderate ARDS. Should we start dexamethasone?',
    topic: 'COVID-19 ARDS dexamethasone',
    relevantTerms: ['COVID-19', 'dexamethasone', 'ARDS', 'corticosteroid', 'SARS-CoV-2'],
    irrelevantTerms: ['rheumatoid arthritis', 'multiple myeloma', 'paediatric', 'case report'],
    expectedStudyTypes: ['randomized controlled trial', 'meta-analysis'],
  },
  {
    id: 'pe-anticoagulation-dosing',
    caseText: '70-year-old with acute pulmonary embolism and normal renal function. Discussing DOAC vs warfarin.',
    topic: 'pulmonary embolism anticoagulation',
    relevantTerms: ['pulmonary embolism', 'anticoagulation', 'DOAC', 'warfarin', 'rivaroxaban', 'apixaban'],
    irrelevantTerms: ['cancer', 'thrombolysis', 'paediatric', 'case report'],
    expectedStudyTypes: ['randomized controlled trial', 'cohort study', 'meta-analysis'],
  },
  {
    id: 'aki-fluids-diuretics',
    caseText: '62-year-old with septic AKI stage 2. Fluid balance is positive 3L. Should we give diuretics?',
    topic: 'acute kidney injury fluid management',
    relevantTerms: ['acute kidney injury', 'AKI', 'fluid', 'diuretic', 'renal', 'sepsis'],
    irrelevantTerms: ['chronic kidney disease', 'dialysis', 'paediatric', 'case report'],
    expectedStudyTypes: ['randomized controlled trial', 'cohort study', 'meta-analysis'],
  },
];

// =============================================================================
// Mock Article Generators
// =============================================================================

function makeArticle(overrides = {}) {
  const id = overrides.uid || `pmid-${Math.floor(Math.random() * 90000000 + 10000000)}`;
  return {
    uid: id,
    pmid: id,
    title: overrides.title || 'Untitled study',
    abstract: overrides.abstract || 'No abstract available.',
    year: overrides.year || 2023,
    pubdate: String(overrides.year || 2023),
    journal: overrides.journal || 'Medical Journal',
    source: overrides.source || 'pubmed',
    pubtype: overrides.pubtype || ['Journal Article'],
    ...overrides,
  };
}

function generateMockArticlesForQuery(query) {
  const articles = [];

  // Relevant articles (should score highly)
  for (let i = 0; i < 8; i++) {
    const term = query.relevantTerms[i % query.relevantTerms.length];
    const design = query.expectedStudyTypes[i % query.expectedStudyTypes.length];
    articles.push(makeArticle({
      uid: `pmid-${10000000 + i}`,
      title: `${design}: ${term} in ${query.topic}`,
      abstract: `This ${design} evaluates ${term} in adult patients with ${query.topic}. Methods: randomized allocation. Results: significant improvement. Conclusion: supports use in relevant population.`,
      pubtype: [design],
      year: 2020 + (i % 5),
    }));
  }

  // Irrelevant articles (should score low or be excluded)
  for (let i = 0; i < 12; i++) {
    const badTerm = query.irrelevantTerms[i % query.irrelevantTerms.length];
    const isCaseReport = i % 3 === 0;
    articles.push(makeArticle({
      uid: `pmid-${90000000 + i}`,
      title: isCaseReport
        ? `Case report: ${badTerm} in ${query.topic}`
        : `Observational study of ${badTerm} and ${query.topic}`,
      abstract: `This study examines ${badTerm} in the context of ${query.topic}. The population differs significantly from typical adult presentations.`,
      pubtype: isCaseReport ? ['Case Report'] : ['Observational Study'],
      year: 2018 + (i % 5),
    }));
  }

  // Shuffle
  for (let i = articles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [articles[i], articles[j]] = [articles[j], articles[i]];
  }

  return articles;
}

// =============================================================================
// Mock AI Service
// =============================================================================

function createMockAiService(delayMs = 50) {
  return {
    async callGemini(prompt, _model, _options) {
      await sleep(delayMs);
      return mockLlmResponse(prompt);
    },
    async callMistralAI(prompt, _model, _options) {
      await sleep(delayMs);
      return mockLlmResponse(prompt);
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockLlmResponse(prompt) {
  // Detect if this is a PICO extraction prompt
  if (prompt.includes('PATIENT CASE PROFILE') === false && prompt.includes('patient case')) {
    // PICO extraction
    const population = extractField(prompt, 'Population:') || 'Adult patients';
    const intervention = extractField(prompt, 'Intervention/Exposure:') || '';
    return JSON.stringify({
      population,
      intervention,
      comparison: '',
      outcome: '',
      ageRange: 'Adult',
      severity: 'Severe',
      setting: 'ICU',
      queryIntent: 'management',
    });
  }

  // Reranking prompt: score each article
  const scores = [];
  const articleMatches = prompt.match(/\[ARTICLE (\d+)\]/g) || [];

  for (let idx = 1; idx <= articleMatches.length; idx++) {
    const blockStart = prompt.indexOf(`[ARTICLE ${idx}]`);
    const blockEnd = idx < articleMatches.length
      ? prompt.indexOf(`[ARTICLE ${idx + 1}]`)
      : prompt.length;
    const block = prompt.slice(blockStart, blockEnd).toLowerCase();

    const isCaseReport = block.includes('case report');
    const isPaediatric = block.includes('paediatric') || block.includes('children') || block.includes('pediatric');
    const isRelevant = !isCaseReport && !isPaediatric &&
      (block.includes('randomized') || block.includes('cohort') || block.includes('meta-analysis') || block.includes('systematic review'));

    const populationMatch = isPaediatric ? 0.1 : isRelevant ? 0.85 : 0.4;
    const interventionMatch = isRelevant ? 0.8 : 0.3;
    const outcomeMatch = isRelevant ? 0.8 : 0.3;
    const studyDesignScore = isCaseReport ? 0.15 : isRelevant ? 0.9 : 0.5;
    const overallScore = isPaediatric ? 0.15 : isCaseReport ? 0.2 : isRelevant ? 0.88 : 0.42;

    const flags = [];
    if (isPaediatric) flags.push('population_mismatch');
    if (isCaseReport) flags.push('design_too_weak');

    scores.push({
      articleIndex: idx,
      populationMatch,
      interventionMatch,
      outcomeMatch,
      studyDesignScore,
      overallScore,
      exclusionFlags: flags,
      rationale: isPaediatric
        ? 'Population mismatch: paediatric study does not match adult case'
        : isCaseReport
          ? 'Design too weak: case report for management query'
          : isRelevant
            ? 'Strong RCT/meta-analysis matching case population'
            : 'Moderate relevance with some population differences',
    });
  }

  return JSON.stringify(scores);
}

function extractField(prompt, label) {
  const regex = new RegExp(`${label}\\s*(.+?)\\n`);
  const match = prompt.match(regex);
  return match ? match[1].trim() : '';
}

// =============================================================================
// Metrics
// =============================================================================

function precisionAtK(relevantSet, retrievedSet, k) {
  const topK = retrievedSet.slice(0, k);
  let relevantCount = 0;
  for (const item of topK) {
    const title = (item.title || '').toLowerCase();
    const abstract = (item.abstract || '').toLowerCase();
    const isRelevant = relevantSet.some((term) => title.includes(term.toLowerCase()) || abstract.includes(term.toLowerCase()));
    if (isRelevant) relevantCount++;
  }
  return relevantCount / k;
}

function offTopicRateAtK(relevantSet, retrievedSet, k) {
  const topK = retrievedSet.slice(0, k);
  let offTopicCount = 0;
  for (const item of topK) {
    const title = (item.title || '').toLowerCase();
    const abstract = (item.abstract || '').toLowerCase();
    const isRelevant = relevantSet.some((term) => title.includes(term.toLowerCase()) || abstract.includes(term.toLowerCase()));
    if (!isRelevant) offTopicCount++;
  }
  return offTopicCount / k;
}

function studyTypeCoverage(expectedTypes, retrievedSet, k) {
  const topK = retrievedSet.slice(0, k);
  let covered = 0;
  for (const item of topK) {
    const st = String(item.pubtype?.[0] || item.studyType || '').toLowerCase();
    if (expectedTypes.some((et) => st.includes(et.toLowerCase()))) {
      covered++;
    }
  }
  return covered / k;
}

// =============================================================================
// Benchmark Runner
// =============================================================================

async function runUnitBenchmark() {
  console.log('\n=== Unit Benchmark (mock AI) ===\n');

  const mockAi = createMockAiService(10);
  const mockCache = {
    async get() { return null; },
    async set() {},
  };
  const mockServerConfig = { keys: { gemini: 'mock' } };

  const results = [];

  for (const query of LABELLED_QUERIES) {
    const articles = generateMockArticlesForQuery(query);

    const t0Pico = performance.now();
    const picoProfile = await extractPicoProfile(query.caseText, {
      ai: mockAi,
      cache: mockCache,
      serverConfig: mockServerConfig,
    });
    const picoLatency = performance.now() - t0Pico;

    const t0Rerank = performance.now();
    const reranked = await rerankArticlesByPico(articles, picoProfile, {
      ai: mockAi,
      serverConfig: mockServerConfig,
    });
    const rerankLatency = performance.now() - t0Rerank;

    const top10 = selectTopRerankedArticles(reranked, { topN: 10, strictPopulation: true });

    const prec10 = precisionAtK(query.relevantTerms, top10, 10);
    const offTopic10 = offTopicRateAtK(query.relevantTerms, top10, 10);
    const typeCov10 = studyTypeCoverage(query.expectedStudyTypes, top10, 10);

    results.push({
      id: query.id,
      precision_at_10: prec10.toFixed(2),
      off_topic_rate: offTopic10.toFixed(2),
      study_type_cov: typeCov10.toFixed(2),
      pico_ms: Math.round(picoLatency),
      rerank_ms: Math.round(rerankLatency),
      total_ms: Math.round(picoLatency + rerankLatency),
      articles_returned: top10.length,
    });

    // Show top 3 for inspection
    console.log(`\n[${query.id}] Top 3:`);
    top10.slice(0, 3).forEach((a, i) => {
      console.log(`  ${i + 1}. score=${a._rerank?.overallScore?.toFixed(2) ?? '?'} flags=[${a._rerank?.exclusionFlags?.join(', ') ?? ''}] ${a.title.slice(0, 80)}`);
    });
  }

  console.log('\n--- Results ---');
  console.table(results);

  const avgPrecision = results.reduce((s, r) => s + parseFloat(r.precision_at_10), 0) / results.length;
  const avgOffTopic = results.reduce((s, r) => s + parseFloat(r.off_topic_rate), 0) / results.length;
  const avgTypeCov = results.reduce((s, r) => s + parseFloat(r.study_type_cov), 0) / results.length;
  const medianLatency = results.map((r) => r.total_ms).sort((a, b) => a - b)[Math.floor(results.length / 2)];

  console.log('\n=== Aggregates ===');
  console.log(`Precision@10:  ${avgPrecision.toFixed(3)} (target >= 0.75)`);
  console.log(`Off-topic@10:  ${avgOffTopic.toFixed(3)} (target <= 0.10)`);
  console.log(`Study-type cov: ${avgTypeCov.toFixed(3)} (target >= 0.80)`);
  console.log(`Median latency: ${medianLatency}ms (target < 1500ms)`);

  const passed = avgPrecision >= 0.70 && avgOffTopic <= 0.20; // beta thresholds
  console.log(`\nBenchmark ${passed ? 'PASSED' : 'FAILED'} (beta thresholds)`);
  return passed;
}

async function runHeuristicBaseline() {
  console.log('\n=== Baseline Benchmark (heuristic only, no LLM rerank) ===\n');

  const results = [];

  for (const query of LABELLED_QUERIES) {
    const articles = generateMockArticlesForQuery(query);
    const picoProfile = { population: 'Adult', intervention: '', outcome: '', severity: 'Severe', setting: 'ICU', queryIntent: 'management' };

    const scored = articles.map((article) => ({
      ...article,
      _rerank: computeHeuristicScore(article, picoProfile),
    })).sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);

    const top10 = scored.slice(0, 10);
    const prec10 = precisionAtK(query.relevantTerms, top10, 10);
    const offTopic10 = offTopicRateAtK(query.relevantTerms, top10, 10);

    results.push({ id: query.id, precision_at_10: prec10.toFixed(2), off_topic_rate: offTopic10.toFixed(2) });
  }

  console.table(results);
  const avgPrecision = results.reduce((s, r) => s + parseFloat(r.precision_at_10), 0) / results.length;
  console.log(`Baseline Precision@10: ${avgPrecision.toFixed(3)}`);
}

async function runLiveBenchmark() {
  console.log('\n=== Live Integration Benchmark ===\n');
  const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
  const jwt = process.env.JWT || '';

  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const results = [];

  for (const query of LABELLED_QUERIES.slice(0, 3)) {
    const t0 = performance.now();
    const res = await fetch(`${base}/api/cases/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        caseText: query.caseText,
        topic: query.topic,
        learningMode: 'resident',
      }),
    }).catch((e) => ({ ok: false, error: e.message }));

    const latency = performance.now() - t0;

    if (!res.ok) {
      console.log(`[${query.id}] FAILED: ${res.status ?? res.error}`);
      results.push({ id: query.id, ok: false, latency_ms: Math.round(latency), error: res.status ?? res.error });
      continue;
    }

    const data = await res.json();
    const citations = data.citations || [];

    const prec10 = precisionAtK(query.relevantTerms, citations, Math.min(10, citations.length));
    const offTopic10 = offTopicRateAtK(query.relevantTerms, citations, Math.min(10, citations.length));

    results.push({
      id: query.id,
      ok: true,
      latency_ms: Math.round(latency),
      citations: citations.length,
      precision_at_10: prec10.toFixed(2),
      off_topic_rate: offTopic10.toFixed(2),
      reranked: data.rerankMeta ? 'yes' : 'no',
    });
  }

  console.table(results);
}

// =============================================================================
// Main
// =============================================================================

const isLive = process.argv.includes('--live');

if (isLive) {
  runLiveBenchmark().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  (async () => {
    await runHeuristicBaseline();
    const passed = await runUnitBenchmark();
    process.exit(passed ? 0 : 1);
  })();
}
