import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchMetaProvider, useSearchMeta } from './SearchContext';

describe('SearchMetaContext', () => {
  const renderWithContext = (element: React.ReactNode) => {
    return render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SearchMetaProvider>{element}</SearchMetaProvider>
      </MemoryRouter>
    );
  };

  it('provides initial meta state', () => {
    const TestComponent = () => {
      const {
        agentGuidance,
        topicIntelligence,
        clinicalAnswer,
        communityInsight,
        topicGuideStatus,
      } = useSearchMeta();
      return (
        <>
          <div>Guidance: {agentGuidance ? 'present' : 'null'}</div>
          <div>Intelligence: {topicIntelligence ? 'present' : 'null'}</div>
          <div>Answer: {clinicalAnswer ? 'present' : 'null'}</div>
          <div>Insight: {communityInsight ? 'present' : 'null'}</div>
          <div>Status: {topicGuideStatus}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    expect(screen.getByText('Guidance: null')).toBeInTheDocument();
    expect(screen.getByText('Intelligence: null')).toBeInTheDocument();
    expect(screen.getByText('Answer: null')).toBeInTheDocument();
    expect(screen.getByText('Insight: null')).toBeInTheDocument();
    expect(screen.getByText('Status: idle')).toBeInTheDocument();
  });

  it('sets agent guidance', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockGuidance = { topic: 'diabetes', guidance: 'Test guidance', keyInsights: ['insight 1', 'insight 2'] } as any;

    const TestComponent = () => {
      const { agentGuidance, setAgentGuidance } = useSearchMeta();
      return (
        <>
          <button onClick={() => setAgentGuidance(mockGuidance)}>Set Guidance</button>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <div>Guidance: {(agentGuidance as any)?.guidance || 'null'}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    expect(screen.getByText('Guidance: null')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /set guidance/i }));

    expect(screen.getByText('Guidance: Test guidance')).toBeInTheDocument();
  });

  it('clears agent guidance', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockGuidance = { topic: 'diabetes', guidance: 'Test' } as any;

    const TestComponent = () => {
      const { agentGuidance, setAgentGuidance } = useSearchMeta();
      return (
        <>
          <button onClick={() => setAgentGuidance(mockGuidance)}>Set</button>
          <button onClick={() => setAgentGuidance(null)}>Clear</button>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <div>Guidance: {(agentGuidance as any)?.guidance || 'null'}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /^Set$/i }));
    expect(screen.getByText('Guidance: Test')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByText('Guidance: null')).toBeInTheDocument();
  });

  it('sets topic intelligence', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockIntelligence = { topic: 'cardiology', insights: ['insight 1'], evidence: 'evidence text' } as any;

    const TestComponent = () => {
      const { topicIntelligence, setTopicIntelligence } = useSearchMeta();
      return (
        <>
          <button onClick={() => setTopicIntelligence(mockIntelligence)}>
            Set Intelligence
          </button>
          <div>Intelligence: {topicIntelligence?.topic || 'null'}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /set intelligence/i }));

    expect(screen.getByText('Intelligence: cardiology')).toBeInTheDocument();
  });

  it('sets clinical answer', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAnswer = { answer: 'Clinical answer text', evidence: 'Supporting evidence', level: 'expert' } as any;

    const TestComponent = () => {
      const { clinicalAnswer, setClinicalAnswer } = useSearchMeta();
      return (
        <>
          <button onClick={() => setClinicalAnswer(mockAnswer)}>Set Answer</button>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <div>Answer: {(clinicalAnswer as any)?.answer || 'null'}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /set answer/i }));

    expect(screen.getByText('Answer: Clinical answer text')).toBeInTheDocument();
  });

  it('sets community insight', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockInsight = { type: 'consensus', summary: 'Community consensus text', confidence: 0.95 } as any;

    const TestComponent = () => {
      const { communityInsight, setCommunityInsight } = useSearchMeta();
      return (
        <>
          <button onClick={() => setCommunityInsight(mockInsight)}>
            Set Insight
          </button>
          <div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            Insight: {(communityInsight as any)?.summary || 'null'}
          </div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: /set insight/i }));

    expect(screen.getByText('Insight: Community consensus text')).toBeInTheDocument();
  });

  it('transitions topic guide status', () => {
    const TestComponent = () => {
      const { topicGuideStatus, setTopicGuideStatus } = useSearchMeta();
      return (
        <>
          <button onClick={() => setTopicGuideStatus('building')}>To Building</button>
          <button onClick={() => setTopicGuideStatus('ready')}>To Ready</button>
          <button onClick={() => setTopicGuideStatus('idle')}>To Idle</button>
          <div>Status: {topicGuideStatus}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    expect(screen.getByText('Status: idle')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /to building/i }));
    expect(screen.getByText('Status: building')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /to ready/i }));
    expect(screen.getByText('Status: ready')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /to idle/i }));
    expect(screen.getByText('Status: idle')).toBeInTheDocument();
  });


  it('throws error when useSearchMeta used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useSearchMeta();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSearchMeta must be used within SearchProvider');

    (console.error as jest.Mock).mockRestore();
  });


  it('maintains independent state for each meta property', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockGuidance = { topic: 'test', guidance: 'guid' } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockIntelligence = { topic: 'test', insights: [] } as any;

    const TestComponent = () => {
      const {
        agentGuidance,
        topicIntelligence,
        setAgentGuidance,
        setTopicIntelligence,
      } = useSearchMeta();
      return (
        <>
          <button onClick={() => setAgentGuidance(mockGuidance)}>Set Guid</button>
          <button onClick={() => setTopicIntelligence(mockIntelligence)}>
            Set Intell
          </button>
          <div>Guid: {agentGuidance ? 'yes' : 'no'}</div>
          <div>Intell: {topicIntelligence ? 'yes' : 'no'}</div>
        </>
      );
    };

    renderWithContext(<TestComponent />);

    expect(screen.getByText('Guid: no')).toBeInTheDocument();
    expect(screen.getByText('Intell: no')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /set guid/i }));

    expect(screen.getByText('Guid: yes')).toBeInTheDocument();
    expect(screen.getByText('Intell: no')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /set intell/i }));

    expect(screen.getByText('Guid: yes')).toBeInTheDocument();
    expect(screen.getByText('Intell: yes')).toBeInTheDocument();
  });
});
