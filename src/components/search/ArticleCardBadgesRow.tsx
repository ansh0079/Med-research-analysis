import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Article } from '@types';
import { RankingTraceBadge } from '@components/search/RankingTraceBadge';
import { getArticleSourceBadgeInfo } from '@services/articleLinks';
import {
  EVIDENCE_TYPE_LABEL,
  GRADE_CLASS,
  isLikelyPreprint,
  isPotentialPredatoryJournal,
} from './articleCardUtils';

interface ArticleCardBadgesRowProps {
  article: Article;
  isFree: boolean;
  pdfIndexed: boolean;
  isSelected: boolean;
  onSelect?: (article: Article) => void;
  onOpenTopic?: (topic: string) => void;
}

export const ArticleCardBadgesRow: React.FC<ArticleCardBadgesRowProps> = ({
  article,
  isFree,
  pdfIndexed,
  isSelected,
  onSelect,
  onOpenTopic,
}) => {
  const navigate = useNavigate();
  const impact = article._impact;
  const quality = article._quality;
  const sourceBadge = getArticleSourceBadgeInfo(article);
  const isPreprint = isLikelyPreprint(article);
  const predatoryFlag = isPotentialPredatoryJournal(article);
  const pubYear = parseInt((article.pubdate || '').slice(0, 4), 10);
  const citations = article.pmcrefcount ?? article.citationCount;
  const CURRENT_YEAR = new Date().getFullYear();
  const isOutdated = !isNaN(pubYear) && pubYear < (CURRENT_YEAR - 9);
  const isPracticeChanging = !isNaN(pubYear) && pubYear >= (CURRENT_YEAR - 3) && (citations ?? 0) >= 100;

  return (
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {isFree ? (
          <span className="badge badge-free">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Open
          </span>
        ) : (
          <span className="badge badge-paywall">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Paywall
          </span>
        )}

        {impact?.level && (
          <span className={`badge ${impact.level === 'high' ? 'badge-impact-high' : 'badge-source'}`}>
            {impact.level === 'high' ? '↑ High Impact' : impact.level === 'medium' ? '~ Mid Impact' : 'Low Impact'}
          </span>
        )}

        {impact?.evidenceType && (
          <span className="badge badge-source">
            {EVIDENCE_TYPE_LABEL[impact.evidenceType] ?? impact.evidenceType}
          </span>
        )}

        <span className={`badge border ${sourceBadge.className}`} title={`Source: ${sourceBadge.label}`}>
          {sourceBadge.label}
        </span>

        {article._retraction?.isRetracted && (
          <span className="badge badge-retracted">Warning: Retracted</span>
        )}

        {article._isPreprint && (
          <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}
            title="Preprint — not yet peer reviewed">
            Warning: Preprint
          </span>
        )}

        {isPreprint && !article._isPreprint && (
          <span className="badge" style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309', border: '1px solid rgba(251,191,36,0.4)' }}
            title="Preprint - not yet peer reviewed">
            Preprint
          </span>
        )}

        {predatoryFlag && (
          <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.35)' }}
            title="Journal appears on a local predatory-journal watchlist. Verify before citing.">
            Journal watchlist
          </span>
        )}

        {article._ebmLabel && (
          <span
            className="badge badge-source font-semibold"
            title={`Evidence tier: ${article._ebmLabel.label}`}
            style={{
              background: article._ebmScore !== undefined && article._ebmScore >= 6
                ? 'rgba(16,185,129,0.12)'
                : article._ebmScore !== undefined && article._ebmScore >= 4
                  ? 'rgba(99,102,241,0.12)'
                  : undefined,
              color: article._ebmScore !== undefined && article._ebmScore >= 6
                ? '#059669'
                : article._ebmScore !== undefined && article._ebmScore >= 4
                  ? '#6366f1'
                  : undefined,
            }}
          >
            {article._ebmLabel.short}
          </span>
        )}

        {isPracticeChanging && (
          <span
            className="badge font-semibold"
            title="Recent high-citation paper — may represent practice-changing evidence"
            style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.35)' }}
          >
            ⚡ Recent high-impact
          </span>
        )}

        {isOutdated && !isPracticeChanging && (
          <span
            className="badge font-semibold"
            title="Published 10+ years ago — verify against current guidelines before applying"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' }}
          >
            Warning: Verify recency
          </span>
        )}

        {pdfIndexed && (
          <span
            className="badge font-semibold"
            title="Full text has been pre-indexed — AI can analyze specific sections"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.35)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />
            Full Text ✓
          </span>
        )}

        {(article._rankingTrace || article._learnerAdaptationReason || article._rankMovedByLearning) && (
          <RankingTraceBadge
            trace={article._rankingTrace || {
              articleUid: String(article.uid || article.pmid || 'unknown'),
              baseEvidenceScore: 0,
              deterministicPenalties: [],
              teachingObjectBoost: 0,
              learnerBoost: Number(article._learningBoost || 0),
              finalScore: 0,
              evidenceRank: article._evidenceRank,
              learningRank: article._learningRank,
              banditArm: article._banditArmId || null,
              reasons: article._rankReasons || [],
            }}
            movedByLearning={article._rankMovedByLearning}
            compactReasons={article._rankReasons}
            adaptationReason={article._learnerAdaptationReason}
          />
        )}

        {article._synapseTopics && article._synapseTopics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article._synapseTopics.map((synTopic) => (
              <span
                key={synTopic}
                className="badge font-semibold cursor-pointer hover:opacity-80"
                title={`This paper is also cited in ${synTopic}`}
                style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.35)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenTopic) onOpenTopic(synTopic);
                  else navigate(`/search?q=${encodeURIComponent(synTopic)}`);
                }}
              >
                ↗ {synTopic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {quality && (
          <div
            className={`grade-ring ${GRADE_CLASS[quality.grade] ?? 'grade-D'}`}
            title={`Quality ${quality.grade} · ${quality.score}/100\n${quality.factors.slice(0, 3).join(' · ')}`}
          >
            {quality.grade}
          </div>
        )}
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(article)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'border-indigo-500 bg-indigo-500 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400'
            }`}
            title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
