import React from 'react';
import { TopicBriefPanel } from '@components/search/TopicBriefPanel';
import { EvidenceMapPanel } from '@components/search/EvidenceMapPanel';
import { EvidenceQuizPanel } from '@components/search/EvidenceQuizPanel';
import { TopicKnowledgeDiscovery } from '@components/search/TopicKnowledgeDiscovery';
import { AgentMentorPanel } from '@components/search/AgentMentorPanel';
import { api } from '@services/api';
import type { AgentGuidance, Article, ClinicalAnswer, CommunityInsight, ProactiveAlert, ProactiveEvidenceAlert, SynthesisResult, TopicEvidenceMemory, TopicGuideStatus, TopicIntelligence } from '@types';
import type { BriefDifficulty } from '@components/search/TopicBriefPanel';

const AgentChatPanel = React.lazy(() => import('@components/search/AgentChatPanel').then(m => ({ default: m.AgentChatPanel })));

interface SearchEvidenceWorkflowSectionProps {
  currentQuery: string;
  results: Article[];
  agentGuidance: AgentGuidance | null;
  proposedGuidance: AgentGuidance | null;
  top5Articles: Article[];
  topicIntelligence: TopicIntelligence | null | undefined;
  synthesis: SynthesisResult | null;
  synthesisLoading: boolean;
  intelligenceLoading: boolean;
  topicGuideStatus: TopicGuideStatus;
  proposeError: string | null;
  proposingKnowledge: boolean;
  isFlagshipTopic: boolean;
  isAuthenticated: boolean;
  topicGuideRefreshState: 'idle' | 'loading';
  knowledgeReviewStatus: 'idle' | 'saving' | 'saved' | 'error';
  topicGuideRefreshError: string | null;
  canVerifyTeachingAnchor: boolean;
  anchorVerifyKey: string | null;
  inPlaceQuizExpanded: boolean;
  clinicalAnswer: ClinicalAnswer | null | undefined;
  aiEnrichmentLoading: boolean;
  aiEnrichmentFailed?: boolean;
  communityInsight: CommunityInsight | null | undefined;
  proactiveAlert: ProactiveAlert | null | undefined;
  knowledgeDriftAlerts: ProactiveEvidenceAlert[];
  topicEvidenceMemory: TopicEvidenceMemory | null;
  onProposeKnowledge: () => void;
  onRefreshTopicGuide: () => Promise<void>;
  onReviewTopicKnowledge: () => void;
  onAnchorVerifyKeyChange: (key: string | null) => void;
  onAgentGuidanceChange: (guidance: AgentGuidance) => void;
  onOpenCase: (difficulty?: BriefDifficulty) => void;
  onOpenQuiz: (difficulty?: BriefDifficulty) => void;
  onSynthesize: () => Promise<SynthesisResult | null>;
  onSearch: (query: string) => void;
  onOpenGuideline: () => void;
  onOpenAnalysis: (article: Article) => void;
  onDismissKnowledgeDrift: (id: number) => void;
}

export const SearchEvidenceWorkflowSection: React.FC<SearchEvidenceWorkflowSectionProps> = ({
  currentQuery,
  results,
  agentGuidance,
  proposedGuidance,
  top5Articles,
  topicIntelligence,
  synthesis,
  synthesisLoading,
  intelligenceLoading,
  topicGuideStatus,
  proposeError,
  proposingKnowledge,
  isFlagshipTopic,
  isAuthenticated,
  topicGuideRefreshState,
  knowledgeReviewStatus,
  topicGuideRefreshError,
  canVerifyTeachingAnchor,
  anchorVerifyKey,
  inPlaceQuizExpanded,
  clinicalAnswer,
  aiEnrichmentLoading,
  aiEnrichmentFailed,
  communityInsight,
  proactiveAlert,
  knowledgeDriftAlerts,
  topicEvidenceMemory,
  onProposeKnowledge,
  onRefreshTopicGuide,
  onReviewTopicKnowledge,
  onAnchorVerifyKeyChange,
  onAgentGuidanceChange,
  onOpenCase,
  onOpenQuiz,
  onSynthesize,
  onSearch,
  onOpenGuideline,
  onOpenAnalysis,
  onDismissKnowledgeDrift,
}) => (
  <>
    {!agentGuidance && (
      <TopicKnowledgeDiscovery
        currentQuery={currentQuery}
        resultsCount={results.length}
        intelligenceLoading={intelligenceLoading}
        topicGuideStatus={topicGuideStatus}
        proposeError={proposeError}
        proposingKnowledge={proposingKnowledge}
        onProposeKnowledge={onProposeKnowledge}
        proposedGuidance={proposedGuidance}
        onOpenCase={onOpenCase}
        onOpenQuiz={onOpenQuiz}
      />
    )}

    {agentGuidance && (
      <AgentMentorPanel
        agentGuidance={agentGuidance}
        isFlagshipTopic={isFlagshipTopic}
        isAuthenticated={isAuthenticated}
        topicGuideRefreshState={topicGuideRefreshState}
        onRefreshTopicGuide={onRefreshTopicGuide}
        knowledgeReviewStatus={knowledgeReviewStatus}
        onReviewTopicKnowledge={onReviewTopicKnowledge}
        topicGuideRefreshError={topicGuideRefreshError}
        canVerifyTeachingAnchor={canVerifyTeachingAnchor}
        anchorVerifyKey={anchorVerifyKey}
        onAnchorVerifyKeyChange={onAnchorVerifyKeyChange}
        currentQuery={currentQuery}
        onAgentGuidanceChange={onAgentGuidanceChange}
        onOpenCase={onOpenCase}
        onOpenQuiz={onOpenQuiz}
        onSynthesize={() => void onSynthesize()}
      />
    )}

    {agentGuidance && (
      <div className="mb-4">
        <React.Suspense fallback={null}>
          <AgentChatPanel
            topic={agentGuidance.topic}
            agentGuidance={agentGuidance}
            currentArticles={results}
            onGenerateCase={() => onOpenCase('mixed')}
            onGenerateMcqs={() => onOpenQuiz('mixed')}
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
        onSummarizePaper={onOpenAnalysis}
        onQuiz={onOpenQuiz}
        onCase={onOpenCase}
        onOpenTopic={onSearch}
        onGuidelineCompare={onOpenGuideline}
        agentGuidance={agentGuidance}
        liveClinicalAnswer={clinicalAnswer}
        aiEnrichmentLoading={aiEnrichmentLoading}
        aiEnrichmentFailed={aiEnrichmentFailed}
        communityInsight={communityInsight}
        proactiveAlert={proactiveAlert}
        knowledgeDriftAlerts={knowledgeDriftAlerts}
        evidenceMemory={topicEvidenceMemory}
        onDismissKnowledgeDrift={onDismissKnowledgeDrift}
      />
      <EvidenceMapPanel evidenceMap={topicIntelligence?.evidenceMap} onOpenTopic={onSearch} />
      <div className="mb-4">
        <EvidenceQuizPanel
          topic={currentQuery}
          articles={top5Articles.length > 0 ? top5Articles : results.slice(0, 5)}
          autoExpand={inPlaceQuizExpanded}
          onAuthSubmit={async (attempts) => {
            await api.learning.submitQuizAttempt({ topic: currentQuery, attempts });
          }}
        />
      </div>
    </div>
  </>
);
