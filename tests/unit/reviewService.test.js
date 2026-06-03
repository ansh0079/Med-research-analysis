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

  test('formatReviewCsv escapes double quotes by doubling them', () => {
    const csv = formatReviewCsv([
      {
        article_id: 'PM2',
        article_data: { title: 'Say "hello" to evidence', pubdate: '2021', source: 'J Test' },
        extraction: { population: 'Adults "over 65"', intervention: 'Drug A', outcomes: [], confidence: 0.5 },
        screening_status: 'pending',
        exclusion_reason: '',
        confidence: 0.5,
      },
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain('"Say ""hello"" to evidence"');
    expect(row).toContain('"Adults ""over 65"""');
  });

  test('formatReviewCsv wraps commas inside values correctly', () => {
    const csv = formatReviewCsv([
      {
        article_id: 'PM3',
        article_data: { title: 'A, B, and C', pubdate: '2022', source: 'J Test' },
        extraction: { population: 'Group A, Group B', intervention: 'I', outcomes: ['x, y'], confidence: 0.8 },
        screening_status: 'included',
        exclusion_reason: 'Not relevant, outdated',
        confidence: 0.8,
      },
    ]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    const row = lines[1];
    // Values containing commas must be wrapped in quotes
    expect(row).toContain('"A, B, and C"');
    expect(row).toContain('"Group A, Group B"');
    expect(row).toContain('"x, y"');
    expect(row).toContain('"Not relevant, outdated"');
    // Verify we can reconstruct 14 fields by stripping quotes and splitting carefully
    const stripped = row.replace(/"[^"]*"/g, (m) => m.replace(/,/g, ''));
    const columns = stripped.split(',');
    expect(columns.length).toBe(14);
  });

  test('formatReviewCsv handles newlines inside values', () => {
    const csv = formatReviewCsv([
      {
        article_id: 'PM4',
        article_data: { title: 'Line 1\nLine 2', pubdate: '2023', source: 'J' },
        extraction: { population: 'P', intervention: 'I', outcomes: [], confidence: 0 },
        screening_status: 'excluded',
        exclusion_reason: 'Reason A\nReason B',
        confidence: 0,
      },
    ]);
    const lines = csv.split('\n');
    // Newlines inside quoted fields expand the raw line count, but the row must still parse correctly
    const rawRow = lines.slice(1).join('\n');
    expect(rawRow).toContain('"Line 1\nLine 2"');
    expect(rawRow).toContain('"Reason A\nReason B"');
  });

  test('formatReviewCsv handles null and undefined values', () => {
    const csv = formatReviewCsv([
      {
        article_id: 'PM5',
        article_data: {},
        extraction: {},
        screening_status: null,
        exclusion_reason: undefined,
        confidence: null,
      },
    ]);
    const row = csv.split('\n')[1];
    expect(row).toContain('""');
    expect(row).not.toContain('null');
    expect(row).not.toContain('undefined');
  });
});
