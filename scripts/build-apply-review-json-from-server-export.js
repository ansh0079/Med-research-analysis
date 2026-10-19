#!/usr/bin/env node
'use strict';

/**
 * Build an apply-mcq-review JSON from a saved "Server Export (Object Key)" HTML page.
 *
 * Input: an HTML file containing:
 *   - a topics array: "var Gc = [ ... ]"
 *   - a generator function: "function Tm() { ... }" which returns 588 rows with:
 *       { object_key, question_index, review_number, proposed_topic, correct_answer_letter,
 *         correct_answer_text, original_issue, corrected_guideline_title, guideline_url,
 *         corrected_recommendation, corrected_paper_citation, status, review_action, evidence_strength }
 *
 * Output JSON shape (apply-mcq-review dry-run friendly, using direct object_key/index path):
 *   {
 *     "corrections": [
 *       {
 *         "object_key": "...",
 *         "question_index": 0,
 *         "verdict": "UPDATE_EVIDENCE",
 *         "notes": "Hypertension Management (review #1)",
 *         "suggestedAnswer": "B",
 *         "source": "2023 ESH Guidelines for Management of Arterial Hypertension https://www.eshonline.org/guidelines/2023-hypertension-guideline/",
 *         "newExplanation": "Target <130/80 mmHg for high-risk adults; ... Source: Mancia G et al. J Hypertens. 2023;..."
 *       },
 *       ...
 *     ]
 *   }
 *
 * Usage:
 *   node scripts/build-apply-review-json-from-server-export.js <Server-Export-Object-Key.html> <output.json>
 */

const fs = require('fs');
const vm = require('vm');

function extractBlock(html, startMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`Marker not found: ${startMarker}`);
  let i = start + startMarker.length;
  // find first '[' or '{' depending on marker
  const open = html[i] === '[' ? '[' : html.slice(i).trim().startsWith('[') ? '[' : '{';
  const first = html.indexOf(open, start);
  if (first < 0) throw new Error(`Opening ${open} not found after ${startMarker}`);
  let depth = 0;
  let j = first;
  while (j < html.length) {
    const ch = html[j];
    if (ch === open) depth += 1;
    else if (ch === (open === '[' ? ']' : '}')) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(first, j + 1);
      }
    }
    j += 1;
  }
  throw new Error(`Unbalanced structure when extracting after ${startMarker}`);
}

function extractFunction(html, fnName) {
  const marker = `function ${fnName}()`;
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`Function not found: ${fnName}`);
  // Find opening brace
  const brace = html.indexOf('{', start);
  if (brace < 0) throw new Error(`Opening brace not found for ${fnName}`);
  let depth = 0;
  let i = brace;
  while (i < html.length) {
    const ch = html[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, i + 1);
      }
    }
    i += 1;
  }
  throw new Error(`Unbalanced braces in function ${fnName}`);
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error('usage: node scripts/build-apply-review-json-from-server-export.js <Server-Export-Object-Key.html> <output.json>');
    process.exit(2);
  }
  const html = fs.readFileSync(input, 'utf8');
  // Extract topics (Gc) and generator (Tm)
  const topicsSrc = extractBlock(html, 'var Gc=');
  const tmSrc = extractFunction(html, 'Tm');
  const ctx = vm.createContext({});
  const code = `
    var Gc = ${topicsSrc};
    ${tmSrc}
    Tm();
  `;
  const script = new vm.Script(code, { timeout: 2000 });
  const rows = script.runInContext(ctx);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No rows produced by Tm()');
  const corrections = rows.map((r) => {
    const objectKey = String(r.object_key);
    const qIndex = Number(r.question_index);
    const verdict = String(r.review_action || 'UPDATE_EVIDENCE');
    const notes = `${r.proposed_topic} (review #${r.review_number})`;
    const suggestedAnswer = String(r.correct_answer_letter || '').trim();
    const source = `${r.corrected_guideline_title} ${r.guideline_url}`.trim();
    const explanation = `${r.corrected_recommendation} Source: ${r.corrected_paper_citation}`.trim();
    return {
      object_key: objectKey,
      question_index: qIndex,
      verdict,
      notes,
      suggestedAnswer,
      source,
      newExplanation: explanation,
    };
  });
  fs.mkdirSync(require('path').dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ corrections }, null, 2));
  console.log(`Wrote corrections: ${corrections.length} -> ${output}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err?.stack || String(err));
    process.exit(1);
  }
}

