import { render, screen } from '@testing-library/react';
import { TopicItemPsychometricsPanel } from './TopicItemPsychometricsPanel';
import type { TopicCollectiveMemory } from '@types';

const memory: TopicCollectiveMemory = {
  interactionCount: 120,
  uniqueUsers: 18,
  highDiscrimination: [
    {
      conceptHash: 'reliable-1',
      questionText: 'Reliable discrimination item',
      correctRate: 58,
      sampleSize: 42,
      reliable: true,
      discrimination: 0.41,
    },
  ],
  tooEasy: [
    {
      conceptHash: 'low-n-1',
      questionText: 'Too easy with low sample',
      correctRate: 94,
      sampleSize: 12,
      reliable: false,
    },
  ],
};

describe('TopicItemPsychometricsPanel', () => {
  it('renders nothing when collective memory is absent', () => {
    const { container } = render(<TopicItemPsychometricsPanel memory={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows insufficient data messaging for items below 30 attempts', () => {
    render(<TopicItemPsychometricsPanel memory={memory} />);

    expect(screen.getByText(/Item psychometrics/i)).toBeInTheDocument();
    expect(screen.getByText(/fewer than 30 attempts/i)).toBeInTheDocument();
    expect(screen.getByText(/Insufficient data/i)).toBeInTheDocument();
    expect(screen.getByText(/Too easy with low sample/i)).toBeInTheDocument();
    expect(screen.getByText(/Reliable discrimination item/i)).toBeInTheDocument();
  });
});
