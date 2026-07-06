import React from 'react';
import { SearchKnowledgePanels } from '@components/search/SearchKnowledgePanels';
import { TopicBriefPanel } from '@components/search/TopicBriefPanel';
import { EvidenceQuizPanel } from '@components/search/EvidenceQuizPanel';
import { EvidenceMapPanel } from '@components/search/EvidenceMapPanel';
import type {
  AgentGuidance,
  Article,
  ClinicalAnswer,
  CommunityInsight,
  ProactiveAlert,
  ProactiveEvidenceAlert,
  SynthesisResult,
  TopicEvidenceMemory,
  TopicGuideStatus,
  TopicIntelligence,
} from '@types';

const AgentChatPanel = React.lazy(() => import('@components/search/AgentChatPanel').then((module) => ({ default: module.AgentChatPanel })));

type BriefDifficulty = Parameters<React.ComponentProps<typeof TopicBriefPanel>['onQuiz']>[0];
type QuizSubmit = React.ComponentProps<typeof EvidenceQuizPanel>['onAuthSubmit'];

export function SearchEvidenceWorkspaceSection({
  results,
  currentQuery,
  agentGuidance,
  proposedGuidance,
  intelligenceLoading,
  topicGuideStatus,
  proposeError,
  proposingKnowledge,
  isFlagshipTopic,
  isAuthenticated,
  topicGuideRefreshState,
  topicGuideRefreshError,
  knowledgeReviewStatus,
  canVerifyTeachingAnchor,
  anchorVerifyKey,
  top5Articles,
  topicIntelligence,
  synthesis,
  synthesisLoading,
  clinicalAnswer,
  aiEnrichmentLoading,
  communityInsight,
  proactiveAlert,
  knowledgeDriftAlerts,
  topicEvidenceMemory,
  inPlaceQuizExpanded,
  onProposeKnowledge,
  onGenerateCase,
  onGenerateMcqs,
  onReviewTopicKnowledge,
  onRefreshTopicGuide,
  onVerifyTeachingAnchor,
  onReviewSeminalEvidence,
  onSynthesize,
  onSummarizePaper,
  onQuiz,
  onCase,
  onOpenTopic,
  onGuidelineCompare,
  onDismissKnowledgeDrift,
  onQuizSubmit,
}: {
  results: Article[];
  currentQuery: string;
  agentGuidance: AgentGuidance | null;
  proposedGuidance: AgentGuidance | null;
  intelligenceLoading: boolean;
  topicGuideStatus: TopicGuideStatus;
  proposeError: string | null;
  proposingKnowledge: boolean;
  isFlagshipTopic: boolean;
  isAuthenticated: boolean;
  topicGuideRefreshState: 'idle' | 'loading';
  topicGuideRefreshError: string | null;
  knowledgeReviewStatus: 'idle' | 'saving' | 'saved' | 'error';
  canVerifyTeachingAnchor: boolean;
  anchorVerifyKey: string | null;
  top5Articles: Article[];
  topicIntelligence: TopicIntelligence | null;
  synthesis: SynthesisResult | null;
  synthesisLoading: boolean;
  clinicalAnswer: ClinicalAnswer | null;
  aiEnrichmentLoading: boolean;
  communityInsight: CommunityInsight | null;
  proactiveAlert: ProactiveAlert | null;
  knowledgeDriftAlerts: ProactiveEvidenceAlert[];
  topicEvidenceMemory: TopicEvidenceMemory | null;
  inPlaceQuizExpanded: boolean;
  onProposeKnowledge: () => void;
  onGenerateCase: () => void;
  onGenerateMcqs: () => void;
  onReviewTopicKnowledge: () => void;
  onRefreshTopicGuide: () => void;
  onVerifyTeachingAnchor: (key: string, claimText: string) => void;
  onReviewSeminalEvidence: () => void;
  onSynthesize: () => void;
  onSummarizePaper: (article: Article) => void;
  onQuiz: (difficulty: BriefDifficulty) => void;
  onCase: (difficulty: BriefDifficulty) => void;
  onOpenTopic: (query: string) => void;
  onGuidelineCompare: () => void;
  onDismissKnowledgeDrift: (id: number) => void;
  onQuizSubmit: QuizSubmit;
}) {
  if (results.length === 0) return null;

  return (
    <>
      <SearchKnowledgePanels
        show={results.length > 0}
        agentGuidance={agentGuidance}
        proposedGuidance={proposedGuidance}
        results={results}
        currentQuery={currentQuery}
        intelligenceLoading={intelligenceLoading}
        topicGuideStatus={topicGuideStatus}
        proposeError={proposeError}
        proposingKnowledge={proposingKnowledge}
        isFlagshipTopic={isFlagshipTopic}
        isAuthenticated={isAuthenticated}
        topicGuideRefreshState={topicGuideRefreshState}
        topicGuideRefreshError={topicGuideRefreshError}
        knowledgeReviewStatus={knowledgeReviewStatus}
        canVerifyTeachingAnchor={canVerifyTeachingAnchor}
        anchorVerifyKey={anchorVerifyKey}
        onProposeKnowledge={onProposeKnowledge}
        onGenerateCase={onGenerateCase}
        onGenerateMcqs={onGenerateMcqs}
        onReviewTopicKnowledge={onReviewTopicKnowledge}
        onRefreshTopicGuide={onRefreshTopicGuide}
        onVerifyTeachingAnchor={onVerifyTeachingAnchor}
        onReviewSeminalEvidence={onReviewSeminalEvidence}
      />

      {agentGuidance && (
        <div className="mb-4">
          <React.Suspense fallback={null}>
            <AgentChatPanel
              topic={agentGuidance.topic}
              agentGuidance={agentGuidance}
              currentArticles={results}
              onGenerateCase={onGenerateCase}
              onGenerateMcqs={onGenerateMcqs}
            />
          </React.Suspense>
        </div>
      )}

      <div id="workflow-evidence" className="mb-4 scroll-mt-28">
        <TopicBriefPanel
          query={currentQuery}
          top5={top5Articles}
          allResults={results}
          topicIntelligence={topicIntelligence}
          synthesis={synthesis}
          synthesisLoading={synthesisLoading}
          onSynthesize={onSynthesize}
          onSummarizePaper={onSummarizePaper}
          onQuiz={onQuiz}
          onCase={onCase}
          onOpenTopic={onOpenTopic}
          onGuidelineCompare={onGuidelineCompare}
          agentGuidance={agentGuidance}
          liveClinicalAnswer={clinicalAnswer}
          aiEnrichmentLoading={aiEnrichmentLoading}
          communityInsight={communityInsight}
          proactiveAlert={proactiveAlert}
          knowledgeDriftAlerts={knowledgeDriftAlerts}
          evidenceMemory={topicEvidenceMemory}
          onDismissKnowledgeDrift={onDismissKnowledgeDrift}
        />
        <EvidenceMapPanel evidenceMap={topicIntelligence?.evidenceMap} onOpenTopic={onOpenTopic} />
        <div className="mb-4">
          <EvidenceQuizPanel
            topic={currentQuery}
            articles={top5Articles.length > 0 ? top5Articles : results.slice(0, 5)}
            autoExpand={inPlaceQuizExpanded}
            onAuthSubmit={onQuizSubmit}
          />
        </div>
      </div>
    </>
  );
}
