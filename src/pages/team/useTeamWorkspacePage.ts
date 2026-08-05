import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import type { Team, TeamMember, TeamCollection, Article } from '@types';
import type { ActivityEntry, MemberRow, TeamAssignment, TeamTab } from './types';
import { memberUserId } from './teamUtils';

export function useTeamWorkspacePage() {
  const { setCurrentPage } = useSearchContext();
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [collections, setCollections] = useState<TeamCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TeamTab>('collections');
  const [inviteEmail, setInviteEmail] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [userRole, setUserRole] = useState<string>('member');
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
  const [collectionArticles, setCollectionArticles] = useState<Article[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [teamRename, setTeamRename] = useState('');
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentMember, setAssignmentMember] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const loadTeamActivity = useCallback(async (teamId: string) => {
    setActivityLoading(true);
    try {
      const rows = await api.collaboration.getTeamActivity(teamId);
      setActivityFeed(rows);
    } catch {
      // Best-effort — don't surface as an error banner.
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadAssignments = useCallback(async (teamId: string) => {
    setAssignmentsLoading(true);
    try {
      const rows = await api.collaboration.getTeamAssignments(teamId);
      setAssignments(rows);
    } catch {
      // Best-effort.
    } finally {
      setAssignmentsLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const { teams: data } = await api.collaboration.getTeams();
      setTeams(data);
      setActiveTeam((prev) => {
        if (data.length === 0) return null;
        if (prev && data.some((t) => t.id === prev.id)) return prev;
        return data[0];
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    }
  }, []);

  const loadTeamDetails = useCallback(async (teamId: string) => {
    try {
      const { team, members: m, role } = await api.collaboration.getTeam(teamId);
      setActiveTeam(team);
      setMembers(m);
      setUserRole(role);
      const { collections: c } = await api.collaboration.getTeamCollections(teamId);
      setCollections(c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load team details');
    }
  }, []);

  useEffect(() => {
    if (!activeTeam?.name) return;
    setTeamRename(activeTeam.name);
  }, [activeTeam?.id, activeTeam?.name]);

  useEffect(() => {
    if (!inviteToken || !isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.collaboration.acceptInvitation(inviteToken);
        if (cancelled) return;
        setSearchParams({}, { replace: true });
        setError(null);
        await loadTeams();
        if (r.teamId) {
          await loadTeamDetails(r.teamId);
          loadTeamActivity(r.teamId);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invalid or expired invitation');
          setSearchParams({}, { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [inviteToken, isAuthenticated, setSearchParams, loadTeams, loadTeamDetails, loadTeamActivity]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPage('auth');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadTeams();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, loadTeams, setCurrentPage]);

  useEffect(() => {
    if (!activeTeam?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { team, members: m, role } = await api.collaboration.getTeam(activeTeam.id);
        if (cancelled) return;
        setActiveTeam(team);
        setMembers(m);
        setUserRole(role);
        const { collections: c } = await api.collaboration.getTeamCollections(activeTeam.id);
        if (!cancelled) setCollections(c);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load team details');
      }
    })();
    loadTeamActivity(activeTeam.id);
    loadAssignments(activeTeam.id);
    return () => { cancelled = true; };
  }, [activeTeam?.id, loadTeamActivity, loadAssignments]);

  useEffect(() => {
    setExpandedCollectionId(null);
    setCollectionArticles([]);
  }, [activeTeam?.id]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const { team } = await api.collaboration.createTeam(newTeamName.trim());
      setTeams(prev => [...prev, team]);
      setActiveTeam(team);
      setNewTeamName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    }
  };

  const handleInvite = async () => {
    if (!activeTeam || !inviteEmail.trim()) return;
    try {
      const res = await api.collaboration.inviteTeamMember(activeTeam.id, inviteEmail.trim());
      const token = res.invitation?.token;
      if (token && typeof window !== 'undefined') {
        setLastInviteLink(`${window.location.origin}/team?invite=${encodeURIComponent(token)}`);
      }
      setInviteEmail('');
      loadTeamActivity(activeTeam.id);
      loadTeamDetails(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  };

  const openCollection = async (collectionId: string) => {
    if (!activeTeam) return;
    if (expandedCollectionId === collectionId) {
      setExpandedCollectionId(null);
      setCollectionArticles([]);
      return;
    }
    setExpandedCollectionId(collectionId);
    setCollectionLoading(true);
    try {
      const { collection } = await api.collaboration.getTeamCollection(activeTeam.id, collectionId);
      setCollectionArticles((collection.articles as Article[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load collection');
      setCollectionArticles([]);
    } finally {
      setCollectionLoading(false);
    }
  };

  const removeFromCollection = async (articleId: string) => {
    if (!activeTeam || !expandedCollectionId) return;
    try {
      await api.collaboration.removeArticleFromTeamCollection(activeTeam.id, expandedCollectionId, articleId);
      const { collection } = await api.collaboration.getTeamCollection(activeTeam.id, expandedCollectionId);
      setCollectionArticles((collection.articles as Article[]) || []);
      loadTeamDetails(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove article');
    }
  };

  const handleRemoveMember = async (row: MemberRow) => {
    if (!activeTeam) return;
    const uid = memberUserId(row);
    if (user?.id === uid) return;
    if (!window.confirm(`Remove ${row.email} from this team?`)) return;
    try {
      await api.collaboration.removeTeamMember(activeTeam.id, uid);
      loadTeamDetails(activeTeam.id);
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleMemberRoleChange = async (row: MemberRow, role: 'member' | 'admin') => {
    if (!activeTeam || row.role === 'owner') return;
    const uid = memberUserId(row);
    try {
      await api.collaboration.updateTeamMemberRole(activeTeam.id, uid, role);
      loadTeamDetails(activeTeam.id);
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleCreateCollection = async () => {
    if (!activeTeam || !newCollectionName.trim()) return;
    try {
      await api.collaboration.createTeamCollection(activeTeam.id, newCollectionName.trim());
      setNewCollectionName('');
      loadTeamDetails(activeTeam.id);
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    }
  };

  const handleCreateAssignment = async () => {
    if (!activeTeam || !assignmentTitle.trim()) return;
    try {
      await api.collaboration.createTeamAssignment(activeTeam.id, {
        title: assignmentTitle.trim(),
        assigneeUserId: assignmentMember || undefined,
        dueDate: assignmentDue || undefined,
      });
      setAssignmentTitle('');
      setAssignmentMember('');
      setAssignmentDue('');
      loadAssignments(activeTeam.id);
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!activeTeam) return;
    try {
      await api.collaboration.deleteTeamAssignment(activeTeam.id, assignmentId);
      loadAssignments(activeTeam.id);
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  };

  const handleRenameTeam = async () => {
    if (!activeTeam || !teamRename.trim() || teamRename.trim() === activeTeam.name) return;
    try {
      await api.collaboration.updateTeam(activeTeam.id, { name: teamRename.trim() });
      loadTeamDetails(activeTeam.id);
      loadTeams();
      loadTeamActivity(activeTeam.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename team');
    }
  };

  const handlePlanChange = async (plan: string) => {
    if (!activeTeam) return;
    await api.collaboration.updateTeam(activeTeam.id, { plan });
    loadTeamDetails(activeTeam.id);
  };

  return {
    isAuthenticated,
    user,
    setCurrentPage,
    teams,
    activeTeam,
    setActiveTeam,
    members,
    collections,
    loading,
    error,
    tab,
    setTab,
    inviteEmail,
    setInviteEmail,
    newTeamName,
    setNewTeamName,
    newCollectionName,
    setNewCollectionName,
    userRole,
    lastInviteLink,
    expandedCollectionId,
    collectionArticles,
    collectionLoading,
    teamRename,
    setTeamRename,
    assignmentTitle,
    setAssignmentTitle,
    assignmentMember,
    setAssignmentMember,
    assignmentDue,
    setAssignmentDue,
    assignments,
    assignmentsLoading,
    activityFeed,
    activityLoading,
    handleCreateTeam,
    handleInvite,
    openCollection,
    removeFromCollection,
    handleRemoveMember,
    handleMemberRoleChange,
    handleCreateCollection,
    handleCreateAssignment,
    handleDeleteAssignment,
    handleRenameTeam,
    handlePlanChange,
  };
}
