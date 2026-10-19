import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as searchContext from '@contexts/SearchContext';
import { api } from '@services/api';
import type { TopicKnowledge } from '@types';
import { KnowledgeReviewPage } from './KnowledgeReviewPage';

jest.mock('@contexts/SearchContext');

const mockedSearch = searchContext as jest.Mocked<typeof searchContext>;

function draft(overrides: Partial<TopicKnowledge> = {}): TopicKnowledge {
  return {
    id: 11,
    topic: 'Latent autoimmune diabetes in adults',
    normalizedTopic: 'latent autoimmune diabetes in adults',
    knowledge: { mentorMessage: 'LADA is a slow-onset autoimmune diabetes.' },
    sourceArticles: [],
    status: 'pending_review',
    confidence: 0.6,
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
    lastRefreshedAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('KnowledgeReviewPage reviewer actions', () => {
  beforeEach(() => {
    mockedSearch.useNavigatePage.mockReturnValue(jest.fn());
    jest.spyOn(api.learning, 'getTopicProposals').mockResolvedValue({ proposals: [], total: 0 });
    jest.spyOn(api.knowledge, 'getLearningHealth').mockResolvedValue({
      health: {
        generatedAt: '2026-10-19T00:00:00.000Z',
        schedulerRuns: [],
        lowRecall: { days: 7, items: [] },
        refreshCandidates: [],
      },
    } as never);
    jest.spyOn(api.knowledge, 'updateTopicKnowledge').mockImplementation(async (topic, payload) => ({
      topicKnowledge: {
        ...draft({ topic, knowledge: payload.knowledge, status: payload.status || 'pending_review' }),
        id: topic.includes('Opioid') ? 12 : 11,
      },
      agentGuidance: null,
    }));
    jest.spyOn(api.knowledge, 'reviewTopicKnowledge').mockImplementation(async (topic) => ({
      found: true,
      topicKnowledge: draft({
        id: topic.includes('Opioid') ? 12 : 11,
        topic,
        status: 'human_reviewed',
        confidence: 0.85,
      }),
    }));
  });

  it('approves the open draft without dropping its mentor text', async () => {
    const pending = draft();
    jest.spyOn(api.knowledge, 'listTopicKnowledge').mockResolvedValue({
      topics: [pending],
      total: 1,
      limit: 500,
      offset: 0,
    });

    render(<KnowledgeReviewPage />);

    expect(await screen.findAllByText(pending.topic)).not.toHaveLength(0);
    const needsReview = screen.getAllByRole('button', { name: 'Needs review' });
    expect(needsReview.length).toBeGreaterThan(0);
    needsReview.forEach((button) => expect(button).toBeDisabled());

    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);

    await waitFor(() => expect(api.knowledge.reviewTopicKnowledge).toHaveBeenCalledWith(pending.topic));
    expect(api.knowledge.updateTopicKnowledge).toHaveBeenCalledWith(
      pending.topic,
      expect.objectContaining({
        status: 'pending_review',
        knowledge: expect.objectContaining({ mentorMessage: 'LADA is a slow-onset autoimmune diabetes.' }),
      }),
    );
    expect(await screen.findAllByText('Approved')).not.toHaveLength(0);
    expect(screen.getByText(/Approved “Latent autoimmune diabetes in adults”/)).toBeInTheDocument();
  });

  it('sends a different draft back to needs review and leaves the open draft alone', async () => {
    const openDraft = draft();
    const approved = draft({
      id: 12,
      topic: 'Opioid rotation and equianalgesic dosing',
      knowledge: { mentorMessage: 'Rotate using a documented equianalgesic table.' },
      status: 'human_reviewed',
      confidence: 0.9,
    });
    jest.spyOn(api.knowledge, 'listTopicKnowledge').mockResolvedValue({
      topics: [openDraft, approved],
      total: 2,
      limit: 500,
      offset: 0,
    });

    render(<KnowledgeReviewPage />);
    expect(await screen.findByText(approved.topic)).toBeInTheDocument();

    const row = screen.getByText(approved.topic).closest('div');
    expect(row).not.toBeNull();
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Needs review' }));

    await waitFor(() => expect(api.knowledge.updateTopicKnowledge).toHaveBeenCalledWith(
      approved.topic,
      expect.objectContaining({
        status: 'pending_review',
        confidence: 0.9,
        knowledge: expect.objectContaining({
          mentorMessage: 'Rotate using a documented equianalgesic table.',
        }),
      }),
    ));
    expect(api.knowledge.reviewTopicKnowledge).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue(openDraft.knowledge.mentorMessage as string)).toBeInTheDocument();
  });
});
