/**
 * Smart Query Parsing Service
 * Handles medical specialty detection and structured PubMed query construction.
 */

export type Specificity = 'experimental' | 'broad' | 'moderate' | 'strict';

export interface ParsedQuery {
  original: string;
  processedQuery: string;
  specificity: Specificity;
  isAdvanced: boolean;
  studyTypes: string[];
  yearFilters: string[];
  experimentalParams: Record<string, unknown>;
}

export class QueryParser {
  private meshTerms: Record<string, string> = {
    'randomized controlled trial': '"Randomized Controlled Trial"[Publication Type]',
    'systematic review': '"Systematic Review"[Publication Type]',
    'meta-analysis': '"Meta-Analysis"[Publication Type]',
    'clinical trial': '"Clinical Trial"[Publication Type]',
    review: '"Review"[Publication Type]',
    'case report': '"Case Reports"[Publication Type]',
    'practice guideline': '"Practice Guidelines as Topic"[MeSH Terms]',
    'cohort study': '"Cohort Studies"[MeSH Terms]',
    'cross-sectional': '"Cross-Sectional Studies"[MeSH Terms]'
  };

  parse(query: string, specificity: Specificity = 'strict'): ParsedQuery {
    const lowerQuery = query.toLowerCase().trim();
    const parsed: ParsedQuery = {
      original: query,
      processedQuery: query,
      specificity,
      isAdvanced: false,
      studyTypes: [],
      yearFilters: [],
      experimentalParams: specificity === 'experimental' ? this.generateExperimentalParams(query) : {}
    };

    const phraseMatches = query.match(/"([^"]+)"/g);
    if (phraseMatches) parsed.isAdvanced = true;

    const yearRangeMatch = query.match(/(\d{4})\s*-\s*(\d{4})/);
    if (yearRangeMatch) {
      parsed.yearFilters = [`${yearRangeMatch[1]}:${yearRangeMatch[2]}[PDAT]`];
      parsed.isAdvanced = true;
    }

    Object.entries(this.meshTerms).forEach(([term, meshQuery]) => {
      if (lowerQuery.includes(term)) {
        parsed.studyTypes.push(meshQuery);
        parsed.isAdvanced = true;
      }
    });

    parsed.processedQuery = this.buildPubMedQuery(parsed, specificity);
    return parsed;
  }

  private buildPubMedQuery(parsed: ParsedQuery, specificity: Specificity): string {
    const queryParts: string[] = [];
    let searchField = '[tiab]';

    if (specificity === 'moderate') searchField = '[title]';
    if (specificity === 'experimental') searchField = '';

    const baseQuery = parsed.original
      .replace(/"[^"]*"/g, '')
      .replace(/\b(find|search|get|articles|studies|research)\b/gi, '')
      .trim();

    if (baseQuery) {
      if (specificity === 'experimental') {
        queryParts.push(`(${this.getSynonyms(baseQuery).join(' OR ')})`);
      } else {
        queryParts.push(`(${baseQuery}${searchField})`);
      }
    }

    if (parsed.yearFilters.length > 0) queryParts.push(parsed.yearFilters[0]);
    if (parsed.studyTypes.length > 0) queryParts.push(`(${parsed.studyTypes.join(' OR ')})`);

    // Add human/english filters based on specificity
    if (specificity !== 'experimental') {
      queryParts.push('(english[lang])');
      if (specificity === 'strict') {
        queryParts.push('(humans[MeSH Terms]) NOT (case reports[Publication Type])');
      }
    }

    return queryParts.join(' AND ') || parsed.original;
  }

  private getSynonyms(term: string): string[] {
    const map: Record<string, string[]> = {
      'cancer': ['neoplasm', 'tumor', 'carcinoma'],
      'diabetes': ['diabetes mellitus', 'hyperglycemia'],
      'heart': ['cardiac', 'cardiovascular'],
      'stroke': ['CVA', 'cerebrovascular accident']
    };
    const results = [term];
    Object.entries(map).forEach(([key, values]) => {
      if (term.toLowerCase().includes(key)) results.push(...values);
    });
    return [...new Set(results)];
  }

  private generateExperimentalParams(_query: string): Record<string, unknown> {
    return { useSynonyms: true, fuzzyMatching: true, maxResults: 100 };
  }
}

export const queryParser = new QueryParser();