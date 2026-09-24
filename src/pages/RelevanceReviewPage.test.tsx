import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { RelevanceReviewPage } from './RelevanceReviewPage';
import * as authContext from '@contexts/AuthContext';
import { api } from '@services/api';

jest.mock('@contexts/AuthContext');

const mockedAuth = authContext as jest.Mocked<typeof authContext>;

const queueEntry = {
  queryKey: 'corticosteroids in septic shock',
  query: 'corticosteroids in septic shock',
  searchId: 'snap-1',
  servedAt: '2026-09-20T10:00:00.000Z',
  candidates: [
    { articleUid: 'pubmed-1', servedRank: 1, lane: 'guidelines', title: 'Surviving Sepsis 2021', retracted: false },
    { articleUid: 'pubmed-2', servedRank: 2, lane: 'landmark_trials', title: 'ADRENAL trial', retracted: false },
  ],
};

const scenario = {
  queryKey: 'corticosteroids in septic shock',
  query: 'corticosteroids in septic shock',
  scenarioId: 'S-TX-OUT-01',
  intendedSense: 'adjunctive corticosteroids',
  reviewers: ['clinician-a'],
  candidates: [
    { articleUid: 'pubmed-1', servedRank: 1, lane: 'guidelines', title: 'Surviving Sepsis 2021', votes: [], label: null, state: 'disagreed', reviewers: 2, disagreed: true },
  ],
  agreement: { pairs: 2, observedAgreement: 0.5, kappa: 0.1, reportable: false },
  graduatable: false,
  blockers: ['needs a second reviewer', 'unadjudicated disagreement'],
};

function mockUser(role: string | null) {
  mockedAuth.useAuth.mockReturnValue({
    user: role ? ({ id: 'u1', email: 'r@example.com', role } as never) : null,
    isAuthenticated: Boolean(role),
    isLoading: false,
  } as never);
}

describe('RelevanceReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser('curator');
    jest.spyOn(api.relevanceReview, 'getQueue').mockResolvedValue({ labels: ['on_topic', 'adjacent', 'off_topic'], queue: [queueEntry] });
    jest.spyOn(api.relevanceReview, 'getScenarios').mockResolvedValue({ labels: [], scenarios: [scenario], summary: { total: 1, graduatable: 0 } });
    jest.spyOn(api.relevanceReview, 'recordJudgement').mockResolvedValue({ ok: true, queryKey: 'q', articleUid: 'pubmed-1' } as never);
  });

  test('shows the question and the result as it was served', async () => {
    await act(async () => { render(<RelevanceReviewPage />); });
    await waitFor(() => expect(screen.getByText('corticosteroids in septic shock')).toBeInTheDocument());
    expect(screen.getByText('Surviving Sepsis 2021')).toBeInTheDocument();
    expect(screen.getByText(/Result 1/)).toBeInTheDocument();
    expect(screen.getByText(/candidate 1 of 2/)).toBeInTheDocument();
  });

  test('a verdict is sent with the served position it was judged at, then moves on', async () => {
    await act(async () => { render(<RelevanceReviewPage />); });
    await waitFor(() => expect(screen.getByText('Surviving Sepsis 2021')).toBeInTheDocument());

    await act(async () => { fireEvent.click(screen.getByText('On topic')); });

    expect(api.relevanceReview.recordJudgement).toHaveBeenCalledWith(expect.objectContaining({
      query: 'corticosteroids in septic shock',
      articleUid: 'pubmed-1',
      label: 'on_topic',
      searchId: 'snap-1',
      servedRank: 1,
      lane: 'guidelines',
    }));
    // The next candidate of the same query follows, so a reviewer is not returned to a list.
    await waitFor(() => expect(screen.getByText('ADRENAL trial')).toBeInTheDocument());
  });

  test('the keyboard labels the current candidate', async () => {
    await act(async () => { render(<RelevanceReviewPage />); });
    await waitFor(() => expect(screen.getByText('Surviving Sepsis 2021')).toBeInTheDocument());

    await act(async () => { fireEvent.keyDown(window, { key: '3' }); });
    expect(api.relevanceReview.recordJudgement).toHaveBeenCalledWith(expect.objectContaining({ label: 'off_topic' }));
  });

  test("the server's readiness verdict and reasons are shown, not recomputed", async () => {
    await act(async () => { render(<RelevanceReviewPage />); });
    await act(async () => { fireEvent.click(screen.getByText(/Scenarios/)); });

    expect(screen.getByText('not ready')).toBeInTheDocument();
    expect(screen.getByText('needs a second reviewer')).toBeInTheDocument();
    expect(screen.getByText('unadjudicated disagreement')).toBeInTheDocument();
    // Agreement that the server marked unreportable is labelled as such rather than quoted plainly.
    expect(screen.getByText(/kappa 0.1 \(too few to report\)/)).toBeInTheDocument();
  });

  test('a reader who is not a reviewer is not shown the queue', async () => {
    mockUser('user');
    await act(async () => { render(<RelevanceReviewPage />); });
    expect(screen.getByText(/for reviewers only/)).toBeInTheDocument();
    expect(api.relevanceReview.getQueue).not.toHaveBeenCalled();
  });
});
