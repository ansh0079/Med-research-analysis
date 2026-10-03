import React from 'react';
import { render, screen } from '@testing-library/react';
import type { MergedGuidelineView } from '@types';

import { MergedGuidelinePanel } from './MergedGuidelinePanel';

/**
 * A theme with five NICE recommendations used to print "NICE 2014 —" at the start of every line, which
 * read as the same study quoted five times. The issuer is named once per group; a line repeats it only
 * when it differs from the line above, so a mixed group still shows who said what.
 */

const getMergedGuidelines = jest.fn();
jest.mock('@services/api', () => ({ api: { collaboration: { getMergedGuidelines: (...a: unknown[]) => getMergedGuidelines(...a) } } }));

const rec = (id: number, body: string, year: number, text: string) => ({
  id, sourceBody: body, sourceYear: year, sourceUrl: null, recommendationText: text,
  recommendationStrength: null, recommendationCertainty: null, population: null,
});

const view = (recommendations: ReturnType<typeof rec>[], bodies: string[]): MergedGuidelineView => ({
  topic: 'pneumonia', available: true, recommendationCount: recommendations.length, bodyCount: bodies.length,
  themes: [{ label: 'Referral and discharge', agreement: 'single', conflictNote: null, bodies, recommendations }],
});

describe('MergedGuidelinePanel attribution', () => {
  beforeEach(() => getMergedGuidelines.mockReset());

  test('one issuer for the whole group is named once, not on every recommendation', async () => {
    getMergedGuidelines.mockResolvedValue(view(
      [rec(1, 'NICE', 2014, 'Refer if not improving.'), rec(2, 'NICE', 2014, 'Consider referral for resistant bacteria.'), rec(3, 'NICE', 2014, 'Do not routinely discharge.')],
      ['NICE'],
    ));
    render(<MergedGuidelinePanel topic="pneumonia" />);
    await screen.findByText('Refer if not improving.');
    expect(screen.getAllByText(/NICE 2014/)).toHaveLength(1);
  });

  test('one issuer across different years is named once, with each year as a tag', async () => {
    getMergedGuidelines.mockResolvedValue(view(
      [rec(1, 'NICE', 2014, 'Offer an antibiotic.'), rec(2, 'NICE', 2026, 'Consider amoxicillin.'), rec(3, 'NICE', 2014, 'Offer a second antibiotic.')],
      ['NICE'],
    ));
    render(<MergedGuidelinePanel topic="pneumonia" />);
    await screen.findByText('Offer an antibiotic.');
    expect(screen.getAllByText(/^NICE/)).toHaveLength(1);
    expect(screen.getAllByText('2014')).toHaveLength(2);
    expect(screen.getAllByText('2026')).toHaveLength(1);
  });

  test('a group with several issuers names the issuer on every line, so none reads as unattributed', async () => {
    getMergedGuidelines.mockResolvedValue(view(
      [rec(1, 'NICE', 2014, 'First NICE line.'), rec(2, 'NICE', 2014, 'Second NICE line.'), rec(3, 'BTS', 2019, 'A BTS line.')],
      ['NICE', 'BTS'],
    ));
    render(<MergedGuidelinePanel topic="pneumonia" />);
    await screen.findByText('First NICE line.');
    expect(screen.getAllByText(/NICE 2014 —/)).toHaveLength(2);
    expect(screen.getAllByText(/BTS 2019 —/)).toHaveLength(1);
  });

  test('a recommendation about the other care setting is tagged, and one about the searched setting is not', async () => {
    getMergedGuidelines.mockResolvedValue(view(
      [rec(1, 'NICE', 2014, 'Start antibiotics for community-acquired pneumonia within 4 hours.'),
        rec(2, 'NICE', 2014, 'Start antibiotics for hospital-acquired pneumonia within 4 hours.'),
        rec(3, 'NICE', 2014, 'Offer an antibiotic to people with pneumonia.')],
      ['NICE'],
    ));
    render(<MergedGuidelinePanel topic="community-acquired pneumonia" />);
    await screen.findByText(/hospital-acquired pneumonia within 4 hours/);
    expect(screen.getAllByText('Hospital-acquired')).toHaveLength(1);
    expect(screen.queryByText('Community-acquired')).toBeNull();
  });

  test('searching the hospital setting tags the community recommendation instead', async () => {
    getMergedGuidelines.mockResolvedValue(view(
      [rec(1, 'NICE', 2014, 'Treat community-acquired pneumonia with amoxicillin.'), rec(2, 'NICE', 2014, 'Treat hospital-acquired pneumonia per local policy.')],
      ['NICE'],
    ));
    render(<MergedGuidelinePanel topic="hospital-acquired pneumonia" />);
    await screen.findByText(/amoxicillin/);
    expect(screen.getAllByText('Community-acquired')).toHaveLength(1);
    expect(screen.queryByText('Hospital-acquired')).toBeNull();
  });

  test('a single recommendation still names its issuer', async () => {
    getMergedGuidelines.mockResolvedValue(view([rec(1, 'NICE', 2014, 'Only line.')], ['NICE']));
    render(<MergedGuidelinePanel topic="pneumonia" />);
    await screen.findByText('Only line.');
    expect(screen.getAllByText(/NICE 2014/).length).toBeGreaterThanOrEqual(1);
  });
});
