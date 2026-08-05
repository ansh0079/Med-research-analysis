import type { TeamMember } from '@types';

export type MemberRow = TeamMember & { user_id?: string };

export type TeamTab = 'collections' | 'members' | 'assignments' | 'activity' | 'settings';

export type TeamAssignment = {
  id: string;
  title: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  createdBy: string;
};

export type ActivityEntry = {
  id: number;
  message: string;
  createdAt: string;
  userName: string | null;
};
