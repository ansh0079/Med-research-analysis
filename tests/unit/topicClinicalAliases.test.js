'use strict';

const { extractClinicalAliasesList, buildTopicKnowledgeAliasesJson } = require('../../server/utils/topicClinicalAliases');

describe('topicClinicalAliases', () => {
    test('extracts base condition, acronym, and sub-clauses from compound title with colons', () => {
        const topic = 'Amyotrophic Lateral Sclerosis (ALS): El Escorial criteria, riluzole, non-invasive ventilation';
        const aliases = extractClinicalAliasesList(topic);

        expect(aliases).toContain('amyotrophic lateral sclerosis');
        expect(aliases).toContain('als');
        expect(aliases).toContain('el escorial criteria');
        expect(aliases).toContain('riluzole');
        expect(aliases).toContain('non-invasive ventilation');
    });

    test('extracts acronym and condition without colons', () => {
        const topic = 'Diabetic ketoacidosis DKA: fluid protocols, insulin infusion, potassium replacement';
        const aliases = extractClinicalAliasesList(topic);

        expect(aliases).toContain('diabetic ketoacidosis');
        expect(aliases).toContain('dka');
        expect(aliases).toContain('fluid protocols');
    });

    test('extracts condition from treatment phrase without colon', () => {
        const topic = 'Alcohol withdrawal benzodiazepine treatment';
        const aliases = extractClinicalAliasesList(topic);

        expect(aliases).toContain('alcohol withdrawal');
    });

    test('buildTopicKnowledgeAliasesJson returns valid JSON array', () => {
        const json = buildTopicKnowledgeAliasesJson('Bacterial meningitis: empirical antibiotics');
        const parsed = JSON.parse(json);

        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toContain('bacterial meningitis');
        expect(parsed).toContain('empirical antibiotics');
    });
});
