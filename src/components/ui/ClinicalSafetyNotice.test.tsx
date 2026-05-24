import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClinicalSafetyNotice } from './ClinicalSafetyNotice';

describe('ClinicalSafetyNotice', () => {
  it('renders disclaimer text by default', () => {
    render(<ClinicalSafetyNotice />);

    expect(
      screen.getByText(/AI-generated — verify against primary sources/i)
    ).toBeInTheDocument();
  });

  it('renders VerificationBadge when status is provided', () => {
    render(<ClinicalSafetyNotice status="source_verified" />);

    expect(screen.getByText('Source Verified')).toBeInTheDocument();
  });

  it('does not render VerificationBadge when status is undefined', () => {
    render(<ClinicalSafetyNotice />);

    expect(screen.queryByText('Source Verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Unverified')).not.toBeInTheDocument();
  });

  it('does not render VerificationBadge when status is null', () => {
    render(<ClinicalSafetyNotice status={null} />);

    // VerificationBadge returns null for falsy status
    expect(screen.queryByText(/verified|reviewed|draft/i)).not.toBeInTheDocument();
  });

  it('hides disclaimer when showDisclaimer is false', () => {
    render(<ClinicalSafetyNotice showDisclaimer={false} />);

    expect(
      screen.queryByText(/AI-generated/i)
    ).not.toBeInTheDocument();
  });

  it('shows disclaimer when showDisclaimer is true', () => {
    render(<ClinicalSafetyNotice showDisclaimer={true} />);

    expect(
      screen.getByText(/AI-generated — verify against primary sources/i)
    ).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ClinicalSafetyNotice className="my-notice-class" />
    );

    expect(container.firstChild).toHaveClass('my-notice-class');
  });

  it('renders badge label for guideline_supported status', () => {
    render(<ClinicalSafetyNotice status="guideline_supported" />);

    expect(screen.getByText('Guideline Supported')).toBeInTheDocument();
  });

  it('renders badge label for human_reviewed status', () => {
    render(<ClinicalSafetyNotice status="human_reviewed" />);

    expect(screen.getByText('Human Reviewed')).toBeInTheDocument();
  });

  it('renders both badge and disclaimer simultaneously', () => {
    render(<ClinicalSafetyNotice status="source_verified" showDisclaimer={true} />);

    expect(screen.getByText('Source Verified')).toBeInTheDocument();
    expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
  });

  it('renders no badge for synthesis_excerpt status (empty label)', () => {
    // synthesis_excerpt maps to empty label, so VerificationBadge renders null
    const { container } = render(<ClinicalSafetyNotice status="synthesis_excerpt" />);

    // Only disclaimer text should be visible — no badge span
    const spans = container.querySelectorAll('span');
    expect(spans).toHaveLength(1); // just the disclaimer span
    expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
  });
});
