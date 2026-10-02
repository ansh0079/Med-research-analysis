import type { DataSource, EvidenceLaneKey, SearchFilters } from '@types';
import type { ResultLens, ResultSort } from '@hooks/useResultsFilter';

export type SearchWorkspaceTab = 'evidence' | 'guidelines' | 'learn';

export interface SearchWorkspaceUrlState {
  query: string;
  tab: SearchWorkspaceTab;
  lens: ResultLens;
  lane: EvidenceLaneKey | 'all';
  sort: ResultSort;
  resultFilter: string;
  filters: SearchFilters;
}

const TABS = new Set<SearchWorkspaceTab>(['evidence', 'guidelines', 'learn']);
const LENSES = new Set<ResultLens>(['all', 'open_access', 'high_quality', 'recent', 'practice_changing']);
const LANES = new Set<EvidenceLaneKey | 'all'>(['all', 'guidelines', 'landmark_trials', 'reviews', 'supporting']);
const SORTS = new Set<ResultSort>(['relevance', 'newest', 'citations', 'quality']);
const SOURCES = new Set<DataSource>(['pubmed', 'crossref', 'openalex']);

function member<T extends string>(value: string | null, values: Set<T>, fallback: T): T {
  return value && values.has(value as T) ? value as T : fallback;
}

export function parseSearchWorkspaceParams(params: URLSearchParams): SearchWorkspaceUrlState {
  const filters: SearchFilters = {};
  const specificity = params.get('specificity');
  if (specificity && ['experimental', 'broad', 'moderate', 'strict'].includes(specificity)) {
    filters.specificity = specificity as SearchFilters['specificity'];
  }
  const sources = (params.get('sources') || '').split(',').filter((source): source is DataSource => SOURCES.has(source as DataSource));
  if (sources.length) filters.sources = sources;
  const from = Number(params.get('from'));
  const to = Number(params.get('to'));
  if (Number.isInteger(from) && Number.isInteger(to) && from > 1900 && to >= from) filters.yearRange = [from, to];
  const studyTypes = params.getAll('study').filter(Boolean);
  if (studyTypes.length) filters.studyTypes = studyTypes;
  const vector = params.get('vector');
  if (vector === '0' || vector === '1') filters.useVectorSearch = vector === '1';

  return {
    query: params.get('q')?.trim() || '',
    tab: member(params.get('tab'), TABS, 'evidence'),
    lens: member(params.get('lens'), LENSES, 'all'),
    lane: member(params.get('lane'), LANES, 'all'),
    sort: member(params.get('sort'), SORTS, 'relevance'),
    resultFilter: params.get('filter') || '',
    filters,
  };
}

export function buildSearchWorkspaceParams(state: SearchWorkspaceUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query.trim()) params.set('q', state.query.trim());
  params.set('tab', state.tab);
  if (state.lens !== 'all') params.set('lens', state.lens);
  if (state.lane !== 'all') params.set('lane', state.lane);
  if (state.sort !== 'relevance') params.set('sort', state.sort);
  if (state.resultFilter.trim()) params.set('filter', state.resultFilter.trim());
  if (state.filters.specificity) params.set('specificity', state.filters.specificity);
  if (state.filters.sources?.length) params.set('sources', state.filters.sources.join(','));
  if (state.filters.yearRange) {
    params.set('from', String(state.filters.yearRange[0]));
    params.set('to', String(state.filters.yearRange[1]));
  }
  for (const study of state.filters.studyTypes || []) params.append('study', study);
  if (typeof state.filters.useVectorSearch === 'boolean') params.set('vector', state.filters.useVectorSearch ? '1' : '0');
  return params;
}

export function chooseDefaultWorkspaceTab(requested?: SearchWorkspaceTab): SearchWorkspaceTab {
  return requested ?? 'evidence';
}
