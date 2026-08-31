'use strict';
const { Pool } = require('pg');
const fs = require('fs');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const BODY = new RegExp([
  'NICE','SIGN\b','WHO\b','World Health Organization','ESC\b','EACTS','ACC\b','AHA\b','ACCF',
  'EULAR','ACR\b','IDSA','BTS\b','BSR\b','BASHH','RCOG','RCPCH','RCP\b','RCEM','GOLD\b','KDIGO',
  'ADA\b','EASD','NCCN','ASCO','ESMO','CDC\b','ACIP','ERS\b','ATS\b','ESICM','SCCM','SSC\b',
  'RCUK','ERC\b','JBDS','FSRH','BSACI','EAACI','BAP\b','NPUAP','EPUAP','ESRA','BSSH','GINA',
  'ISTH','ASH\b','AASLD','EASL','ACG\b','BSG\b','AGA\b','ECCO','UEG','EAU\b','AUA\b','BAUS',
  'AAN\b','ABN\b','EAN\b','ILAE','MDS\b','AAOS','BOA\b','SPILF','ESCMID','IDF\b','ISPAD',
  'ATA\b','BTA\b','ESE\b','ESPEN','ASPEN','NIAAA','SAMHSA','APA\b','NIH\b','USPSTF','AAFP',
  'AAP\b','SOGC','RANZCOG','CCS\b','ESH\b','ISH\b','JNC\b',
].join('|'), 'i');

(async () => {
  const topics = (await p.query('SELECT display_name, specialty FROM curriculum_topics')).rows;
  const objs = (await p.query(
    "SELECT object_type, normalized_topic, object_payload FROM teaching_objects " +
    "WHERE object_type IN ('guideline_summary','guideline_mcq','paper_mcq','cold_start_mcq','paper','topic_consensus')"
  )).rows;

  const ev = new Map();
  const get = (k) => {
    if (!ev.has(k)) ev.set(k, { bodies: new Set(), pgMcqs: 0, allMcqs: 0, synopsis: false, year: null });
    return ev.get(k);
  };
  for (const o of objs) {
    const k = norm(o.normalized_topic);
    if (!k) continue;
    const pl = typeof o.object_payload === 'string' ? JSON.parse(o.object_payload) : o.object_payload;
    const e = get(k);
    const t = o.object_type;
    if (t === 'paper' || t === 'topic_consensus') { e.synopsis = true; continue; }
    if (t === 'paper_mcq' || t === 'cold_start_mcq') { e.allMcqs += (pl.mcqs || []).length; continue; }
    if (t === 'guideline_summary') {
      for (const b of (pl.bodies || [])) if (BODY.test(String(b))) e.bodies.add(String(b).trim());
      if (pl.latestYear) e.year = Math.max(e.year || 0, Number(pl.latestYear) || 0);
      continue;
    }
    const n = (pl.mcqs || []).length;
    e.allMcqs += n;
    if (pl.sourceType === 'practice_guideline') e.pgMcqs += n;
    for (const m of (pl.mcqs || [])) {
      const ref = String(m.guidelineRef || '');
      if (BODY.test(ref)) e.bodies.add(ref.slice(0, 60).trim());
    }
  }

  const withG = [], gap = [];
  for (const t of topics) {
    const e = ev.get(norm(t.display_name)) || { bodies: new Set(), pgMcqs: 0, allMcqs: 0, synopsis: false, year: null };
    const rec = { topic: t.display_name, specialty: t.specialty || '', bodies: [...e.bodies].slice(0, 3).join('; '), pgMcqs: e.pgMcqs, allMcqs: e.allMcqs, synopsis: e.synopsis, year: e.year };
    (e.bodies.size > 0 || e.pgMcqs > 0 ? withG : gap).push(rec);
  }
  gap.sort((a, b) => (a.allMcqs - b.allMcqs) || a.specialty.localeCompare(b.specialty) || a.topic.localeCompare(b.topic));

  const esc = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const prio = (r) => (r.allMcqs === 0 ? 'high' : r.allMcqs < 4 ? 'medium' : 'low');
  fs.writeFileSync('/app/topics-without-guidelines.csv',
    'topic,specialty,total_mcqs,has_paper_synopsis,priority\n' +
    gap.map((r) => [esc(r.topic), esc(r.specialty), r.allMcqs, r.synopsis ? 'yes' : 'no', prio(r)].join(',')).join('\n'));
  fs.writeFileSync('/app/topics-with-guidelines.csv',
    'topic,specialty,guideline_bodies,practice_guideline_mcqs,latest_guideline_year\n' +
    withG.map((r) => [esc(r.topic), esc(r.specialty), esc(r.bodies), r.pgMcqs, r.year || ''].join(',')).join('\n'));

  console.log('curriculum topics:         ' + topics.length);
  console.log('WITH real guideline basis: ' + withG.length + '  (' + (100 * withG.length / topics.length).toFixed(1) + '%)');
  console.log('WITHOUT (gap):             ' + gap.length + '  (' + (100 * gap.length / topics.length).toFixed(1) + '%)');
  const bySpec = {};
  gap.forEach((r) => { const s = r.specialty || '(none)'; bySpec[s] = (bySpec[s] || 0) + 1; });
  console.log('\ngaps by specialty (top 15):');
  Object.entries(bySpec).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log('  ' + k.padEnd(28) + String(v).padStart(5)));
  await p.end();
})().catch((e) => { console.error(e.stack); process.exit(1); });
