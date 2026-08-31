import {
  LEARNING_SURFACES,
  PROMOTED_SURFACE_IDS,
  promotedSurfaces,
  learningSurfacesByGroup,
} from './learningSurfaces';

describe('learning surface promotion', () => {
  it('promotes the core practice loops to the primary nav', () => {
    // Quiz and cases were buried in the Tools dropdown, which is why engagement
    // with 11k+ seeded MCQs sat at zero. They must stay top-level.
    expect(PROMOTED_SURFACE_IDS).toEqual(['quiz', 'adaptive-case']);
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
