// ==========================================
// Unit Tests for GROBID TEI XML Parser
// ==========================================

const { parseGrobidXml, resolveSectionKey } = require('../../server/services/grobidXmlParser');

// Minimal valid GROBID-style TEI XML fixture
const SAMPLE_TEI = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xml:lang="en">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>Sample Paper</title></titleStmt>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="abstract">
        <head>Abstract</head>
        <p>This is the abstract text.</p>
      </div>
      <div type="introduction">
        <head>Introduction</head>
        <p>Background info here.</p>
      </div>
      <div type="materials|methods">
        <head>Methods</head>
        <p>We did a study.</p>
      </div>
      <div type="results">
        <head>Results</head>
        <p>Significant findings were observed.</p>
      </div>
      <div type="discussion">
        <head>Discussion</head>
        <p>These results imply important things.</p>
      </div>
      <div type="conclusion">
        <head>Conclusion</head>
        <p>In summary, we found something.</p>
      </div>
      <div type="references">
        <head>References</head>
        <listBibl>
          <biblStruct><analytic><title>Ref 1</title></analytic></biblStruct>
        </listBibl>
      </div>
    </body>
  </text>
</TEI>`;

const TEI_WITH_TABLES = `<?xml version="1.0" encoding="UTF-8"?>
<TEI xml:lang="en">
  <text>
    <body>
      <div type="results">
        <head>Results</head>
        <p>See Table 1.</p>
        <figure type="table">
          <head>Table 1: Baseline characteristics</head>
          <table>
            <row><cell>Group</cell><cell>N</cell><cell>Age</cell></row>
            <row><cell>Control</cell><cell>50</cell><cell>45.2</cell></row>
            <row><cell>Treatment</cell><cell>52</cell><cell>46.1</cell></row>
          </table>
        </figure>
      </div>
    </body>
  </text>
</TEI>`;

describe('parseGrobidXml', () => {
    it('returns empty result for null/empty input', () => {
        const r = parseGrobidXml('');
        expect(r.sections).toEqual({});
        expect(r.orderedKeys).toEqual([]);
        expect(r.tables).toEqual([]);
        expect(r.wordCount).toBe(0);
    });

    it('parses standard sections correctly', () => {
        const r = parseGrobidXml(SAMPLE_TEI);
        expect(r.orderedKeys).toEqual([
            'abstract',
            'introduction',
            'methods',
            'results',
            'discussion',
            'conclusion',
        ]);
        expect(r.sections.abstract).toContain('This is the abstract text.');
        expect(r.sections.methods).toContain('We did a study.');
        expect(r.sections.results).toContain('Significant findings were observed.');
    });

    it('excludes references from orderedKeys', () => {
        const r = parseGrobidXml(SAMPLE_TEI);
        expect(r.orderedKeys).not.toContain('references');
        expect(r.sections.references).toBeUndefined();
    });

    it('counts words across all body text', () => {
        const r = parseGrobidXml(SAMPLE_TEI);
        expect(r.wordCount).toBeGreaterThan(10);
    });

    it('extracts tables from figure elements', () => {
        const r = parseGrobidXml(TEI_WITH_TABLES);
        expect(r.tables.length).toBe(1);
        const tbl = r.tables[0];
        expect(tbl.heading).toBe('Table 1: Baseline characteristics');
        expect(tbl.rows.length).toBe(3); // header + 2 data rows
        expect(tbl.rows[0]).toEqual(['Group', 'N', 'Age']);
        expect(tbl.rows[1]).toEqual(['Control', '50', '45.2']);
        expect(tbl.rawText).toContain('Control');
    });

    it('handles XML without a body gracefully', () => {
        const r = parseGrobidXml('<TEI><teiHeader></teiHeader></TEI>');
        expect(r.sections).toEqual({});
        expect(r.tables).toEqual([]);
        expect(r.wordCount).toBe(0);
    });

    it('handles malformed XML gracefully', () => {
        const r = parseGrobidXml('not xml at all <<<');
        expect(r.sections).toEqual({});
        expect(r.tables).toEqual([]);
        expect(r.wordCount).toBe(0);
    });

    it('maps non-standard div types via head text', () => {
        const tei = `<?xml version="1.0" encoding="UTF-8"?>
<TEI><text><body>
  <div type="other">
    <head>Material and Participants</head>
    <p>Recruitment details.</p>
  </div>
</body></text></TEI>`;
        const r = parseGrobidXml(tei);
        expect(r.orderedKeys).toContain('methods');
        expect(r.sections.methods).toContain('Recruitment details.');
    });
});

describe('resolveSectionKey', () => {
    it('maps known GROBID div types', () => {
        expect(resolveSectionKey({ '@_type': 'abstract' })).toBe('abstract');
        expect(resolveSectionKey({ '@_type': 'materials|methods' })).toBe('methods');
        expect(resolveSectionKey({ '@_type': 'results' })).toBe('results');
        expect(resolveSectionKey({ '@_type': 'discussion' })).toBe('discussion');
        expect(resolveSectionKey({ '@_type': 'conclusion' })).toBe('conclusion');
    });

    it('falls back to head text for unknown types', () => {
        expect(resolveSectionKey({ '@_type': 'other', head: 'Methods' })).toBe('methods');
        expect(resolveSectionKey({ '@_type': 'other', head: 'Results and Discussion' })).toBe('results');
    });

    it('returns null for completely unrecognised divisions', () => {
        expect(resolveSectionKey({ '@_type': 'other', head: 'Appendix' })).toBeNull();
    });
});
