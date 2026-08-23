#!/usr/bin/env node
/**
 * Search Rerank Benchmark (ground-truth graded)
 *
 * Scores the heuristic reranker against a FIXED labelled article pool.
 * Relevance metrics use groundTruthGrade only — never the mock LLM's scores —
 * so the harness can fail when ranking is wrong.
 *
 * Usage:
 *   node benchmarks/searchRerankBenchmark.mjs
 *   node benchmarks/searchRerankBenchmark.mjs --adversarial   # mock LLM inverts grades
 *
 * Targets (beta):
 *   nDCG@10           >= 0.70
 *   Precision@5 (g>0) >= 0.60
 */



import {
  selectTopRerankedArticles,
  computeHeuristicScore,
  rerankArticlesByPico,
  buildPicoRerankCacheKey,
} from '../server/services/articleReranker.js';

// =============================================================================
// Labelled queries + fixed article pools (grades 0–3)
// =============================================================================

const LABELLED_QUERIES = [
  {
    id: 'ards-vent-management',
    caseText: '68-year-old man with severe ARDS (PaO2/FiO2 85) on mechanical ventilation.',
    topic: 'ARDS ventilation',
    queryIntent: 'management',
    articles: [
      { uid: 'gt-ards-ltv', title: 'Ventilation with lower tidal volumes for ARDS', abstract: 'Multicenter RCT of 6 vs 12 mL/kg tidal volume in adults with ARDS.', pubtype: ['Randomized Controlled Trial'], year: 2000, groundTruthGrade: 3 },
      { uid: 'gt-ards-prone', title: 'Prone positioning in severe ARDS', abstract: 'RCT of early prone positioning in severe adult ARDS.', pubtype: ['Randomized Controlled Trial'], year: 2013, groundTruthGrade: 3 },
      { uid: 'gt-ards-berlin', title: 'Berlin Definition of ARDS', abstract: 'Consensus definition for acute respiratory distress syndrome.', pubtype: ['Guideline'], year: 2012, groundTruthGrade: 2 },
      { uid: 'gt-ards-meta', title: 'Meta-analysis of lung-protective ventilation', abstract: 'Systematic review of low tidal volume strategies in adults.', pubtype: ['Meta-Analysis'], year: 2019, groundTruthGrade: 2 },
      { uid: 'gt-copd-case', title: 'Case report: paediatric asthma ventilation', abstract: 'Single paediatric case of asthma exacerbation.', pubtype: ['Case Report'], year: 2021, groundTruthGrade: 0 },
      { uid: 'gt-diabetes', title: 'SGLT2 inhibitors in heart failure', abstract: 'Cardiovascular outcomes in HFrEF unrelated to ARDS.', pubtype: ['Randomized Controlled Trial'], year: 2019, groundTruthGrade: 0 },
      { uid: 'gt-ards-obs', title: 'Observational ICU ventilation practices', abstract: 'Cohort describing ventilator settings without intervention.', pubtype: ['Observational Study'], year: 2018, groundTruthGrade: 1 },
      { uid: 'gt-neonatal', title: 'Neonatal respiratory distress syndrome surfactant', abstract: 'Paediatric/neonatal population mismatch.', pubtype: ['Randomized Controlled Trial'], year: 2016, groundTruthGrade: 0 },
      { uid: 'gt-ards-review', title: 'Narrative review of ARDS therapies', abstract: 'Narrative overview without new outcome data.', pubtype: ['Review'], year: 2020, groundTruthGrade: 1 },
      { uid: 'gt-sepsis-bundle', title: 'Hour-1 sepsis bundle outcomes', abstract: 'Sepsis resuscitation unrelated to ARDS ventilation.', pubtype: ['Cohort Study'], year: 2020, groundTruthGrade: 0 },
      { uid: 'gt-ards-ecmo', title: 'ECMO for severe ARDS', abstract: 'RCT of ECMO in refractory hypoxaemic ARDS.', pubtype: ['Randomized Controlled Trial'], year: 2018, groundTruthGrade: 2 },
      { uid: 'gt-filler-1', title: 'General ICU quality improvement', abstract: 'Hospital operations paper.', pubtype: ['Journal Article'], year: 2022, groundTruthGrade: 0 },
    ],
  },
  {
    id: 'sepsis-hour1-management',
    caseText: '45-year-old woman in septic shock. Asking about hour-1 bundle and lactate-guided resuscitation.',
    topic: 'sepsis hour-1 bundle',
    queryIntent: 'management',
    articles: [
      { uid: 'gt-ssc', title: 'Surviving Sepsis Campaign guidelines', abstract: 'International guidelines for management of sepsis and septic shock.', pubtype: ['Practice Guideline'], year: 2021, groundTruthGrade: 3 },
      { uid: 'gt-sepsis-rct', title: 'Early goal-directed therapy RCT', abstract: 'RCT of protocolised resuscitation in septic shock.', pubtype: ['Randomized Controlled Trial'], year: 2001, groundTruthGrade: 2 },
      { uid: 'gt-lactate', title: 'Lactate-guided resuscitation trial', abstract: 'Adult septic shock lactate clearance strategy.', pubtype: ['Randomized Controlled Trial'], year: 2010, groundTruthGrade: 2 },
      { uid: 'gt-ards-ltv2', title: 'Low tidal volume ventilation ARDS', abstract: 'ARDS ventilation trial, wrong syndrome for this query.', pubtype: ['Randomized Controlled Trial'], year: 2000, groundTruthGrade: 0 },
      { uid: 'gt-neo-sepsis', title: 'Neonatal sepsis antibiotics', abstract: 'Paediatric sepsis population.', pubtype: ['Randomized Controlled Trial'], year: 2017, groundTruthGrade: 0 },
      { uid: 'gt-sepsis-case', title: 'Case report of septic shock', abstract: 'Single-patient case report.', pubtype: ['Case Report'], year: 2022, groundTruthGrade: 0 },
      { uid: 'gt-sepsis-cohort', title: 'Cohort of ED sepsis alerts', abstract: 'Observational bundle compliance study.', pubtype: ['Cohort Study'], year: 2019, groundTruthGrade: 1 },
      { uid: 'gt-hf', title: 'SGLT2 inhibitors HFrEF', abstract: 'Heart failure outcomes, off topic.', pubtype: ['Randomized Controlled Trial'], year: 2019, groundTruthGrade: 0 },
      { uid: 'gt-sepsis-meta', title: 'Meta-analysis of sepsis bundles', abstract: 'Systematic review of early sepsis interventions.', pubtype: ['Meta-Analysis'], year: 2020, groundTruthGrade: 2 },
      { uid: 'gt-filler-2', title: 'Hospital staffing ratios', abstract: 'Operations research.', pubtype: ['Journal Article'], year: 2021, groundTruthGrade: 0 },
    ],
  },
  {
    id: 'af-guideline-stroke',
    caseText: '70-year-old with new atrial fibrillation. What do guidelines recommend for stroke prevention?',
    topic: 'atrial fibrillation guideline',
    queryIntent: 'guideline',
    articles: [
      { uid: 'gt-af-gl', title: '2023 ACC/AHA atrial fibrillation guideline', abstract: 'Practice guideline for diagnosis and management of AF including anticoagulation.', pubtype: ['Practice Guideline'], year: 2023, groundTruthGrade: 3 },
      { uid: 'gt-re-ly', title: 'Dabigatran versus warfarin in AF', abstract: 'RE-LY RCT of anticoagulation for stroke prevention.', pubtype: ['Randomized Controlled Trial'], year: 2009, groundTruthGrade: 2 },
      { uid: 'gt-aristotle', title: 'Apixaban versus warfarin in AF', abstract: 'ARISTOTLE RCT.', pubtype: ['Randomized Controlled Trial'], year: 2011, groundTruthGrade: 2 },
      { uid: 'gt-ards3', title: 'Prone positioning severe ARDS', abstract: 'Critical care ventilation trial, off topic.', pubtype: ['Randomized Controlled Trial'], year: 2013, groundTruthGrade: 0 },
      { uid: 'gt-af-review', title: 'Narrative review of AF rate control', abstract: 'Narrative review without guideline status.', pubtype: ['Review'], year: 2020, groundTruthGrade: 1 },
      { uid: 'gt-af-case', title: 'Case report of AF ablation', abstract: 'Single case.', pubtype: ['Case Report'], year: 2021, groundTruthGrade: 0 },
      { uid: 'gt-pe', title: 'Rivaroxaban for pulmonary embolism', abstract: 'PE anticoagulation RCT, related drug class but wrong indication.', pubtype: ['Randomized Controlled Trial'], year: 2012, groundTruthGrade: 0 },
      { uid: 'gt-af-meta', title: 'Meta-analysis of DOACs in AF', abstract: 'Systematic review of DOAC stroke prevention.', pubtype: ['Meta-Analysis'], year: 2019, groundTruthGrade: 2 },
      { uid: 'gt-filler-3', title: 'Outpatient clinic scheduling', abstract: 'Operations.', pubtype: ['Journal Article'], year: 2022, groundTruthGrade: 0 },
      { uid: 'gt-htn-gl', title: 'Hypertension clinical practice guideline', abstract: 'BP guideline, not AF-specific.', pubtype: ['Practice Guideline'], year: 2017, groundTruthGrade: 0 },
    ],
  },
  {
    id: 'pe-diagnosis',
    caseText: 'Stable adult with suspected PE. What is the best initial diagnostic approach?',
    topic: 'PE diagnosis',
    queryIntent: 'diagnosis',
    articles: [
      { uid: 'gt-wells', title: 'Clinical decision rule for PE (Wells)', abstract: 'Validated clinical decision rule for suspected pulmonary embolism.', pubtype: ['Clinical Decision Rule'], year: 2000, groundTruthGrade: 3 },
      { uid: 'gt-perc', title: 'PERC rule for pulmonary embolism', abstract: 'Decision rule to exclude PE in low-risk patients.', pubtype: ['Clinical Decision Rule'], year: 2008, groundTruthGrade: 3 },
      { uid: 'gt-pe-rct', title: 'Rivaroxaban for symptomatic PE', abstract: 'Treatment RCT, not a diagnostic study.', pubtype: ['Randomized Controlled Trial'], year: 2012, groundTruthGrade: 1 },
      { uid: 'gt-pe-cta', title: 'CT pulmonary angiography accuracy', abstract: 'Diagnostic accuracy study for CTA in suspected PE.', pubtype: ['Comparative Study'], year: 2006, groundTruthGrade: 2 },
      { uid: 'gt-ards4', title: 'Berlin ARDS definition', abstract: 'Wrong syndrome.', pubtype: ['Guideline'], year: 2012, groundTruthGrade: 0 },
      { uid: 'gt-pe-case', title: 'Case report of PE thrombolysis', abstract: 'Case report.', pubtype: ['Case Report'], year: 2020, groundTruthGrade: 0 },
      { uid: 'gt-dvt', title: 'D-dimer in deep vein thrombosis', abstract: 'Adjacent but not PE-primary.', pubtype: ['Cohort Study'], year: 2015, groundTruthGrade: 1 },
      { uid: 'gt-filler-4', title: 'ED triage algorithms', abstract: 'General ED operations.', pubtype: ['Journal Article'], year: 2021, groundTruthGrade: 0 },
      { uid: 'gt-pe-review', title: 'Review of PE imaging choices', abstract: 'Diagnostic pathway review.', pubtype: ['Review'], year: 2019, groundTruthGrade: 2 },
      { uid: 'gt-stroke', title: 'tPA for ischemic stroke', abstract: 'Unrelated acute care RCT.', pubtype: ['Randomized Controlled Trial'], year: 1995, groundTruthGrade: 0 },
    ],
  },
  {
    id: 'aki-fluids-management',
    caseText: '62-year-old with septic AKI stage 2, positive fluid balance. Role of diuretics?',
    topic: 'AKI fluid management',
    queryIntent: 'management',
    articles: [
      { uid: 'gt-factt', title: 'Conservative fluid strategy in acute lung injury', abstract: 'RCT of fluid management relevant to positive balance.', pubtype: ['Randomized Controlled Trial'], year: 2006, groundTruthGrade: 2 },
      { uid: 'gt-aki-diuretic', title: 'Diuretics in AKI systematic review', abstract: 'Review of loop diuretics for oliguric AKI.', pubtype: ['Systematic Review'], year: 2018, groundTruthGrade: 3 },
      { uid: 'gt-kdigo', title: 'KDIGO AKI clinical practice guideline', abstract: 'Guideline recommendations for AKI management.', pubtype: ['Practice Guideline'], year: 2012, groundTruthGrade: 3 },
      { uid: 'gt-ckd', title: 'SGLT2 inhibitors in CKD', abstract: 'Chronic kidney disease outcomes, wrong acuity.', pubtype: ['Randomized Controlled Trial'], year: 2020, groundTruthGrade: 0 },
      { uid: 'gt-aki-case', title: 'Case report of diuretic infusion', abstract: 'Case report.', pubtype: ['Case Report'], year: 2021, groundTruthGrade: 0 },
      { uid: 'gt-aki-cohort', title: 'Observational fluid balance and AKI', abstract: 'Cohort linking fluid overload to outcomes.', pubtype: ['Cohort Study'], year: 2017, groundTruthGrade: 2 },
      { uid: 'gt-neo-aki', title: 'Neonatal AKI definitions', abstract: 'Paediatric mismatch.', pubtype: ['Guideline'], year: 2019, groundTruthGrade: 0 },
      { uid: 'gt-filler-5', title: 'Pharmacy inventory systems', abstract: 'Unrelated.', pubtype: ['Journal Article'], year: 2022, groundTruthGrade: 0 },
      { uid: 'gt-sepsis2', title: 'Surviving Sepsis fluids section', abstract: 'Sepsis guideline with fluid recommendations overlapping AKI context.', pubtype: ['Practice Guideline'], year: 2021, groundTruthGrade: 1 },
      { uid: 'gt-dialysis', title: 'Timing of RRT in AKI RCT', abstract: 'Dialysis timing trial — related but not first-line diuretic question.', pubtype: ['Randomized Controlled Trial'], year: 2020, groundTruthGrade: 1 },
    ],
  },
];

