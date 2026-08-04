'use strict';

const {
    loadClinicalQueryAliasRules,
    loadAllClinicalQueryAliasRules,
    pinnedPmidsForQuery,
} = require('../../server/services/clinicalQueryAliasSeeds');
const {
    CLINICAL_QUERY_ALIAS_RULES,
    ALL_CLINICAL_QUERY_ALIAS_RULES,
    clinicalQueryPinnedPmids,
} = require('../../server/services/unifiedEvidenceSearch');

describe('clinicalQueryAliasRules JSON', () => {
    test('loads curated rules from JSON with compiled regexes', () => {
        const rules = loadClinicalQueryAliasRules();
        expect(rules.length).toBeGreaterThanOrEqual(40);
        expect(rules[0].all[0]).toBeInstanceOf(RegExp);
        expect(CLINICAL_QUERY_ALIAS_RULES.length).toBe(rules.length);
    });

    test('merged rules still pin DAPA-HF / PARADIGM landmarks', () => {
        const all = loadAllClinicalQueryAliasRules();
        expect(all.length).toBe(ALL_CLINICAL_QUERY_ALIAS_RULES.length);
        const dapa = pinnedPmidsForQuery(
            all,
            'SGLT2 inhibitors heart failure reduced ejection fraction randomized trial'
        );
        expect(dapa).toEqual(expect.arrayContaining(['31535829', '32865377']));
        expect(clinicalQueryPinnedPmids(
            'sacubitril valsartan heart failure reduced ejection fraction mortality'
        )).toEqual(expect.arrayContaining(['25176015']));
    });
});
