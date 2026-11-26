import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AgentGuidance } from '@types';

import { TopicBriefStatusBands } from './TopicBriefStatusBands';

/**
 * Pages rebuilt from stored full text are published with status `evidence_verified`. The band used to
 * fall through to "AI generated" for that status, and pages with only one or two verified points gave
 * no hint that the evidence behind them was thin.
 */
function guidance(status: string, points: number): AgentGuidance {
  return {
    topic: 'test topic',
    status,
    confidence: 0.9,
    mentorMessage: '',
    seminalPapers: [],
    teachingPoints: Array.from({ length: points }, (_, i) => ({ claim: `point ${i}`, sourceIndices: [1] })),
  };
}

function renderBands(agentGuidance: AgentGuidance) {
  return render(
    <TopicBriefStatusBands
      retractedCount={0}
      preprintCount={0}
      driftForTopic={null}
      agentGuidance={agentGuidance}
      guidelineCount={0}
      hasReviewedGuidelines={false}
    />,
  );
}

describe('TopicBriefStatusBands mentor status', () => {
  it('labels evidence_verified pages as evidence verified, not AI generated', () => {
    renderBands(guidance('evidence_verified', 4));
    expect(screen.getByText('Evidence verified')).toBeInTheDocument();
    expect(screen.queryByText('AI generated')).not.toBeInTheDocument();
    expect(screen.queryByText('Limited evidence')).not.toBeInTheDocument();
  });

  it('flags evidence_verified pages with fewer than three points as limited evidence', () => {
    renderBands(guidance('evidence_verified', 2));
    expect(screen.getByText('Limited evidence')).toBeInTheDocument();
  });

  it('does not claim clinician review for sync-stamped human_reviewed pages', () => {
    renderBands(guidance('human_reviewed', 4));
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.queryByText('Clinician reviewed')).not.toBeInTheDocument();
  });

  it('keeps the AI generated label for unverified machine pages', () => {
    renderBands(guidance('ai_generated', 2));
    expect(screen.getByText('AI generated')).toBeInTheDocument();
    expect(screen.queryByText('Limited evidence')).not.toBeInTheDocument();
  });

  it('shows a Needs review button on evidence_verified pages that opens an explanation', () => {
    renderBands(guidance('evidence_verified', 4));
    const button = screen.getByRole('button', { name: /needs review/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: /review status/i })).toHaveTextContent(/clinician has not yet checked/i);
  });

  it('does not show Needs review on pages that are not evidence_verified', () => {
    renderBands(guidance('human_edited', 4));
    expect(screen.queryByRole('button', { name: /needs review/i })).not.toBeInTheDocument();
  });
});
