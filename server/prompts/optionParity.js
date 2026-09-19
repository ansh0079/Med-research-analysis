'use strict';

/**
 * Shared option-writing rule for every multiple-choice generator.
 *
 * Measured on the stored bank: the key was the single longest option in 53.9%
 * of 11,494 questions against a 24.6% chance rate — roughly 3,500 questions
 * answerable by picking the longest option, without knowing any medicine.
 *
 * The cause is not verbosity for its own sake. A correct clinical answer
 * usually needs its qualifiers ("persistent symptoms AND a BASDAI of 4 or more
 * despite conventional therapy") while a wrong one can be wrong in a single
 * clause ("a BASDAI of 2 or higher"). Completeness then correlates with
 * correctness, and length is a free signal for it.
 *
 * So the instruction is about matching clause structure, not padding. Padding
 * distractors with filler produces the same cue in reverse and reads as
 * obviously synthetic.
 */
const OPTION_PARITY_RULE = `Option parity (this is graded — a set that fails it is rejected):
- Every option must carry the same number of qualifying clauses as the correct
  one. If the answer needs a threshold, a duration or a "despite X", give the
  wrong options their own thresholds, durations and "despite X" too.
- Keep all four options within roughly 15% of the same length. The correct
  answer must not be the longest, and must not be the shortest.
- Put the reasoning in "explanation", never inside the option text. An option
  that explains why it is correct has given itself away.
- Wrong options must be wrong on the medicine, not on their grammar,
  specificity or hedging.`;

module.exports = { OPTION_PARITY_RULE };
