import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgentGuidance, ClinicalAnswer, CommunityInsight, EvidenceGrade, Article, ProactiveAlert, ProactiveEvidenceAlert, SynthesisResult, TopicEvidenceMemory, TopicIntelligence, SynapseGraphPayload } from '@types';
import { useAuth } from '@contexts/AuthContext';
import { CompetencyRecord } from '@components/learning/CompetencyRecord';
import { api } from '@services/api';
import {
  downloadText,
  learningBriefToHtml,
  learningBriefToText,
  printLearningBriefPdf,
} from '@services/exportArticles';

// ─── helpers ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

const GUIDELINE_JOURNALS = [
  'nice', 'aha', 'esc', 'acc', 'sign', 'who', 'nhs', 'bmj best practice',
  'uptodate', 'cochrane', 'acp', 'idsa', 'bts', 'gina', 'gold report',
];
const GUIDELINE_TITLE_WORDS = [
  'guideline', 'guidelines', 'guidance', 'recommendation', 'recommendations',
  'consensus', 'position statement', 'clinical practice', 'executive summary',
];

const EVIDENCE_STRENGTH_CLASS: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  MODERATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  LOW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  VERY_LOW: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function isGuideline(a: Article): boolean {
  const title = (a.title ?? '').toLowerCase();
  const journal = (a.journal ?? '').toLowerCase();
  const pubtypes = (a.pubtype ?? []).map((p) => p.toLowerCase());
  return (
    GUIDELINE_TITLE_WORDS.some((w) => title.includes(w)) ||
    GUIDELINE_JOURNALS.some((j) => journal.includes(j)) ||
    pubtypes.some((p) => p.includes('guideline') || p.includes('consensus'))
  );
}

function isLandmark(a: Article): boolean {
  const cites = a.pmcrefcount ?? a.citationCount ?? 0;
  const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
  return cites >= 500 && year > 0 && year <= CURRENT_YEAR - 5;
}

function whySelected(a: Article, rank: number): string {
  const ebm = a._ebmScore ?? 0;
  if (isGuideline(a)) return 'Clinical guideline or consensus statement';
  if (isLandmark(a)) return 'Landmark study — highly cited';
  if (ebm >= 7) return 'Systematic review or meta-analysis — highest evidence tier';
  if (ebm >= 6) return 'Randomised controlled trial';
  if (ebm >= 5) return 'Controlled clinical trial';
  const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
  if (year >= CURRENT_YEAR - 2) return 'Most recent high-quality evidence';
  if (a.isFree || a.pmcid) return 'Open access — full text freely available';
  return `Ranked #${rank + 1} by multi-source evidence quality score`;
}

interface BouquetSection {
  label: string;
  icon: string;
  color: string;
  articles: Article[];
}

function buildBouquet(articles: Article[]): BouquetSection[] {
  const nonRetracted = articles.filter((a) => !a._retraction?.isRetracted);
  const seen = new Set<string>();
  const take = (a: Article) => { seen.add(a.uid); return a; };

  const metaReviews = nonRetracted
    .filter((a) => (a._ebmScore ?? 0) >= 7)
    .slice(0, 2).map(take);

  const guidelines = nonRetracted
    .filter((a) => !seen.has(a.uid) && isGuideline(a))
    .slice(0, 2).map(take);

  const landmarks = nonRetracted
    .filter((a) => !seen.has(a.uid) && isLandmark(a))
    .slice(0, 2).map(take);

  const trials = nonRetracted
    .filter((a) => !seen.has(a.uid) && (a._ebmScore ?? 0) >= 5 && (a._ebmScore ?? 0) < 7)
    .slice(0, 2).map(take);

  const recent = nonRetracted
    .filter((a) => {
      if (seen.has(a.uid)) return false;
      const year = parseInt((a.pubdate ?? '').slice(0, 4) || '0');
      return year >= CURRENT_YEAR - 2;
    })
    .slice(0, 2).map(take);

  const openAccess = nonRetracted
    .filter((a) => !seen.has(a.uid) && (a.isFree || !!a.pmcid))
    .slice(0, 1).map(take);

  // Build sections in priority order; skip empty ones
  const sections: BouquetSection[] = [
    { label: 'Systematic Reviews & Meta-analyses', icon: 'fa-layer-group', color: 'text-emerald-600 dark:text-emerald-400', articles: metaReviews },
    { label: 'Clinical Guidelines', icon: 'fa-book-medical', color: 'text-blue-600 dark:text-blue-400', articles: guidelines },
    { label: 'Landmark Studies', icon: 'fa-star', color: 'text-amber-600 dark:text-amber-400', articles: landmarks },
    { label: 'Randomised Trials', icon: 'fa-flask', color: 'text-indigo-600 dark:text-indigo-400', articles: trials },
    { label: 'Recent High-Quality Evidence', icon: 'fa-calendar-check', color: 'text-purple-600 dark:text-purple-400', articles: recent },
    { label: 'Open Access', icon: 'fa-unlock', color: 'text-teal-600 dark:text-teal-400', articles: openAccess },
  ].filter((s) => s.articles.length > 0);

  // If very few papers came through (narrow query), pad with top non-retracted
  const shown = sections.reduce((n, s) => n + s.articles.length, 0);
  if (shown < 3 && nonRetracted.length > 0) {
    const backfill = nonRetracted.filter((a) => !seen.has(a.uid)).slice(0, 4 - shown).map(take);
    if (backfill.length) {
      sections.push({ label: 'Top Evidence', icon: 'fa-shield-alt', color: 'text-slate-500 dark:text-slate-400', articles: backfill });
    }
  }

  return sections;
}