// =============================================================================
// Metrics against ground-truth grades (NOT model scores)
// =============================================================================

function ndcgAtK(articles, k) {
  const slice = articles.slice(0, k);
  let dcg = 0;
  for (let i = 0; i < slice.length; i++) {
    const g = Number(slice[i].groundTruthGrade || 0);
    if (g > 0) dcg += (2 ** g - 1) / Math.log2(i + 2);
  }
  const ideal = [...articles]
    .map((a) => Number(a.groundTruthGrade || 0))
    .sort((a, b) => b - a)
    .slice(0, k);
  let idcg = 0;
  for (let i = 0; i < ideal.length; i++) {
    if (ideal[i] > 0) idcg += (2 ** ideal[i] - 1) / Math.log2(i + 2);
  }
  return idcg > 0 ? dcg / idcg : 0;
}

function precisionAtK(articles, k, minGrade = 1) {
  const slice = articles.slice(0, k);
  if (!slice.length) return 0;
  const hits = slice.filter((a) => Number(a.groundTruthGrade || 0) >= minGrade).length;
  return hits / slice.length;
}

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toArticle(row) {
  return {
    uid: row.uid,
    pmid: row.uid,
    title: row.title,
    abstract: row.abstract,
    year: row.year,
    pubdate: String(row.year),
    journal: 'Benchmark Journal',
    source: 'fixture',
    pubtype: row.pubtype,
    groundTruthGrade: row.groundTruthGrade,
  };
}

