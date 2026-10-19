import { fireEvent, render, screen } from '@testing-library/react';
import { DraftReviewButtons } from './DraftReviewButtons';
import { statusLabel } from './statusLabel';

describe('statusLabel', () => {
  it('names reviewer decisions instead of folding drafts into AI generated', () => {
    expect(statusLabel('pending_review').label).toBe('Needs Review');
    expect(statusLabel('human_reviewed').label).toBe('Approved');
    expect(statusLabel('human_edited').label).toBe('Clinician Edited');
    expect(statusLabel('ai_generated').label).toBe('AI Generated');
  });
});

describe('DraftReviewButtons', () => {
  it('lets a reviewer approve a draft that still needs review', () => {
    const onApprove = jest.fn();
    const onNeedsReview = jest.fn();
    render(
      <DraftReviewButtons
        status="pending_review"
        onApprove={onApprove}
        onNeedsReview={onNeedsReview}
      />
    );

    const needsReview = screen.getByRole('button', { name: 'Needs review' });
    expect(needsReview).toBeDisabled();
    expect(needsReview).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onNeedsReview).not.toHaveBeenCalled();
  });

  it('lets a reviewer send an approved draft back to needs review', () => {
    const onApprove = jest.fn();
    const onNeedsReview = jest.fn();
    render(
      <DraftReviewButtons
        status="human_reviewed"
        onApprove={onApprove}
        onNeedsReview={onNeedsReview}
      />
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Needs review' }));
    expect(onNeedsReview).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while a decision is saving', () => {
    render(
      <DraftReviewButtons
        status="ai_generated"
        busyDecision="approve"
        onApprove={jest.fn()}
        onNeedsReview={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Needs review' })).toBeDisabled();
  });
});
