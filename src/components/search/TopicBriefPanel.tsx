import React from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  AgentGuidance,
  Article,
  CommunityInsight,
  ProactiveAlert,
  ProactiveEvidenceAlert,
  SynthesisResult,
  TopicEvidenceMemory,
  TopicIntelligence,
} from '@types';
import { useAuth } from '@contexts/AuthContext';
import {
  buildBouquet,
  readStored,
  writeStored,
  normalizeTopicMatchKey,
  SAVED_TOPICS_KEY,
  RECENT_TOPICS_KEY,
  SAVED_BRIEFS_KEY,
  type SavedTopic,
  type SavedBrief,
  type BriefDifficulty as BriefDifficultyLocal,
} from './topicBrief/topicBriefUtils';
import { TopicBriefHeader } from './topicBrief/TopicBriefHeader';
import { TopicBriefStatusBands } from './topicBrief/TopicBriefStatusBands';
import { TopicBriefClinicalAnswerBlock } from './topicBrief/TopicBriefClinicalAnswerBlock';
import { TopicBriefConsensusSynopsis } from './topicBrief/TopicBriefConsensusSynopsis';
import { TopicBriefBouquetSections } from './topicBrief/TopicBriefBouquetSections';
import { TopicBriefActionRow } from './topicBrief/TopicBriefActionRow';
import { TopicBriefFooter } from './topicBrief/TopicBriefFooter';

export type BriefDifficulty = BriefDifficultyLocal;

interface Props {
  query: string;
  top5: Article[];
  allResults: Article[];
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
  aiEnrichmentFailed?: boolean;
  communityInsight?: CommunityInsight | null;
  proactiveAlert?: ProactiveAlert | null;
  knowledgeDriftAlerts?: ProactiveEvidenceAlert[];
  onDismissKnowledgeDrift?: (id: number) => void;
  evidenceMemory?: TopicEvidenceMemory | null;
}

const TopicBriefPanelComponent: React.FC<Props> = ({
  query,
  top5,
  allResults,
  topicIntelligence,
  synthesis,
  synthesisLoading,
  onSynthesize,
  onSummarizePaper,
  onQuiz,
  onCase,
  onOpenTopic,
  onGuidelineCompare,
  agentGuidance,
  liveClinicalAnswer,
  aiEnrichmentLoading,
  aiEnrichmentFailed,
  communityInsight,
  proactiveAlert,
  knowledgeDriftAlerts,
  onDismissKnowledgeDrift,
  evidenceMemory,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState(true);
  const [difficulty, setDifficulty] = React.useState<BriefDifficulty>('mixed');
  const [savedTopics, setSavedTopics] = React.useState<SavedTopic[]>(() => readStored<SavedTopic[]>(SAVED_TOPICS_KEY, []));
  const [recentTopics, setRecentTopics] = React.useState<SavedTopic[]>(() => readStored<SavedTopic[]>(RECENT_TOPICS_KEY, []));
  const [briefSaved, setBriefSaved] = React.useState(false);

  const sections = buildBouquet(allResults);
  const guidelineCount = topicIntelligence?.guidelineSnapshot.count ?? 0;
  const hasReviewedGuidelines = Boolean(topicIntelligence?.guidelineSnapshot.hasReviewedGuidelines);
  const consensusSynopsis = topicIntelligence?.consensusSynopsis;
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

  const driftForTopic =
    knowledgeDriftAlerts?.find(
      (a) => !a.readAt && normalizeTopicMatchKey(a.normalizedTopic) === normalizeTopicMatchKey(query)
    ) ?? null;

  return (
    <div className="mb-6 neo-card rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-900/40 shadow-lg shadow-indigo-100/30 dark:shadow-indigo-900/20">
      <TopicBriefHeader
        query={query}
        topCount={top5.length}
        guidelineCount={guidelineCount}
        totalCount={allResults.length}
        isFlagshipTopic={isFlagshipTopic}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />

      <TopicBriefStatusBands
        retractedCount={retractedCount}
        preprintCount={preprintCount}
        driftForTopic={driftForTopic}
        onDismissKnowledgeDrift={onDismissKnowledgeDrift}
        evidenceMemory={evidenceMemory}
        agentGuidance={agentGuidance}
        guidelineCount={guidelineCount}
        hasReviewedGuidelines={hasReviewedGuidelines}
      />

      <TopicBriefClinicalAnswerBlock
        liveClinicalAnswer={liveClinicalAnswer}
        agentGuidance={agentGuidance}
        aiEnrichmentLoading={aiEnrichmentLoading}
        aiEnrichmentFailed={aiEnrichmentFailed}
        proactiveAlert={proactiveAlert}
        onQuiz={() => onQuiz('mixed')}
      />

      {consensusSynopsis && <TopicBriefConsensusSynopsis consensusSynopsis={consensusSynopsis} />}

      <TopicBriefBouquetSections
        sections={sections}
        expanded={expanded}
        topicIntelligence={topicIntelligence}
      />

      <TopicBriefActionRow
        query={query}
        top5={top5}
        synthesis={synthesis}
        synthesisLoading={synthesisLoading}
        difficulty={difficulty}
        isTopicSaved={isTopicSaved}
        briefSaved={briefSaved}
        onSynthesize={onSynthesize}
        onSummarizePaper={onSummarizePaper}
        onQuiz={onQuiz}
        onCase={onCase}
        onGuidelineCompare={onGuidelineCompare}
        setDifficulty={setDifficulty}
        saveTopic={saveTopic}
        saveBrief={saveBrief}
        exportTrust={consensusSynopsis ? {
          abstractOnly: Number(consensusSynopsis.freePaperCount || 0) === 0
            && Number(consensusSynopsis.abstractPaperCount || 0) > 0,
          sourceMode: Number(consensusSynopsis.freePaperCount || 0) === 0
            && Number(consensusSynopsis.abstractPaperCount || 0) > 0
            ? 'abstract_only'
            : 'full_text_used',
          reviewState: consensusSynopsis.reviewState || undefined,
          citationOk: consensusSynopsis.citationValidation?.ok
            ?? consensusSynopsis.citationCheckPassed
            ?? undefined,
          trustRating: consensusSynopsis.evidenceStrength || undefined,
        } : undefined}
      />

      <TopicBriefFooter
        query={query}
        allResults={allResults}
        topicIntelligence={topicIntelligence}
        communityInsight={communityInsight}
        onOpenTopic={onOpenTopic}
        savedTopics={savedTopics}
        recentTopics={recentTopics}
      />
    </div>
  );
};
TopicBriefPanelComponent.displayName = 'TopicBriefPanel';
export const TopicBriefPanel = React.memo(TopicBriefPanelComponent);