// ─── Evidence grade display ────────────────────────────────────────────────────

const EVIDENCE_GRADE_META: Record<EvidenceGrade, { label: string; icon: string; classes: string }> = {
  GUIDELINE_BACKED:          { label: 'Guideline-backed',             icon: 'fa-book-medical',   classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  RCT_SUPPORTED:             { label: 'RCT / meta-analysis supported',icon: 'fa-flask',           classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  PRACTICE_CHANGING_RECENT:  { label: 'Practice-changing — recent',   icon: 'fa-bolt',            classes: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' },
  CONFLICTING:               { label: 'Conflicting evidence',          icon: 'fa-scale-unbalanced',classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  OBSERVATIONAL_ONLY:        { label: 'Observational only',            icon: 'fa-binoculars',      classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' },
  LOW_CERTAINTY:             { label: 'Low-certainty / expert opinion',icon: 'fa-circle-question', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  EXPERT_OPINION:            { label: 'Expert opinion',                icon: 'fa-comments',        classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

function EvidenceGradeBadge({ grade }: { grade?: EvidenceGrade }) {
  if (!grade) return null;
  const meta = EVIDENCE_GRADE_META[grade];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.classes}`}>
      <i className={`fas ${meta.icon} text-[9px]`} />
      {meta.label}
    </span>
  );
}

// ─── Clinical Answer Panel ─────────────────────────────────────────────────────

function ClinicalAnswerPanel({
  ca,
  proactiveAlert,
  onQuizUpdate,
}: {
  ca: ClinicalAnswer;
  proactiveAlert?: ProactiveAlert | null;
  onQuizUpdate?: () => void;
}) {
  const rows: Array<{ icon: string; label: string; value: string | null | undefined; highlight?: boolean }> = [
    { icon: 'fa-circle-check',    label: 'Bottom line',               value: ca.bottomLine,              highlight: true },
    { icon: 'fa-arrows-rotate',   label: 'What changes management',   value: ca.whatChangesManagement },
    { icon: 'fa-users',           label: 'Who it applies to',         value: ca.whoItAppliesTo },
    { icon: 'fa-circle-question', label: 'What is uncertain',         value: ca.whatIsUncertain },
    { icon: 'fa-ban',             label: 'Key contraindications',     value: ca.keyContraindications },
    { icon: 'fa-book-medical',    label: 'Guideline position',        value: ca.guidelinePosition },
    { icon: 'fa-bolt',            label: 'Recent practice change',    value: ca.recentPracticeChanging },
  ].filter((r) => r.value);

  const effectiveAlert = proactiveAlert ?? (ca.whatIsNew ? { summary: ca.whatIsNew, changedPrinciples: [], newPapers: [], daysSinceUpdate: 0 } : null);
  const isLandmark = effectiveAlert?.isLandmarkGreeting ?? false;

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/40 dark:to-slate-950/10 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
          <i className="fas fa-stethoscope text-[10px]" />
          Clinical Evidence Answer
        </span>
        <EvidenceGradeBadge grade={ca.evidenceGrade} />
      </div>
      {effectiveAlert && (
        <div className={`mb-3 rounded-lg border px-3 py-2.5 ${
          isLandmark
            ? 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/20'
            : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
        }`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
            isLandmark ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
          }`}>
            <i className={`fas ${isLandmark ? 'fa-bookmark' : 'fa-bell'} mr-1`} />
            {isLandmark ? 'Landmark trial — strong memory topic' : 'Evidence updated since your last visit'}
          </p>
          <p className={`text-xs leading-relaxed ${
            isLandmark ? 'text-teal-800 dark:text-teal-200' : 'text-amber-800 dark:text-amber-200'
          }`}>{effectiveAlert.summary}</p>
          {!isLandmark && effectiveAlert.changedPrinciples.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {effectiveAlert.changedPrinciples.map((p, i) => (
                <li key={i} className="text-[11px] text-amber-700 dark:text-amber-300 flex gap-1.5">
                  <i className="fas fa-arrow-right text-[9px] mt-0.5 shrink-0" />{p}
                </li>
              ))}
            </ul>
          )}
          {effectiveAlert.newPapers.length > 0 && (
            <p className={`mt-1.5 text-[10px] font-semibold ${
              isLandmark ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isLandmark ? 'Landmark: ' : 'New papers: '}{effectiveAlert.newPapers.slice(0, 2).join('; ')}
            </p>
          )}
          {!isLandmark && onQuizUpdate && (
            <button
              type="button"
              onClick={onQuizUpdate}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-[11px] font-black text-white hover:bg-amber-700 transition-colors"
            >
              <i className="fas fa-brain text-[10px]" />
              Re-quiz this update
            </button>
          )}
        </div>
      )}
      <div className="space-y-2">
        {rows.map(({ icon, label, value, highlight }) => (
          <div key={label} className={`flex gap-3 rounded-lg px-3 py-2 ${highlight ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-white/60 dark:bg-slate-900/30'}`}>
            <i className={`fas ${icon} mt-0.5 shrink-0 text-[11px] ${highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
              <p className={`text-xs leading-relaxed ${highlight ? 'font-semibold text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type BriefDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

const SAVED_TOPICS_KEY = 'med_saved_topics';
const RECENT_TOPICS_KEY = 'med_recent_topics';
const SAVED_BRIEFS_KEY = 'med_saved_learning_briefs';

interface SavedTopic {
  query: string;
  savedAt: string;
  resultCount: number;
}

interface SavedBrief {
  id: string;
  topic: string;
  savedAt: string;
  summary?: string;
  paperCount: number;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || '') as T;
  } catch {
    return fallback;
  }
}

function writeStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the workflow still works in-memory.
  }
}

function normalizeTopicMatchKey(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function TopicSynapseGraphSection({ query, onOpenTopic }: { query: string; onOpenTopic: (t: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [graph, setGraph] = React.useState<SynapseGraphPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    setGraph(null);
    setErr(null);
    setOpen(false);
  }, [query]);

  const load = async () => {
    if (graph || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const g = await api.getSynapseGraph(query);
      setGraph(g);
    } catch {
      setErr('Could not load graph.');
    } finally {
      setLoading(false);
    }
  };

  const onToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  const center = graph?.nodes.find((n) => n.kind === 'center');
  const neighbors = graph?.nodes.filter((n) => n.kind !== 'center') ?? [];
  const twoPi = Math.PI * 2;
  const positions = neighbors.map((n, i) => {
    const angle = twoPi * (i / Math.max(neighbors.length, 1)) - Math.PI / 2;
    const r = 72;
    return { node: n, x: 100 + r * Math.cos(angle), y: 100 + r * Math.sin(angle) };
  });

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/40 dark:bg-slate-950/20">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400 flex items-center gap-2">
          <i className="fas fa-circle-nodes text-[10px]" />
          Topic knowledge graph
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-[10px] text-slate-400`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-[11px] text-slate-500">Loading shared-trial bridges…</p>}
          {err && <p className="text-[11px] text-red-500">{err}</p>}
          {graph && !graph.topicKnowledgeFound && (
            <p className="text-[11px] text-slate-500">No stored topic memory yet — run a search with mentor extraction first.</p>
          )}
          {graph && graph.topicKnowledgeFound && neighbors.length === 0 && (
            <p className="text-[11px] text-slate-500">No cross-topic bridges detected from stored seminal papers yet.</p>
          )}
          {graph && graph.topicKnowledgeFound && neighbors.length > 0 && center && (
            <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-violet-100 dark:border-violet-900/30 p-3 overflow-x-auto">
              <p className="text-[10px] text-slate-500 mb-2">
                Nodes are clinical topics linked because the same landmark papers appear in multiple topic memory maps.
              </p>
              <svg viewBox="0 0 200 200" className="w-full max-w-md mx-auto h-48">
                {positions.map(({ node, x, y }) => (
                  <line key={`${node.id}-line`} x1={100} y1={100} x2={x} y2={y} stroke="currentColor" className="text-violet-200 dark:text-violet-800" strokeWidth={1} />
                ))}
                <circle cx={100} cy={100} r={10} className="fill-violet-600" />
                <text x={100} y={104} textAnchor="middle" className="fill-white text-[8px] font-bold">
                  {(center.label || '•').slice(0, 1)}
                </text>
                {positions.map(({ node, x, y }) => (
                  <g key={node.id}>
                    <circle cx={x} cy={y} r={9} className="fill-indigo-500/90 cursor-pointer" onClick={() => onOpenTopic(node.label)} />
                    <text x={x} y={y + 3} textAnchor="middle" className="fill-white text-[7px] font-semibold pointer-events-none">
                      {(node.label || '').slice(0, 2)}
                    </text>
                  </g>
                ))}
              </svg>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {neighbors.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => onOpenTopic(n.label)}
                    className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-2 py-0.5 text-[10px] font-semibold text-violet-800 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-900/60"
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  query: string;
  top5: Article[];             // pre-sorted top-5 for synthesis
  allResults: Article[];       // full result set for bouquet categorisation
  synthesis: SynthesisResult | null;
  synthesisLoading: boolean;
  onSynthesize: () => void;
  onSummarizePaper: (article: Article) => void;
  onQuiz: (difficulty: BriefDifficulty) => void;
  onCase: (difficulty: BriefDifficulty) => void;
  onOpenTopic: (query: string) => void;
  onGuidelineCompare?: () => void;
  agentGuidance?: AgentGuidance | null;
  topicIntelligence?: TopicIntelligence | null;
  liveClinicalAnswer?: import('@types').ClinicalAnswer | null;
  aiEnrichmentLoading?: boolean;
  communityInsight?: CommunityInsight | null;
  proactiveAlert?: ProactiveAlert | null;
  knowledgeDriftAlerts?: ProactiveEvidenceAlert[];
  onDismissKnowledgeDrift?: (id: number) => void;
  evidenceMemory?: TopicEvidenceMemory | null;
}

const TopicBriefPanelComponent: React.FC<Props> = ({
  query, top5, allResults, topicIntelligence, synthesis, synthesisLoading, onSynthesize, onSummarizePaper, onQuiz, onCase, onOpenTopic, onGuidelineCompare, agentGuidance, liveClinicalAnswer, aiEnrichmentLoading, communityInsight, proactiveAlert, knowledgeDriftAlerts, onDismissKnowledgeDrift, evidenceMemory,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState(true);
  const [difficulty, setDifficulty] = React.useState<BriefDifficulty>('mixed');
  const [showCompetency, setShowCompetency] = React.useState(false);
  const [savedTopics, setSavedTopics] = React.useState<SavedTopic[]>(() => readStored<SavedTopic[]>(SAVED_TOPICS_KEY, []));
  const [recentTopics, setRecentTopics] = React.useState<SavedTopic[]>(() => readStored<SavedTopic[]>(RECENT_TOPICS_KEY, []));
  const [briefSaved, setBriefSaved] = React.useState(false);

  const sections = buildBouquet(allResults);
  const guidelineCount = topicIntelligence?.guidelineSnapshot.count ?? 0;
  const hasReviewedGuidelines = Boolean(topicIntelligence?.guidelineSnapshot.hasReviewedGuidelines);
  const consensusSynopsis = topicIntelligence?.consensusSynopsis;
  const consensusStrengthClass = consensusSynopsis
    ? EVIDENCE_STRENGTH_CLASS[consensusSynopsis.evidenceStrength] ?? EVIDENCE_STRENGTH_CLASS.LOW
    : EVIDENCE_STRENGTH_CLASS.LOW;
  const isFlagshipTopic = Boolean(
    topicIntelligence &&
    agentGuidance &&
    top5.length >= 3 &&
    guidelineCount > 0 &&
    ((agentGuidance.seminalPapers?.length ?? 0) >= 3 || (agentGuidance.teachingPoints?.length ?? 0) >= 3)
  );
  const retractedCount = allResults.filter((a) => a._retraction?.isRetracted).length;
  const preprintCount = allResults.filter((a) => a._isPreprint).length;
  const synthesisSummary = synthesis?.synthesis?.clinicalBottomLine || synthesis?.synthesis?.consensus || '';
  const brief = {
    topic: query,
    summary: synthesisSummary,
    topPapers: top5,
    generatedAt: new Date().toLocaleString(),
  };
  const isTopicSaved = savedTopics.some((topic) => topic.query.toLowerCase() === query.toLowerCase());

  const [lastQuery, setLastQuery] = React.useState(query);
  const [lastResultCount, setLastResultCount] = React.useState(allResults.length);
  if (lastQuery !== query || lastResultCount !== allResults.length) {
    setLastQuery(query);
    setLastResultCount(allResults.length);
    const next = [
      { query, resultCount: allResults.length, savedAt: new Date().toISOString() },
      ...recentTopics.filter((item) => item.query.toLowerCase() !== query.toLowerCase()),
    ].slice(0, 8);
    setRecentTopics(next);
    writeStored(RECENT_TOPICS_KEY, next);
    setBriefSaved(false);
  }

  const saveTopic = () => {
    const next = isTopicSaved
      ? savedTopics.filter((item) => item.query.toLowerCase() !== query.toLowerCase())
      : [{ query, resultCount: allResults.length, savedAt: new Date().toISOString() }, ...savedTopics].slice(0, 30);
    setSavedTopics(next);
    writeStored(SAVED_TOPICS_KEY, next);
  };

  const saveBrief = () => {
    const stored = readStored<SavedBrief[]>(SAVED_BRIEFS_KEY, []);
    const next = [{
      id: `${Date.now()}`,
      topic: query,
      savedAt: new Date().toISOString(),
      summary: synthesisSummary,
      paperCount: top5.length,
    }, ...stored.filter((item) => item.topic.toLowerCase() !== query.toLowerCase())].slice(0, 30);
    writeStored(SAVED_BRIEFS_KEY, next);
    setBriefSaved(true);
  };

  const copyBrief = async () => {
    await navigator.clipboard?.writeText(learningBriefToText(brief));
  };

  const exportWord = () => {
    downloadText(`${query.replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}_learning_brief.doc`, learningBriefToHtml(brief), 'application/msword');
  };
  const shortQuery = query.length > 80 ? query.slice(0, 77) + '…' : query;
  const driftForTopic =
    knowledgeDriftAlerts?.find(
      (a) => !a.readAt && normalizeTopicMatchKey(a.normalizedTopic) === normalizeTopicMatchKey(query)
    ) ?? null;

  return (
    <div className="mb-6 neo-card rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-900/40 shadow-lg shadow-indigo-100/30 dark:shadow-indigo-900/20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <i className="fas fa-seedling text-white text-sm" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {isFlagshipTopic ? 'Flagship Topic · Evidence Mentor Ready' : 'Evidence Bouquet'}
            </p>
            <p className="text-sm font-black text-white truncate">{shortQuery}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFlagshipTopic && (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              <i className="fas fa-award text-[9px]" />
              Flagship
            </span>
          )}
          <span className="text-[11px] text-white/60 font-mono hidden sm:block">
            {top5.length} top papers · {guidelineCount} guidelines · {allResults.length} total
          </span>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-white text-[10px]`} />
          </button>
        </div>
      </div>

      {/* ── Trust warnings bar ─────────────────────────────────────────── */}
      {(retractedCount > 0 || preprintCount > 0) && (
        <div className="flex flex-wrap gap-3 px-5 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 text-xs font-semibold">
          {retractedCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <i className="fas fa-triangle-exclamation" />
              {retractedCount} retracted paper{retractedCount > 1 ? 's' : ''} excluded from curated list
            </span>
          )}
          {preprintCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <i className="fas fa-hourglass-half" />
              {preprintCount} preprint{preprintCount > 1 ? 's' : ''} in results — not peer-reviewed
            </span>
          )}
        </div>
      )}

      {driftForTopic && (
        <div className="px-5 py-3 bg-violet-50/90 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/40">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400 mb-1 flex items-center gap-1.5">
                <i className="fas fa-bell text-[9px]" />
                What&apos;s New (your topic)
              </p>
              <p className="text-xs text-violet-900 dark:text-violet-100 leading-relaxed">{driftForTopic.summary}</p>
            </div>
            {onDismissKnowledgeDrift && (
              <button
                type="button"
                onClick={() => onDismissKnowledgeDrift(driftForTopic.id)}
                className="shrink-0 rounded-lg bg-violet-600 text-white text-[11px] font-bold px-3 py-1.5 hover:bg-violet-700"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Stored knowledge context strip ─────────────────────────────── */}
      {evidenceMemory && evidenceMemory.messages.length > 0 && (
        <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Evidence memory
            </span>
            {evidenceMemory.messages.map((message) => (
              <span
                key={message.key}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  message.tone === 'positive'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : message.tone === 'warning'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {message.text}
              </span>
            ))}
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {evidenceMemory.trustedClaimCount ?? 0}/{evidenceMemory.totalClaims} trusted claims
            </span>
          </div>
        </div>
      )}

      {agentGuidance && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            <i className="fas fa-user-graduate text-[10px]" />
            Mentor knowledge loaded
          </span>
          {agentGuidance.seminalPapers?.length > 0 && (
            <span className="text-emerald-600 dark:text-emerald-500">
              {agentGuidance.seminalPapers.length} seminal paper{agentGuidance.seminalPapers.length === 1 ? '' : 's'} stored
            </span>
          )}
          {agentGuidance.teachingPoints?.length > 0 && (
            <span className="text-emerald-600 dark:text-emerald-500">
              {agentGuidance.teachingPoints.length} teaching point{agentGuidance.teachingPoints.length === 1 ? '' : 's'}
            </span>
          )}
          <span className={`ml-auto rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
            agentGuidance.status === 'human_reviewed'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : agentGuidance.status === 'human_edited'
              ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          }`}>
            {agentGuidance.status === 'human_reviewed' ? 'Clinician reviewed' : agentGuidance.status === 'human_edited' ? 'Clinician edited' : 'AI generated'}
          </span>
        </div>
      )}

      {/* ── Categorised paper sections ─────────────────────────────────── */}
      {topicIntelligence && guidelineCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 bg-blue-50/70 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/40 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 shrink-0">
            <i className="fas fa-book-medical text-[10px]" />
            Guideline snapshot loaded
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            {guidelineCount} stored recommendation{guidelineCount === 1 ? '' : 's'}
          </span>
          <span className={`ml-auto rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
            hasReviewedGuidelines
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          }`}>
            {hasReviewedGuidelines ? 'Reviewed guidance present' : 'Needs curator review'}
          </span>
        </div>
      )}

      {liveClinicalAnswer && (
        <ClinicalAnswerPanel ca={liveClinicalAnswer} proactiveAlert={proactiveAlert} onQuizUpdate={() => onQuiz('mixed')} />
      )}
      {!liveClinicalAnswer && agentGuidance?.clinicalAnswer && (
        <ClinicalAnswerPanel ca={agentGuidance.clinicalAnswer} proactiveAlert={proactiveAlert} onQuizUpdate={() => onQuiz('mixed')} />
      )}
      {!liveClinicalAnswer && !agentGuidance?.clinicalAnswer && aiEnrichmentLoading && (
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <i className="fas fa-circle-notch fa-spin text-indigo-400" />
            <span>Generating clinical analysis…</span>
          </div>
        </div>
      )}

      {agentGuidance?.contradictions && agentGuidance.contradictions.length > 0 && (
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <i className="fas fa-scale-unbalanced text-[10px]" />
            Evidence Contradictions
          </p>
          <div className="space-y-2">
            {agentGuidance.contradictions.map((c, i) => (
              <div key={i} className="rounded-lg bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs space-y-1">
                <p className="text-amber-900 dark:text-amber-200"><span className="font-semibold">Claim:</span> {c.claim}</p>
                <p className="text-amber-800 dark:text-amber-300"><span className="font-semibold">Counter:</span> {c.counter}</p>
                {c.clinicalImplication && (
                  <p className="text-amber-700 dark:text-amber-400 italic">{c.clinicalImplication}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {consensusSynopsis && (
        <div className="border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
                  <i className="fas fa-scale-balanced text-[10px]" />
                  Consensus Synopsis
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${consensusStrengthClass}`}>
                  {consensusSynopsis.evidenceStrength}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {consensusSynopsis.freePaperCount} free paper{consensusSynopsis.freePaperCount === 1 ? '' : 's'}
                </span>
                {consensusSynopsis.includedArticles.some((article) => article.fullTextIndexed) && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Full text used
                  </span>
                )}
                {consensusSynopsis.citationValidation && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    consensusSynopsis.citationValidation.ok
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {consensusSynopsis.citationValidation.ok ? 'Citations checked' : 'Citation warning'}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {consensusSynopsis.statement}
              </p>
              {consensusSynopsis.clinicalBottomLine && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                  {consensusSynopsis.clinicalBottomLine}
                </p>
              )}
            </div>
            {consensusSynopsis.status !== 'generated' && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {consensusSynopsis.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {(consensusSynopsis.areasOfAgreement.length > 0 || consensusSynopsis.areasOfUncertainty.length > 0 || consensusSynopsis.quizFocusPoints.length > 0) && (
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {consensusSynopsis.areasOfAgreement.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Agreement</p>
                  <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {consensusSynopsis.areasOfAgreement.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              {consensusSynopsis.areasOfUncertainty.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Uncertainty</p>
                  <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {consensusSynopsis.areasOfUncertainty.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              {consensusSynopsis.quizFocusPoints.length > 0 && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
                  <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Quiz Focus</p>
                  <ul className="space-y-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {consensusSynopsis.quizFocusPoints.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {consensusSynopsis.whatNotToOverclaim.length > 0 && (
            <p className="mt-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              <span className="font-black">Do not overclaim:</span> {consensusSynopsis.whatNotToOverclaim.slice(0, 2).join(' ')}
            </p>
          )}
        </div>
      )}

      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sections.map((section) => (
            <div key={section.label}>
              {/* Section header */}
              <div className="flex items-center gap-2 px-5 py-2 bg-slate-50/60 dark:bg-slate-900/40">
                <i className={`fas ${section.icon} text-[11px] ${section.color}`} />
                <p className={`text-[11px] font-black uppercase tracking-widest ${section.color}`}>
                  {section.label}
                </p>
              </div>

              {/* Papers in section */}
              {section.articles.map((article, i) => {
                const citations = article.pmcrefcount ?? article.citationCount;
                const isFree = article.isFree || !!article.pmcid;
                const year = (article.pubdate ?? article.year?.toString() ?? '').slice(0, 4);
                const landmark = isLandmark(article);
                const guideline = isGuideline(article);
                // Use API ranking data if available
                const rankingInfo = topicIntelligence?.evidenceBouquet?.ranking?.find((r) => r.uid === article.uid);
                const archetype = rankingInfo?.archetype ?? '';
                const reason = rankingInfo?.reasons?.join(' · ') ?? whySelected(article, i);
                const grade = article._quality?.grade;
                return (
                  <div key={article.uid} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-3">

                      {/* Rank dot */}
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-black ${section.color}`}>
                        <span>{i + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
                          {landmark && <i className="fas fa-star text-amber-400 mr-1.5 text-[10px]" title="Landmark study" />}
                          {guideline && <i className="fas fa-book-medical text-blue-400 mr-1.5 text-[10px]" title="Clinical guideline" />}
                          {article.title}
                        </p>

                        {/* Signal row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {/* Archetype badge */}
                          {archetype && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                              {archetype.replace(/_/g, ' ')}
                            </span>
                          )}
                          {/* Study design */}
                          {article._ebmLabel?.short && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                              {article._ebmLabel.short}
                            </span>
                          )}

                          {/* Quality grade */}
                          {grade && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              grade === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : grade === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              Grade {grade}
                            </span>
                          )}

                          {/* Citation count */}
                          {citations !== undefined && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              <i className="fas fa-quote-right text-[9px]" />
                              {citations.toLocaleString()} cit.
                            </span>
                          )}

                          {/* Year */}
                          {year && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{year}</span>
                          )}

                          {/* Open access */}
                          {isFree && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                              <i className="fas fa-unlock text-[9px]" /> Open access
                            </span>
                          )}

                          {/* Preprint */}
                          {article._isPreprint && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <i className="fas fa-hourglass-half text-[9px]" /> Preprint
                            </span>
                          )}
                        </div>

                        {/* Journal */}
                        {article.journal && (
                          <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">{article.journal}</p>
                        )}

                        {/* Why selected */}
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1">
                          <i className="fas fa-circle-info text-[9px] text-indigo-400" />
                          {reason}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Archetype coverage ─────────────────────────────────────────── */}
      {topicIntelligence?.evidenceBouquet?.archetypesCovered && topicIntelligence.evidenceBouquet.archetypesCovered.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-2 bg-slate-50/40 dark:bg-slate-900/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Evidence archetypes covered</p>
          <div className="flex flex-wrap gap-1.5">
            {topicIntelligence.evidenceBouquet.archetypesCovered.map((a) => (
              <span key={a} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <i className="fas fa-check-circle mr-1 text-[8px]" />
                {a.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Action row ─────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-1 shrink-0">AI tools:</p>

        <button type="button" onClick={() => top5[0] && onSummarizePaper(top5[0])}
          disabled={!top5[0]}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold transition-colors"
          title="Summarize the highest-ranked paper">
          <i className="fas fa-file-medical text-[10px]" />Summarize Paper
        </button>

        <button type="button" onClick={onSynthesize}
          disabled={synthesisLoading || synthesis !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
          title={`AI synthesis of the top ${top5.length} highest-evidence papers`}>
          {synthesisLoading ? (
            <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />Synthesising…</>
          ) : synthesis ? (
            <><i className="fas fa-check text-[10px]" />Synthesis ready</>
          ) : (
            <><i className="fas fa-atom text-[10px]" />Synthesise top {top5.length}</>
          )}
        </button>

        <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as BriefDifficulty)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          title="Difficulty for generated MCQs and cases">
          <option value="mixed">Mixed</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button type="button" onClick={() => onQuiz(difficulty)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors"
          title="Generate MCQ questions from the top papers">
          <i className="fas fa-brain text-[10px]" />Generate MCQs
        </button>

        <button type="button" onClick={() => onCase(difficulty)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
          title="Build a clinical case scenario from the evidence">
          <i className="fas fa-stethoscope text-[10px]" />Generate Case
        </button>

        {onGuidelineCompare && (
          <button type="button" onClick={onGuidelineCompare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            title="Compare top evidence with clinical guidelines">
            <i className="fas fa-scale-balanced text-[10px]" />Guideline vs trial
          </button>
        )}

        <button type="button" onClick={saveTopic}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isTopicSaved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
          <i className={`fas ${isTopicSaved ? 'fa-check' : 'fa-bookmark'} text-[10px]`} />{isTopicSaved ? 'Topic Saved' : 'Save Topic'}
        </button>
        <button type="button" onClick={saveBrief}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
          <i className={`fas ${briefSaved ? 'fa-check' : 'fa-folder-plus'} text-[10px]`} />{briefSaved ? 'Brief Saved' : 'Save Brief'}
        </button>
        <button type="button" onClick={() => void copyBrief()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
          <i className="fas fa-copy text-[10px]" />Copy Summary
        </button>
        <button type="button" onClick={exportWord}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
          <i className="fas fa-file-word text-[10px]" />Word
        </button>
        <button type="button" onClick={() => printLearningBriefPdf(brief)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold transition-colors">
          <i className="fas fa-file-pdf text-[10px]" />PDF
        </button>

        <p className="ml-auto text-[10px] text-slate-400 shrink-0 hidden sm:block">
          Curated by EBM evidence tier · retracted excluded
        </p>
      </div>

      {communityInsight && communityInsight.articleCount > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-sky-50/60 dark:bg-sky-950/10">
          <p className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400 mb-1.5 flex items-center gap-1.5">
            <i className="fas fa-users text-[10px]" />Community insight
          </p>
          <p className="text-xs text-sky-800 dark:text-sky-300">
            <span className="font-bold">{communityInsight.articleCount} paper{communityInsight.articleCount === 1 ? '' : 's'}</span>
            {' '}in these results {communityInsight.articleCount === 1 ? 'is' : 'are'} frequently cited by other clinicians exploring this topic.
          </p>
          {communityInsight.pivotTopics.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 self-center">Also studied:</span>
              {communityInsight.pivotTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onOpenTopic(t)}
                  className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(() => {
        // Aggregate all unique synapse topics from the result set, excluding the current query
        const normalQ = query.trim().toLowerCase();
        const synapseCounts = new Map<string, number>();
        for (const a of allResults) {
          for (const t of (a._synapseTopics || [])) {
            if (t.toLowerCase() !== normalQ) {
              synapseCounts.set(t, (synapseCounts.get(t) || 0) + 1);
            }
          }
        }
        const topSynapse = [...synapseCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([t]) => t);
        if (topSynapse.length === 0) return null;
        return (
          <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-indigo-50/40 dark:bg-indigo-950/10">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
              <i className="fas fa-share-nodes text-[10px]" />
              Related clinical concepts
            </p>
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mb-2">
              Papers in these results are also cited in these topics — explore the clinical connections:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topSynapse.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onOpenTopic(t)}
                  className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  ↔ {t}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      <TopicSynapseGraphSection query={query} onOpenTopic={onOpenTopic} />

      {isAuthenticated && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowCompetency((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              <i className="fas fa-graduation-cap text-[10px] text-indigo-500" />
              My competency record
            </span>
            <i className={`fas fa-chevron-${showCompetency ? 'up' : 'down'} text-[10px] text-slate-400`} />
          </button>
          {showCompetency && (
            <div className="px-5 pb-5">
              <CompetencyRecord topic={query} />
            </div>
          )}
        </div>
      )}

      {(savedTopics.length > 0 || recentTopics.length > 1) && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3 bg-white/70 dark:bg-slate-950/20 flex flex-wrap gap-2 items-center">
          {savedTopics.slice(0, 4).map((topic) => (
            <button key={`saved-${topic.query}`} type="button" onClick={() => onOpenTopic(topic.query)}
              className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300">
              <i className="fas fa-bookmark text-[9px] mr-1" />{topic.query}
            </button>
          ))}
          {recentTopics.filter((topic) => topic.query.toLowerCase() !== query.toLowerCase()).slice(0, 4).map((topic) => (
            <button key={`recent-${topic.query}`} type="button" onClick={() => onOpenTopic(topic.query)}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300">
              <i className="fas fa-clock-rotate-left text-[9px] mr-1" />{topic.query}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
TopicBriefPanelComponent.displayName = 'TopicBriefPanel';
export const TopicBriefPanel = React.memo(TopicBriefPanelComponent);
