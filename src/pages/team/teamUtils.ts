import type { MemberRow } from './types';

export function memberUserId(m: MemberRow): string {
  return String(m.user_id || m.id);
}
