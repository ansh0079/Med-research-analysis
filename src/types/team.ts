export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  memberLimit: number;
  memberCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamCollection {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  articleCount: number;
  createdAt: string;
  createdBy: string;
}
