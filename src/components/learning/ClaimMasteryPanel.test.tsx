import { render, screen, waitFor } from '@testing-library/react';
import { ClaimMasteryPanel } from './ClaimMasteryPanel';

const getClaimMastery = jest.fn();

jest.mock('@services/api', () => ({
  api: {
    knowledge: {
      getClaimMastery: (...args: unknown[]) => getClaimMastery(...args),
    },
  },
}));

describe('ClaimMasteryPanel', () => {
  beforeEach(() => {
    getClaimMastery.mockReset();
  });

  it('renders nothing while there is no data', () => {
    getClaimMastery.mockResolvedValue({ topic: 'ARDS', summary: { total: 0, untested: 0, weak: 0, mastered: 0 }, claims: [] });
    const { container } = render(<ClaimMasteryPanel topic="ARDS" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the weakest attempted claims with their mastery percentage', async () => {
    getClaimMastery.mockResolvedValue({
      topic: 'ARDS',
      summary: { total: 2, untested: 0, weak: 1, mastered: 1 },
      claims: [
        { claimKey: 'c1', claimText: 'Low tidal volume reduces mortality in ARDS.', masteryProbability: 0.92, masteryState: 'mastered', attempts: 5 },
        { claimKey: 'c2', claimText: 'Prone positioning improves oxygenation in severe ARDS.', masteryProbability: 0.31, masteryState: 'weak', attempts: 3 },
      ],
    });

    render(<ClaimMasteryPanel topic="ARDS" />);

    await waitFor(() => expect(screen.getByText(/Claim mastery/i)).toBeInTheDocument());
    expect(screen.getByText(/Prone positioning improves oxygenation/i)).toBeInTheDocument();
    expect(screen.getByText('31%')).toBeInTheDocument();
    expect(screen.getByText(/1 mastered/i)).toBeInTheDocument();
  });

  it('does not render for a topic that is too short', () => {
    const { container } = render(<ClaimMasteryPanel topic="a" />);
    expect(container.firstChild).toBeNull();
    expect(getClaimMastery).not.toHaveBeenCalled();
  });

  it('renders nothing if the fetch fails', async () => {
    getClaimMastery.mockRejectedValue(new Error('network error'));
    const { container } = render(<ClaimMasteryPanel topic="ARDS" />);
    await waitFor(() => expect(getClaimMastery).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
