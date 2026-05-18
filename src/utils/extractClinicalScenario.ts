/**
 * Lightweight heuristic extractor for clinical scenario text.
 * Parses free-text presentations into PICO elements and a decision point
 * without requiring an AI round-trip.
 */

export interface ClinicalScenarioExtract {
  population: string;
  intervention: string;
  comparison: string;
  outcome: string;
  decisionPoint: string;
  confidence: number; // 0–1 aggregate
}

const AGE_SEX_RE = /\b(\d{1,3})([-\s]?(year[-\s]?old|yo|y\/o|y\.o\.?)|[-\s]?y\b)?\s*(male|female|man|woman|boy|girl|m\b|f\b)\b/gi;
const INTERVENTION_HINTS = /\b(treat(?:ed|ment|ing)|give|giving|administer|start(?:ed)?|prescrib(?:ed|ing)|on\s+(?:a\s+)?(?:the\s+)?)([^,.;]{3,60})/gi;
const COMPARISON_MARKERS = /\b(versus|vs\.?|compared?\s+(?:to|with)|instead\s+of|rather\s+than|or\s+(?:the\s+)?(?:standard|usual|placebo|control))\b/gi;
const OUTCOME_MARKERS = /\b(mortality|survival|death|improve|reduce|decrease|increase|length\s+of\s+stay|LOS|readmi(?:ssion|t)|complication|adverse\s+event|AE|quality\s+of\s+life|QoL|disability|recovery|relapse|remission|progression)\b/gi;
const DECISION_QUESTION_RE = /[^.!?]*(?:should|would|could|do|does|did|can|will|is\s+there|are\s+there|what\s+(?:is|are)|how\s+(?:should|do|does)|whether)[^.!?]*\?/gi;
const DECISION_PHRASE_RE = /\b(decision\s+point|unsure|uncertain|wondering|question\s+(?:is|of)|not\s+known|debatable|controversial)\b[^.!?]{0,120}/gi;

function extractAgeSex(text: string): string {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(AGE_SEX_RE.source, AGE_SEX_RE.flags);
  while ((m = re.exec(text)) !== null) {
    matches.push(m[0]);
  }
  return matches.join(', ');
}

function extractCondition(text: string): string {
  // Simple heuristic: words after "with" near the start that look like conditions
  const withMatch = text.match(/\bwith\s+([^,.;]{3,60})/i);
  return withMatch ? withMatch[1].trim() : '';
}

function extractPopulation(text: string): string {
  const ageSex = extractAgeSex(text);
  const condition = extractCondition(text);
  const parts: string[] = [];
  if (ageSex) parts.push(ageSex);
  if (condition) parts.push(condition);
  if (!parts.length) {
    // Fallback: any population hint + surrounding context
    const popMatch = text.match(/\b(adults?|children?|pediatric|elderly|patients?)\b[^,.;]{0,60}/i);
    if (popMatch) parts.push(popMatch[0]);
  }
  return parts.join('; ').slice(0, 200);
}

function extractIntervention(text: string): string {
  const interventions: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(INTERVENTION_HINTS.source, INTERVENTION_HINTS.flags);
  while ((m = re.exec(text)) !== null) {
    const candidate = m[2]?.trim();
    if (candidate && candidate.split(' ').length <= 8) {
      interventions.push(candidate);
    }
  }
  // Also look for common drug classes/procedures explicitly named after "on"
  const onMatch = text.match(/\bon\s+([^,.;]{3,40})/gi);
  if (onMatch) {
    for (const match of onMatch) {
      const drug = match.replace(/\bon\s+/i, '').trim();
      if (drug && !interventions.includes(drug)) interventions.push(drug);
    }
  }
  return interventions.join('; ').slice(0, 200);
}

function extractComparison(text: string): string {
  const compMatch = text.match(COMPARISON_MARKERS);
  if (!compMatch) return '';
  // Capture phrase after comparison marker
  const afterComp = text.split(COMPARISON_MARKERS)[1];
  if (afterComp) {
    const phrase = afterComp.match(/^[^,.;]{3,60}/);
    if (phrase) return phrase[0].trim();
  }
  return '';
}

function extractOutcome(text: string): string {
  const outcomes: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(OUTCOME_MARKERS.source, OUTCOME_MARKERS.flags);
  while ((m = re.exec(text)) !== null) {
    outcomes.push(m[0]);
  }
  if (!outcomes.length) {
    // Look for "help" / "benefit" / "harm" near the question
    const helpMatch = text.match(/\b(help|benefit|harm|effect|efficacy|safety|risk)[^.!?]{0,30}/gi);
    if (helpMatch) outcomes.push(...helpMatch);
  }
  return [...new Set(outcomes)].join('; ').slice(0, 200);
}

function extractDecisionPoint(text: string): string {
  const questions: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(DECISION_QUESTION_RE.source, DECISION_QUESTION_RE.flags);
  while ((m = re.exec(text)) !== null) {
    questions.push(m[0].trim());
  }
  if (questions.length) return questions[0].slice(0, 260);

  const phraseMatch = text.match(DECISION_PHRASE_RE);
  if (phraseMatch) return phraseMatch[0].trim().slice(0, 260);

  // Fallback: last sentence if it contains a question mark
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].includes('?')) return sentences[i].trim().slice(0, 260);
  }
  return '';
}

function computeConfidence(extract: ClinicalScenarioExtract): number {
  let score = 0;
  if (extract.population) score += 0.25;
  if (extract.intervention) score += 0.25;
  if (extract.comparison) score += 0.15;
  if (extract.outcome) score += 0.15;
  if (extract.decisionPoint) score += 0.20;
  return Math.min(1, Math.round(score * 100) / 100);
}

/**
 * Extract PICO + decision point from a clinical scenario / shift presentation.
 * Runs entirely client-side; no network calls.
 */
export function extractClinicalScenario(text: string): ClinicalScenarioExtract {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const result: ClinicalScenarioExtract = {
    population: extractPopulation(cleaned),
    intervention: extractIntervention(cleaned),
    comparison: extractComparison(cleaned),
    outcome: extractOutcome(cleaned),
    decisionPoint: extractDecisionPoint(cleaned),
    confidence: 0,
  };
  result.confidence = computeConfidence(result);
  return result;
}

/**
 * Build an improved evidence search query from a scenario + its PICO extraction.
 */
export function scenarioToEvidenceQuery(text: string, extract?: ClinicalScenarioExtract | null): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  const cleaned = compact
    .replace(/\b(i saw|saw|today|post shift|patient|pt|doctor|junior|this morning|on the ward)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (extract && extract.confidence >= 0.4) {
    const parts: string[] = [];
    if (extract.population) parts.push(extract.population);
    if (extract.intervention) parts.push(extract.intervention);
    if (extract.outcome) parts.push(extract.outcome);
    if (extract.comparison) parts.push(extract.comparison);
    if (parts.length >= 2) {
      const picoQuery = parts.join(' ').replace(/\s+/g, ' ').trim();
      return (picoQuery.length >= 15 ? picoQuery : cleaned).slice(0, 260);
    }
  }

  return (cleaned.length >= 20 ? cleaned : compact).slice(0, 260);
}
