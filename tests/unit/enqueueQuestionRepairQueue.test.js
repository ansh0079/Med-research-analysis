'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    parseAuditCsv,
    classifyEvidenceKind,
    EVIDENCE_KIND,
} = require('../../server/scripts/enqueueQuestionRepairQueue');

describe('enqueueQuestionRepairQueue helpers', () => {
    test('parseAuditCsv parses quoted CSV rows', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-csv-'));
        const csv = path.join(dir, 'audit.csv');
        fs.writeFileSync(csv, [
            'question_uid,object_key,object_type,topic,verdict,reason,stem',
            '"uid#0","obj:1","cold_start_mcq","stroke topic","NEEDS_REPAIR","evidence_support_weak","A stem, with comma"',
            '"uid#1","obj:1","cold_start_mcq","stroke topic","GOOD","all_four_criteria_pass","Other stem"',
        ].join('\n'));
        const rows = parseAuditCsv(csv);
        expect(rows).toHaveLength(2);
        expect(rows[0].verdict).toBe('NEEDS_REPAIR');
        expect(rows[0].stem).toBe('A stem, with comma');
        expect(rows[1].verdict).toBe('GOOD');
    });

    test('classifyEvidenceKind maps reason + refs presence to kinds', () => {
        expect(classifyEvidenceKind('evidence_support_weak', false)).toBe(EVIDENCE_KIND.weak_no_refs);
        expect(classifyEvidenceKind('evidence_support_weak', true)).toBe(EVIDENCE_KIND.weak_with_refs);
        expect(classifyEvidenceKind('evidence_not_resolvable_in_app_db', false)).toBe(EVIDENCE_KIND.unresolvable_no_refs);
        expect(classifyEvidenceKind('evidence_not_resolvable_in_app_db', true)).toBe(EVIDENCE_KIND.unresolvable_with_refs);
    });
});