function picoFor(query) {
  return {
    population: 'Adult',
    intervention: '',
    outcome: '',
    severity: 'Severe',
    setting: 'ICU',
    queryIntent: query.queryIntent || 'management',
  };
}

/** Deterministic non-oracle LLM: constant scores — cannot encode ground truth. */
function applyConstantLlmScores(articles, score = 0.5) {
  return articles.map((article, index) => ({
    ...article,
    _rerank: {
      overallScore: score,
      populationMatch: score,
      interventionMatch: score,
      outcomeMatch: score,
      studyDesignScore: score,
      exclusionFlags: [],
      rationale: 'constant mock LLM score (non-oracle)',
      source: 'mock_llm_constant',
      rank: index + 1,
    },
  }));
}

/** Adversarial LLM: higher scores for lower ground-truth grades. */
function applyAdversarialLlmScores(articles) {
  return articles.map((article, index) => {
    const g = Number(article.groundTruthGrade || 0);
    const overallScore = (3 - g) / 3;
    return {
      ...article,
      _rerank: {
        overallScore,
        populationMatch: overallScore,
        interventionMatch: overallScore,
        outcomeMatch: overallScore,
        studyDesignScore: overallScore,
        exclusionFlags: g >= 2 ? ['adversarial_demote'] : [],
        rationale: 'adversarial mock LLM inverts ground truth',
        source: 'mock_llm_adversarial',
        rank: index + 1,
      },
    };
  }).sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);
}

