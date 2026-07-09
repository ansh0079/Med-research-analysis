#!/usr/bin/env node
/**
 * Fixed clinical query benchmark stub — extend with real search + synthesis calls.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 JWT=<bearer> node benchmarks/clinicalEvidenceBenchmark.mjs
 */


const scenarios = [
  { id: 'sepsis-hour-1', topic: 'sepsis hour-1 bundle lactate', landmarkTerms: ['sepsis', 'lactate'] },
  { id: 'ards-oxygen', topic: 'ARDS PEEP FiO2 low tidal volume', landmarkTerms: ['ARDS', 'PEEP'] },
  { id: 'copd-niv', topic: 'COPD acute hypercapnic respiratory failure NIV', landmarkTerms: ['COPD', 'NIV'] },
  { id: 'acs-dap', topic: 'acute coronary syndrome dual antiplatelet', landmarkTerms: ['coronary', 'antiplatelet'] },
  { id: 'pe-anticoag', topic: 'pulmonary embolism anticoagulation', landmarkTerms: ['embolism', 'anticoag'] },
  { id: 'glp1-mace', topic: 'GLP-1 receptor agonist cardiovascular outcomes', landmarkTerms: ['GLP', 'cardiovascular'] },
  { id: 'covid-therapeutics', topic: 'COVID-19 antiviral outpatient therapy', landmarkTerms: ['COVID', 'antiviral'] },
];

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const jwt = process.env.JWT || '';

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (jwt) h.Authorization = `Bearer ${jwt}`;
  return h;
}

async function ping() {
  const t0 = Date.now();
  const res = await fetch(`${base}/health`, { headers: authHeaders() }).catch(() => null);
  return { ok: Boolean(res?.ok), latencyMs: Date.now() - t0, status: res?.status ?? 0 };
}

async function main() {
  console.log(`Benchmark against ${base} (${scenarios.length} scenarios)`);
  const health = await ping();
  console.log('Health:', health);
  const rows = [];
  for (const sc of scenarios) {
    const landmarkHits = sc.landmarkTerms.filter((t) => sc.topic.toLowerCase().includes(t.toLowerCase())).length;
    rows.push({
      id: sc.id,
      topic: sc.topic,
      landmarkProbe: `${landmarkHits}/${sc.landmarkTerms.length}`,
      note: 'Wire /api/search + async synthesis + claims for full metrics',
    });
  }
  console.table(rows);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
