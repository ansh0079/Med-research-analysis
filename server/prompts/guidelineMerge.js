'use strict';

/**
 * Group a topic's guideline recommendations into clinical themes.
 *
 * A clinician looking at a topic gets twenty separate recommendation rows from
 * five organisations and has to merge them in their head. The useful view puts
 * everything said about one clinical decision together, so agreement and
 * disagreement between bodies are visible at a glance.
 *
 * THE MODEL NEVER WRITES RECOMMENDATION TEXT. It returns theme labels and the
 * indices of the recommendations belonging to each. The caller rebuilds every
 * group from the original rows, so a fabricated or subtly reworded
 * recommendation is not merely discouraged, it is unrepresentable -- the only
 * thing that can come back wrong is a grouping, which is visible and harmless
 * next to a misquoted piece of guidance.
 */

function buildGuidelineMergePrompt(topic, recommendations = []) {
    const list = recommendations
        .map((r, i) => {
            const body = r.sourceBody || 'Unattributed';
            const year = r.sourceYear ? ` ${r.sourceYear}` : '';
            const strength = r.recommendationStrength ? ` (${r.recommendationStrength})` : '';
            return `[${i}] ${body}${year}${strength}: ${String(r.recommendationText || '').trim().slice(0, 400)}`;
        })
        .join('\n');

    return `You are organising clinical guideline recommendations for a clinician deciding how to manage: ${topic}

Below are ${recommendations.length} recommendations, each with an index in square brackets. They come from different organisations and different years.

${list}

TASK: group these indices into clinical themes. A theme is one clinical decision or
management question -- for example "when to start vasoconstrictor therapy", "antibiotic
prophylaxis", "monitoring and follow-up", "when to refer or escalate". Put every
recommendation that speaks to the same decision in the same theme, whether the
organisations agree or not: showing that they disagree is the point.

RULES
- Return ONLY indices. Never write, paraphrase, summarise or correct recommendation text.
- Every index from 0 to ${Math.max(0, recommendations.length - 1)} must appear exactly once, in exactly one theme.
- Order themes by clinical importance, most decision-critical first.
- Order indices within a theme by strength first (strong before conditional before
  ungraded), then by year, most recent first.
- Aim for 3-7 themes. Prefer a slightly broader theme over a theme of one.
- label: a short clinical noun phrase, at most 6 words. No numbering, no trailing colon.
- agreement: "agree" when the bodies in this theme point the same way, "conflict" when
  any two of them point different ways on the same decision, "single" when only one
  organisation is represented. Judge only from the text shown.
- conflictNote: one sentence naming which organisations differ and on what, ONLY when
  agreement is "conflict". Otherwise null. Name organisations, do not restate the
  recommendations.

Return ONLY valid JSON, no markdown fence:
{
  "themes": [
    {
      "label": "string",
      "agreement": "agree" | "conflict" | "single",
      "conflictNote": "string or null",
      "recommendationIndexes": [0, 3, 7]
    }
  ]
}`;
}

module.exports = { buildGuidelineMergePrompt };