function rankByHeuristic(articles, pico) {
  return articles
    .map((article) => ({
      ...article,
      _rerank: computeHeuristicScore(article, pico),
    }))
    .sort((a, b) => b._rerank.overallScore - a._rerank.overallScore);
}

function evaluateRanking(query, ranked) {
  const top = selectTopRerankedArticles(ranked, { topN: 10, strictPopulation: false });
  return {
    id: query.id,
    n: query.articles.length,
    ndcg_at_10: ndcgAtK(top, 10),
    precision_at_5: precisionAtK(top, 5, 1),
    precision_at_10: precisionAtK(top, 10, 1),
    top3: top.slice(0, 3).map((a) => `${a.uid}:g${a.groundTruthGrade}`),
  };
}

function aggregate(results) {
  const avg = (key) => results.reduce((s, r) => s + r[key], 0) / results.length;
  return {
    ndcg_at_10: avg('ndcg_at_10'),
    precision_at_5: avg('precision_at_5'),
    precision_at_10: avg('precision_at_10'),
  };
}

async function runBenchmark({ adversarial = false } = {}) {
  console.log(`\n=== Ground-truth rerank benchmark${adversarial ? ' (adversarial LLM)' : ''} ===\n`);

  const heuristicResults = [];
  const llmResults = [];

  for (const query of LABELLED_QUERIES) {
    const articles = shuffle(query.articles.map(toArticle));
    const pico = picoFor(query);

    const heuristicRanked = rankByHeuristic(articles, pico);
    const heuristicEval = evaluateRanking(query, heuristicRanked);
    heuristicResults.push(heuristicEval);

    const llmRanked = adversarial
      ? applyAdversarialLlmScores(articles)
      : applyConstantLlmScores(articles, 0.5);
    const llmEval = evaluateRanking(query, llmRanked);
    llmResults.push(llmEval);

    console.log(`[${query.id}] heuristic nDCG@10=${heuristicEval.ndcg_at_10.toFixed(3)} P@5=${heuristicEval.precision_at_5.toFixed(3)} top3=${heuristicEval.top3.join(', ')}`);
    console.log(`             llm-mock  nDCG@10=${llmEval.ndcg_at_10.toFixed(3)} P@5=${llmEval.precision_at_5.toFixed(3)}`);
  }

  const heuristicAgg = aggregate(heuristicResults);
  const llmAgg = aggregate(llmResults);

  console.log('\n--- Heuristic (scored vs ground truth) ---');
  console.table(heuristicResults.map((r) => ({
    id: r.id,
    ndcg_at_10: r.ndcg_at_10.toFixed(3),
    precision_at_5: r.precision_at_5.toFixed(3),
    precision_at_10: r.precision_at_10.toFixed(3),
  })));

  console.log('\n=== Aggregates ===');
  console.log(`Heuristic nDCG@10:  ${heuristicAgg.ndcg_at_10.toFixed(3)} (target >= 0.70)`);
  console.log(`Heuristic P@5:      ${heuristicAgg.precision_at_5.toFixed(3)} (target >= 0.60)`);
  console.log(`Constant/adversarial LLM nDCG@10: ${llmAgg.ndcg_at_10.toFixed(3)} (must NOT beat heuristic by oracle leak)`);

  const heuristicPass = heuristicAgg.ndcg_at_10 >= 0.70 && heuristicAgg.precision_at_5 >= 0.60;
  // Guard: a non-oracle / adversarial LLM path must not outperform heuristic on GT metrics
  // by a large margin — that would indicate metrics are still coupled to model scores.
  const llmOracleLeak = llmAgg.ndcg_at_10 > heuristicAgg.ndcg_at_10 + 0.05;
  const passed = heuristicPass && !llmOracleLeak;

  if (llmOracleLeak) {
    console.error('🚨 Oracle-leak guard failed: non-informative LLM ranking beat heuristic on ground-truth metrics.');
  }
  const cacheStore = new Map();
  const cache = {
    get: async (key) => cacheStore.get(key) || null,
    set: async (key, value) => { cacheStore.set(key, value); },
  };
  const sample = LABELLED_QUERIES[0];
  const pico = picoFor(sample);
  const sampleArticles = sample.articles.map(toArticle);
  const t1 = Date.now();
  await rerankArticlesByPico(sampleArticles, pico, { ai: null, cache, serverConfig: {} });
  const missMs = Date.now() - t1;
  const t2 = Date.now();
  await rerankArticlesByPico(sampleArticles, pico, { ai: null, cache, serverConfig: {} });
  const hitMs = Date.now() - t2;
  console.log(`\nPICO rerank cache: miss ${missMs}ms, hit ${hitMs}ms, key ${buildPicoRerankCacheKey(pico, sampleArticles)}`);

  console.log(`\nBenchmark ${passed ? 'PASSED' : 'FAILED'}`);
  return passed;
}

const adversarial = process.argv.includes('--adversarial');
runBenchmark({ adversarial }).then((passed) => process.exit(passed ? 0 : 1)).catch((err) => {
  console.error(err);
  process.exit(1);
});
