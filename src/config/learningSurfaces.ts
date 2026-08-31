/**
 * Canonical map of learning-related routes. Use for nav grouping and maintenance docs.
 * Overlapping backend services are documented in docs/SURFACE_MAP.md.
 */

export type LearningSurfaceGroup = 'learn' | 'practice' | 'clinical' | 'workspace';

export interface LearningSurface {
  id: string;
  route: string;
  label: string;
  icon: string;
  color: string;
  group: LearningSurfaceGroup;
  description: string;
  /** Primary user-facing entry for this capability */
  primary?: boolean;
}

export const LEARNING_SURFACE_GROUPS: Record<LearningSurfaceGroup, { label: string }> = {
  learn: { label: 'Learn & progress' },
  practice: { label: 'Practice' },
  clinical: { label: 'Clinical reasoning' },
  workspace: { label: 'Workspace' },
};

export const LEARNING_SURFACES: LearningSurface[] = [
  {
    id: 'learning-dashboard',
    route: '/learning',
    label: 'Learning hub',
    icon: 'fa-graduation-cap',
    color: 'text-indigo-500',
    group: 'learn',
    description: 'Topic mastery, study runs, CPD, and due reviews',
    primary: true,
  },
  {
    id: 'study-paths',
    route: '/study-paths',
    label: 'Study paths',
    icon: 'fa-route',
    color: 'text-rose-500',
    group: 'learn',
    description: 'Curriculum-aligned learning sequences',
  },
  {
    id: 'quiz',
    route: '/quiz',
    label: 'Topic quiz',
    icon: 'fa-brain',
    color: 'text-violet-500',
    group: 'practice',
    description: 'Generate MCQs from a topic or paper set',
    primary: true,
  },
  {
    id: 'practice-pool',
    route: '/practice',
    label: 'Practice pool',
    icon: 'fa-layer-group',
    color: 'text-teal-500',
    group: 'practice',
    description: 'Spaced-repetition and pooled MCQs',
  },
  {
    id: 'adaptive-case',
    route: '/cases',
    label: 'Adaptive cases',
    icon: 'fa-heartbeat',
    color: 'text-rose-500',
    group: 'clinical',
    description: 'Multi-turn adaptive clinical scenarios',
    primary: true,
  },
  {
    id: 'case-analysis',
    route: '/case',
    label: 'Case analysis',
    icon: 'fa-stethoscope',
    color: 'text-emerald-500',
    group: 'clinical',
    description: 'Single-case evidence brief and CONSORT-style review',
  },
];

export const WORKSPACE_TOOLS = [
  { route: '/grant', label: 'Grant writing', icon: 'fa-file-alt', color: 'text-amber-500' },
  { route: '/saved', label: 'Saved articles', icon: 'fa-bookmark', color: 'text-indigo-500' },
  { route: '/team', label: 'Team workspace', icon: 'fa-users', color: 'text-sky-500' },
  { route: '/guidelines', label: 'Guidelines', icon: 'fa-book-medical', color: 'text-slate-500' },
] as const;

/**
 * Surfaces promoted to the always-visible primary nav rather than the Tools menu.
 *
 * Study paths leads: it is the curriculum browser, and the topic journey it opens
 * (current guidelines and papers -> synopsis -> grounded MCQs) is the product.
 * Quiz and cases follow as the practice surfaces. All three were behind a Tools
 * dropdown while engagement with 11k+ seeded MCQs sat at zero.
 *
 * `learning-dashboard` is deliberately excluded: the Dashboard nav item already
 * occupies that slot.
 */
export const PROMOTED_SURFACE_IDS: readonly string[] = ['study-paths', 'quiz', 'adaptive-case'];

/** Surfaces shown as top-level nav items, in PROMOTED_SURFACE_IDS order. */
export function promotedSurfaces(): LearningSurface[] {
  return PROMOTED_SURFACE_IDS
    .map((id) => LEARNING_SURFACES.find((s) => s.id === id))
    .filter((s): s is LearningSurface => Boolean(s));
}

/**
 * Learning surfaces grouped for the Tools menu.
 * Pass `excludePromoted` so surfaces already in the primary nav are not listed twice.
 */
export function learningSurfacesByGroup(
  options: { excludePromoted?: boolean } = {},
): Array<{ group: LearningSurfaceGroup; label: string; surfaces: LearningSurface[] }> {
  const omit = options.excludePromoted ? new Set(PROMOTED_SURFACE_IDS) : new Set<string>();
  return (Object.keys(LEARNING_SURFACE_GROUPS) as LearningSurfaceGroup[]).map((group) => ({
    group,
    label: LEARNING_SURFACE_GROUPS[group].label,
    surfaces: LEARNING_SURFACES.filter((s) => s.group === group && !omit.has(s.id)),
  })).filter((row) => row.surfaces.length > 0);
}
