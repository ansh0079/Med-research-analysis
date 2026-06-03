const {
  searchTrials,
  getTrial,
  normalizeTrial,
  parseStatus,
  parsePhase,
  parseDate,
} = require('../../server/services/clinicalTrialsService');

describe('clinicalTrialsService', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('parseStatus', () => {
    test('normalizes known statuses', () => {
      expect(parseStatus('RECRUITING')).toBe('recruiting');
      expect(parseStatus('Completed')).toBe('completed');
      expect(parseStatus('Terminated')).toBe('terminated');
      expect(parseStatus('Suspended')).toBe('suspended');
      expect(parseStatus('Withdrawn')).toBe('withdrawn');
    });

    test('returns unknown for unexpected status', () => {
      expect(parseStatus('')).toBe('unknown');
      expect(parseStatus('Something Else')).toBe('unknown');
    });
  });

  describe('parsePhase', () => {
    test('normalizes phase strings', () => {
      expect(parsePhase('Phase 1')).toBe('phase_1');
      expect(parsePhase('Phase 2')).toBe('phase_2');
      expect(parsePhase('Phase 3')).toBe('phase_3');
      expect(parsePhase('Phase 4')).toBe('phase_4');
      expect(parsePhase('Early Phase 1')).toBe('early_phase_1');
    });

    test('returns not_applicable for missing phase', () => {
      expect(parsePhase('')).toBe('not_applicable');
      expect(parsePhase('N/A')).toBe('not_applicable');
    });
  });

  describe('parseDate', () => {
    test('parses ISO date strings', () => {
      expect(parseDate('2023-05-15')).toBe('2023-05-15');
    });

    test('returns null for invalid dates', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('not-a-date')).toBeNull();
    });
  });

  describe('normalizeTrial', () => {
    test('maps a full ClinicalTrials.gov study to normalized shape', () => {
      const study = {
        protocolSection: {
          identificationModule: {
            nctId: 'NCT12345678',
            briefTitle: 'A Study of Drug X',
            officialTitle: 'A Randomized Controlled Trial of Drug X in Diabetes',
          },
          statusModule: {
            overallStatus: 'RECRUITING',
            startDateStruct: { date: '2023-01-15' },
            completionDateStruct: { date: '2025-06-30' },
          },
          designModule: {
            studyType: 'Interventional',
            phases: ['Phase 2'],
            enrollmentInfo: { count: 120 },
            armsInterventionsModule: {
              armGroups: [
                { label: 'Arm 1', type: 'Experimental', description: 'Drug X' },
              ],
              interventions: [
                { type: 'Drug', name: 'Drug X', description: '10 mg daily' },
              ],
            },
          },
          conditionsModule: {
            conditions: ['Type 2 Diabetes Mellitus'],
          },
          sponsorCollaboratorsModule: {
            leadSponsor: { name: 'University of Example' },
          },
          contactsLocationsModule: {
            centralContacts: [{ name: 'Dr. Smith', email: 'smith@example.edu' }],
            locations: [
              { facility: 'Example Hospital', city: 'Boston', country: 'United States' },
            ],
          },
          outcomesModule: {
            primaryOutcomes: [
              { measure: 'HbA1c reduction', timeFrame: '12 weeks' },
            ],
          },
          descriptionModule: {
            briefSummary: 'This study tests Drug X.',
            detailedDescription: 'A detailed description here.',
          },
        },
      };

      const trial = normalizeTrial(study);
      expect(trial).toMatchObject({
        nctId: 'NCT12345678',
        title: 'A Study of Drug X',
        officialTitle: 'A Randomized Controlled Trial of Drug X in Diabetes',
        status: 'recruiting',
        phase: 'phase_2',
        studyType: 'Interventional',
        condition: 'Type 2 Diabetes Mellitus',
        leadSponsor: 'University of Example',
        overallContact: 'Dr. Smith',
        overallContactEmail: 'smith@example.edu',
        locations: [{ facility: 'Example Hospital', city: 'Boston', country: 'United States' }],
        startDate: '2023-01-15',
        completionDate: '2025-06-30',
        enrollmentCount: 120,
        arms: [{ label: 'Arm 1', type: 'Experimental', description: 'Drug X' }],
        interventions: [{ type: 'Drug', name: 'Drug X', description: '10 mg daily' }],
        primaryOutcomes: [{ measure: 'HbA1c reduction', timeFrame: '12 weeks' }],
        briefSummary: 'This study tests Drug X.',
        detailedDescription: 'A detailed description here.',
        _source: 'clinicaltrials.gov',
      });
    });

    test('handles minimal study without crashing', () => {
      const trial = normalizeTrial({});
      expect(trial.nctId).toBeNull();
      expect(trial.title).toBe('');
      expect(trial.status).toBe('unknown');
      expect(trial.phase).toBe('not_applicable');
      expect(trial.enrollmentCount).toBe(0);
      expect(trial.locations).toEqual([]);
    });
  });

  describe('searchTrials', () => {
    test('returns normalized trials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          studies: [
            {
              protocolSection: {
                identificationModule: { nctId: 'NCT00000001', briefTitle: 'Trial One' },
                statusModule: { overallStatus: 'COMPLETED' },
                designModule: { studyType: 'Observational', phases: [] },
              },
            },
          ],
        }),
      });

      const trials = await searchTrials('diabetes', { pageSize: 10, fetchImpl: mockFetch });
      expect(trials).toHaveLength(1);
      expect(trials[0].nctId).toBe('NCT00000001');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query.term=diabetes'),
        expect.objectContaining({ timeout: 15000 })
      );
    });

    test('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
      await expect(searchTrials('diabetes', { fetchImpl: mockFetch })).rejects.toThrow('ClinicalTrials.gov 503');
    });
  });

  describe('getTrial', () => {
    test('returns a single normalized trial', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          protocolSection: {
            identificationModule: { nctId: 'NCT00000002', briefTitle: 'Trial Two' },
            statusModule: { overallStatus: 'RECRUITING' },
            designModule: { studyType: 'Interventional', phases: ['Phase 1'] },
          },
        }),
      });

      const trial = await getTrial('NCT00000002', { fetchImpl: mockFetch });
      expect(trial.nctId).toBe('NCT00000002');
      expect(trial.status).toBe('recruiting');
    });
  });
});
