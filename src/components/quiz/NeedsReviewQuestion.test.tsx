import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { NeedsReviewButton } from '@components/ui/NeedsReviewButton';

describe('NeedsReviewButton', () => {
  it('is collapsed by default and reveals its explanation and actions when clicked', () => {
    render(
      <NeedsReviewButton explanation="Not yet approved by a clinician.">
        <button type="button">Report a problem</button>
      </NeedsReviewButton>,
    );
    expect(screen.queryByText('Not yet approved by a clinician.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /needs review/i }));
    expect(screen.getByText('Not yet approved by a clinician.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Report a problem' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /needs review/i }));
    expect(screen.queryByText('Not yet approved by a clinician.')).not.toBeInTheDocument();
  });
});
