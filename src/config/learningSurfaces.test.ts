import {
  LEARNING_SURFACES,
  PROMOTED_SURFACE_IDS,
  WORKSPACE_TOOLS,
  STAFF_TOOLS,
  promotedSurfaces,
  learningSurfacesByGroup,
} from './learningSurfaces';

describe('learning surface promotion', () => {
  it('promotes the core practice loops to the primary nav', () => {
    // Study paths opens the topic journey (guidelines + papers -> synopsis -> MCQs),
    // which is the product; quiz and cases are its practice surfaces. All three were
    // buried in the Tools dropdown while engagement sat at zero.
    expect(PROMOTED_SURFACE_IDS).toEqual(['study-paths', 'quiz', 'adaptive-case']);
  });

  it('resolves every promoted id to a real surface', () => {
    const promoted = promotedSurfaces();
    expect(promoted).toHaveLength(PROMOTED_SURFACE_IDS.length);
    expect(promoted.map((s) => s.id)).toEqual([...PROMOTED_SURFACE_IDS]);
    promoted.forEach((s) => expect(s.route).toMatch(/^\//));
  });

  it('omits promoted surfaces from the Tools menu so they are not listed twice', () => {
    const toolsIds = learningSurfacesByGroup({ excludePromoted: true })
      .flatMap((g) => g.surfaces.map((s) => s.id));
    PROMOTED_SURFACE_IDS.forEach((id) => expect(toolsIds).not.toContain(id));
  });

  it('still lists every surface when promotion is not excluded', () => {
    const allIds = learningSurfacesByGroup().flatMap((g) => g.surfaces.map((s) => s.id));
    expect(allIds.sort()).toEqual(LEARNING_SURFACES.map((s) => s.id).sort());
  });

  it('keeps promoted surfaces and Tools surfaces a complete partition', () => {
    const toolsIds = learningSurfacesByGroup({ excludePromoted: true })
      .flatMap((g) => g.surfaces.map((s) => s.id));
    expect([...toolsIds, ...PROMOTED_SURFACE_IDS].sort())
      .toEqual(LEARNING_SURFACES.map((s) => s.id).sort());
  });
});

describe('staff-only vs general-user tool routing', () => {
  // /knowledge and /guidelines call backend endpoints that require admin/curator
  // (server/routes/search/topicKnowledge.js, server/routes/guidelines.js). A
  // general-user route pointing at either previously let a signed-in non-staff
  // user see edit/approve buttons that silently 403'd.
  const STAFF_ONLY_ROUTES = ['/knowledge', '/guidelines'];

  it('keeps every staff-only route out of the general-user workspace tools', () => {
    const workspaceRoutes = WORKSPACE_TOOLS.map((t) => t.route);
    for (const route of STAFF_ONLY_ROUTES) {
      expect(workspaceRoutes).not.toContain(route);
    }
  });

  it('lists every staff-only route in STAFF_TOOLS', () => {
    const staffRoutes = STAFF_TOOLS.map((t) => t.route);
    for (const route of STAFF_ONLY_ROUTES) {
      expect(staffRoutes).toContain(route);
    }
  });

  it('points the general-user guideline link at the read-only browser, not the curator queue', () => {
    const guidelineEntry = WORKSPACE_TOOLS.find((t) => t.label.toLowerCase().includes('guideline'));
    expect(guidelineEntry?.route).toBe('/guideline-library');
  });
});
