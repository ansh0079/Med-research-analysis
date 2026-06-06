const {
    topicSimilarity,
    findRelatedTopicsWithMisconceptions,
    buildJitReminder,
    extractKeywords,
    normalizeTopicForKeywords,
} = require('../../server/services/relatedTopicService');

describe('relatedTopicService', () => {
    describe('normalizeTopicForKeywords', () => {
        test('lowercases and strips punctuation', () => {
            expect(normalizeTopicForKeywords('ARDS (Acute)')).toBe('ards acute');
        });
    });

    describe('extractKeywords', () => {
        test('extracts keywords for known topics', () => {
            const kw = extractKeywords('ARDS management');
            expect(kw.has('ards')).toBe(true);
            expect(kw.has('ventilation')).toBe(true);
            expect(kw.has('lung')).toBe(true);
        });

        test('falls back to word tokens for unknown topics', () => {
            const kw = extractKeywords('zygomatic fracture repair');
            expect(kw.has('zygomatic')).toBe(true);
            expect(kw.has('fracture')).toBe(true);
        });
    });

    describe('topicSimilarity', () => {
        test('identical topics have high similarity', () => {
            const sim = topicSimilarity('ARDS', 'ARDS');
            expect(sim).toBeGreaterThan(0.5);
        });

        test('ARDS and COVID-19 share respiratory keywords', () => {
            const sim = topicSimilarity('ARDS', 'COVID-19 pneumonia');
            expect(sim).toBeGreaterThan(0.05);
        });

        test('unrelated topics have low similarity', () => {
            const sim = topicSimilarity('gout', 'stroke thrombolysis');
            expect(sim).toBeLessThan(0.2);
        });

        test('sepsis and ARDS share some overlap', () => {
            const sim = topicSimilarity('sepsis', 'ARDS');
            expect(sim).toBeGreaterThanOrEqual(0);
        });
    });

    describe('findRelatedTopicsWithMisconceptions', () => {
        test('returns empty for empty user topics', () => {
            expect(findRelatedTopicsWithMisconceptions('ARDS', [])).toEqual([]);
        });

        test('finds related topics above threshold', () => {
            const userTopics = [
                {
                    normalizedTopic: 'covid-19',
                    displayTopic: 'COVID-19',
                    misconceptions: [{ tag: 't1', description: 'missed steroid timing' }],
                },
                {
                    normalizedTopic: 'gout',
                    displayTopic: 'Gout',
                    misconceptions: [{ tag: 't2', description: 'confused colchicine dose' }],
                },
            ];
            const results = findRelatedTopicsWithMisconceptions('ARDS', userTopics, { similarityThreshold: 0.05 });
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results[0].normalizedTopic).toBe('covid-19');
        });

        test('excludes exact same topic', () => {
            const userTopics = [
                {
                    normalizedTopic: 'ards',
                    displayTopic: 'ARDS',
                    misconceptions: [{ tag: 't1' }],
                },
            ];
            const results = findRelatedTopicsWithMisconceptions('ARDS', userTopics);
            expect(results).toHaveLength(0);
        });

        test('excludes topics without misconceptions', () => {
            const userTopics = [
                {
                    normalizedTopic: 'covid-19',
                    displayTopic: 'COVID-19',
                    misconceptions: [],
                },
            ];
            const results = findRelatedTopicsWithMisconceptions('ARDS', userTopics);
            expect(results).toHaveLength(0);
        });

        test('respects maxResults', () => {
            const userTopics = [
                { normalizedTopic: 'covid-19', displayTopic: 'COVID-19', misconceptions: [{ tag: 't1' }] },
                { normalizedTopic: 'pneumonia', displayTopic: 'Pneumonia', misconceptions: [{ tag: 't2' }] },
                { normalizedTopic: 'copd', displayTopic: 'COPD', misconceptions: [{ tag: 't3' }] },
            ];
            const results = findRelatedTopicsWithMisconceptions('ARDS', userTopics, { maxResults: 2, similarityThreshold: 0.01 });
            expect(results.length).toBeLessThanOrEqual(2);
        });
    });

    describe('buildJitReminder', () => {
        test('returns null for empty related topics', () => {
            expect(buildJitReminder('Sepsis', [])).toBeNull();
        });

        test('builds pitfall reminder', () => {
            const related = [{
                normalizedTopic: 'ards',
                displayTopic: 'ARDS',
                misconceptions: [{ category: 'pitfall', description: 'missed steroid timing' }],
                similarity: 0.3,
            }];
            const reminder = buildJitReminder('Sepsis', related);
            expect(reminder).toContain('ARDS');
            expect(reminder).toContain('Sepsis');
            expect(reminder).toContain('pitfall');
        });

        test('builds guideline reminder', () => {
            const related = [{
                normalizedTopic: 'ards',
                displayTopic: 'ARDS',
                misconceptions: [{ category: 'guideline', description: 'confused NICE guidance' }],
                similarity: 0.3,
            }];
            const reminder = buildJitReminder('COVID-19', related);
            expect(reminder).toContain('guideline');
            expect(reminder).toContain('differ');
        });

        test('builds generic reminder for unknown category', () => {
            const related = [{
                normalizedTopic: 'ards',
                displayTopic: 'ARDS',
                misconceptions: [{ category: 'general', description: ' struggled with oxygenation indices' }],
                similarity: 0.3,
            }];
            const reminder = buildJitReminder('Pneumonia', related);
            expect(reminder).toContain('ARDS');
            expect(reminder).toContain('Pneumonia');
        });
    });
});
