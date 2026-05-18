const {
  parseJsonBlock,
  normalizePicoExtraction,
  formatReviewCsv,
} = require('../../server/services/reviewService');

describe('reviewService helpers', () => {
  test('normalizePicoExtraction clamps confidence to [0,1]', () => {
    const high = normalizePicoExtraction({
      population: 'Adults',
      intervention: 'Drug A',
      outcomes: ['mortality'],
      confidence: 99,
    });
    expect(high.confidence).toBe(1);

    const low = normalizePicoExtraction({ confidence: -3 });
    expect(low.confidence).toBe(0);
  });

  test('normalizePicoExtraction maps outcomes from array', () => {
    const n = normalizePicoExtraction({
      population: 'P',
      intervention: 'I',
      comparison: 'C',
      outcomes: ['a', 'b'],
      studyDesign: 'rct',
      sampleSize: 'nope',
      followUp: '6 mo',
      missingFields: ['comparison'],
    });
    expect(n.outcomes).toEqual(['a', 'b']);
    expect(n.missingFields).toEqual(['comparison']);
    expect(n.sampleSize).toBe(0);
  });

  test('parseJsonBlock extracts first JSON object from surrounding text', () => {
    expect(parseJsonBlock('prefix {"population":"x"} suffix')?.population).toBe('x');
  });

  test('formatReviewCsv exposes stable header row', () => {
    const csv = formatReviewCsv([
      {
        article_id: 'PM1',
        article_data: { title: 'T', pubdate: '2020', source: 'J Test' },
        extraction: {
          population: 'p',
          intervention: 'i',
          comparison: 'c',
          outcomes: ['o1'],
          studyDesign: 'rct',
          sampleSize: 120,
          followUp: '1y',
          confidence: 0.7,
        },
        screening_status: 'included',
        exclusion_reason: '',
        confidence: 0.7,
      },
    ]);

    const header = csv.split('\n')[0];
    expect(header).toContain('article_id');
    expect(header).toContain('screening_status');
    expect(header).toContain('pico_confidence');
    expect(header).toContain('sample_size');
    expect(csv.split('\n')[1]).toMatch(/PM1/);
  });
});
