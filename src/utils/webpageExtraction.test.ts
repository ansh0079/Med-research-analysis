import {
  buildSearchQueryFromWebpage,
  detectMedicalSignals,
  normalizeWebpageExtractionPayload,
  summarizeWebpageText,
} from './webpageExtraction';

describe('webpageExtraction', () => {
  test('normalizes pasted page data and derives clinical metadata', () => {
    const payload = normalizeWebpageExtractionPayload({
      url: 'https://example.org/ards-trial',
      title: 'ARDS ventilation trial',
      text: 'Randomized trial of ventilation therapy in patients with ARDS. Mortality was the primary outcome with hazard ratio 0.82.',
      safetySignals: { hasForms: true, hasPasswordField: false, hasPaymentField: false, externalLinkCount: 3 },
    });

    expect(payload.wordCount).toBeGreaterThan(10);
    expect(payload.keywords).toContain('ventilation');
    expect(payload.medicalSignals).toEqual(expect.arrayContaining(['study design', 'population', 'outcomes', 'statistics']));
    expect(payload.safetySignals.externalLinkCount).toBe(3);
  });

  test('buildSearchQueryFromWebpage combines title, keywords, and evidence terms', () => {
    const query = buildSearchQueryFromWebpage({
      title: 'Early anticoagulation in pulmonary embolism',
      keywords: ['anticoagulation', 'embolism', 'bleeding'],
      medicalSignals: ['study design'],
      text: 'Randomized trial with bleeding and mortality outcomes.',
    });

    expect(query).toContain('anticoagulation');
    expect(query).toContain('embolism');
    expect(query).toContain('systematic review');
  });

  test('detectMedicalSignals and summarizeWebpageText stay conservative', () => {
    expect(detectMedicalSignals('A guideline recommendation reports relative risk and adverse events.')).toEqual(
      expect.arrayContaining(['guideline signal', 'statistics', 'outcomes'])
    );
    expect(summarizeWebpageText('Short. This sentence is long enough to be considered meaningful for a concise webpage summary.')).toContain('meaningful');
  });
});
