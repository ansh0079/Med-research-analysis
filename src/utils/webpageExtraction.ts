export interface WebpageExtractionPayload {
  url: string;
  title: string;
  canonicalUrl?: string | null;
  description?: string | null;
  siteName?: string | null;
  capturedAt: string;
  text: string;
  selectionText?: string | null;
  headings: string[];
  keywords: string[];
  medicalSignals: string[];
  wordCount: number;
  readingTimeMinutes: number;
  safetySignals: {
    hasPasswordField: boolean;
    hasPaymentField: boolean;
    hasForms: boolean;
    externalLinkCount: number;
  };
}

const MEDICAL_SIGNAL_PATTERNS: Array<[RegExp, string]> = [
  [/\b(randomi[sz]ed|rct|trial|cohort|case[- ]control|systematic review|meta[- ]analysis)\b/i, 'study design'],
  [/\b(patient|patients|population|participants|inclusion|exclusion|diagnos(?:is|ed))\b/i, 'population'],
  [/\b(treatment|intervention|therapy|dose|drug|procedure|surgery|device)\b/i, 'intervention'],
  [/\b(placebo|standard care|usual care|control|comparator)\b/i, 'comparison'],
  [/\b(outcome|mortality|survival|adverse events?|safety|efficacy|endpoint)\b/i, 'outcomes'],
  [/\b(confidence interval|hazard ratio|odds ratio|relative risk|p\s*[<=>]|n\s*=)\b/i, 'statistics'],
  [/\b(guideline|recommendation|consensus|nice|who|cdc|esc|aha|acc)\b/i, 'guideline signal'],
];

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'because', 'before', 'between', 'clinical', 'could',
  'during', 'evidence', 'found', 'from', 'have', 'into', 'medical', 'more', 'most', 'other',
  'over', 'page', 'paper', 'patient', 'patients', 'research', 'should', 'study', 'than',
  'that', 'their', 'there', 'these', 'this', 'through', 'trial', 'using', 'were', 'what',
  'when', 'where', 'which', 'while', 'with', 'without',
]);

function normalizeWhitespace(value: string): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniq(values: string[], max = values.length): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = normalizeWhitespace(value);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out;
}

export function extractWebpageKeywords(text: string, max = 10): string[] {
  const tokens = normalizeWhitespace(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{3,}/g) || [];
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([token]) => token);
}

export function detectMedicalSignals(text: string): string[] {
  return MEDICAL_SIGNAL_PATTERNS
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label);
}

export function summarizeWebpageText(text: string, maxSentences = 3): string {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40 && sentence.length <= 320);
  return sentences.slice(0, maxSentences).join(' ');
}

export function buildSearchQueryFromWebpage(payload: Pick<WebpageExtractionPayload, 'title' | 'keywords' | 'medicalSignals' | 'text'>): string {
  const titleTerms = normalizeWhitespace(payload.title)
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 3 && !STOP_WORDS.has(term.toLowerCase()))
    .slice(0, 8);
  const clinicalTerms = payload.keywords.slice(0, 6);
  const designTerms = payload.medicalSignals.includes('study design') ? ['systematic review', 'trial'] : [];
  const fallbackTerms = extractWebpageKeywords(payload.text, 8);
  return uniq([...titleTerms, ...clinicalTerms, ...designTerms, ...fallbackTerms], 12).join(' ');
}

export function normalizeWebpageExtractionPayload(input: Partial<WebpageExtractionPayload> & { text?: string }): WebpageExtractionPayload {
  const text = normalizeWhitespace(input.text || '');
  const wordCount = text ? text.split(/\s+/).length : 0;
  const keywords = input.keywords?.length ? uniq(input.keywords, 12) : extractWebpageKeywords(text, 12);
  const medicalSignals = input.medicalSignals?.length ? uniq(input.medicalSignals, 8) : detectMedicalSignals(text);
  return {
    url: normalizeWhitespace(input.url || ''),
    title: normalizeWhitespace(input.title || 'Captured webpage'),
    canonicalUrl: input.canonicalUrl || null,
    description: input.description || null,
    siteName: input.siteName || null,
    capturedAt: input.capturedAt || new Date().toISOString(),
    text,
    selectionText: input.selectionText || null,
    headings: uniq(input.headings || [], 12),
    keywords,
    medicalSignals,
    wordCount,
    readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    safetySignals: {
      hasPasswordField: Boolean(input.safetySignals?.hasPasswordField),
      hasPaymentField: Boolean(input.safetySignals?.hasPaymentField),
      hasForms: Boolean(input.safetySignals?.hasForms),
      externalLinkCount: Number(input.safetySignals?.externalLinkCount || 0),
    },
  };
}
