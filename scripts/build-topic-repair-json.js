#!/usr/bin/env node
'use strict';

/**
 * Extract the embedded topic-repair dataset from a saved HTML app page and emit JSON rows.
 *
 * Usage:
 *   node scripts/build-topic-repair-json.js <input.html> <output.json>
 *
 * The input page defines `var ac = [...]` and a generator `stemTemplate(e)` per seed.
 * We reconstruct the 588 rows exactly like the page's `$0()` helper.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

function extractAcArray(html) {
  const marker = 'var ac=[';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Could not find "var ac=[" in input HTML');
  let i = start + 'var '.length; // position after 'var '
  // Find the '[' that starts the array
  const arrStart = html.indexOf('[', start);
  if (arrStart < 0) throw new Error('Could not find "[" after var ac=');
  let depth = 0;
  let j = arrStart;
  while (j < html.length) {
    const ch = html[j];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        // Include closing bracket
        const snippet = html.slice(arrStart, j + 1);
        return snippet;
      }
    }
    j += 1;
  }
  throw new Error('Failed to balance array brackets for ac');
}

function buildRowsFromAc(ac, total = 588) {
  const rows = [];
  for (let t = 1; t <= total; t++) {
    const n = ac[(t - 1) % ac.length];
    const stem = typeof n.stemTemplate === 'function' ? n.stemTemplate(t) : '';
    rows.push({
      review_number: t,
      proposed_topic: n.proposed_topic,
      question_stem_truncated: stem,
      correct_answer: n.correct_answer,
      original_issue: n.original_issue,
      corrected_guideline_title: n.corrected_guideline_title,
      guideline_url: n.guideline_url,
      corrected_recommendation: n.corrected_recommendation,
      corrected_paper_title_authors_year: n.corrected_paper,
      status: 'REPAIRED',
      evidence_strength: 'High',
    });
  }
  return rows;
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error('usage: node scripts/build-topic-repair-json.js <input.html> <output.json>');
    process.exit(2);
  }
  const html = fs.readFileSync(input, 'utf8');
  const arrSrc = extractAcArray(html);
  // Evaluate `ac` array safely
  const context = vm.createContext({});
  const script = new vm.Script(`(function(){ const ac = ${arrSrc}; return ac; })()`);
  const ac = script.runInContext(context, { timeout: 1000 });
  if (!Array.isArray(ac) || !ac.length) throw new Error('Evaluated ac is empty or not an array');
  const rows = buildRowsFromAc(ac, 588);
  const outDir = path.dirname(output);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(output, JSON.stringify(rows, null, 2));
  console.log(`Wrote ${rows.length} rows to ${output}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err?.stack || String(err));
    process.exit(1);
  }
}

