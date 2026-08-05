import type { PrismaCounts } from '@types';

export type WorkspaceTab = 'screening' | 'data' | 'rob' | 'grade' | 'export';

export const EMPTY_PRISMA: PrismaCounts = { total: 0, pending: 0, included: 0, excluded: 0, maybe: 0 };
