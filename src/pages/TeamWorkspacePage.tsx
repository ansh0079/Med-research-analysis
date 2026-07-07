import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchContext } from '@contexts/SearchContext';
import { useAuth } from '@contexts/AuthContext';
import { api } from '@services/api';
import { Button } from '@components/ui/Button';
import type { Team, TeamMember, TeamCollection, Article } from '@types';

type MemberRow = TeamMember & { user_id?: string };

function memberUserId(m: MemberRow): string {
  return String(m.user_id || m.id);
}

export const TeamWorkspacePage: React.FC = () => {
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
  const [tab, setTab] = useState<'collections' | 'members' | 'assignments' | 'activity' | 'settings'>('collections');
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
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; assigneeUserId: string | null; assigneeName: string | null; dueDate: string | null; status: string; createdAt: string; createdBy: string }>>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [activityFeed, setActivityFeed] = useState<Array<{ id: number; message: string; createdAt: string; userName: string | null }>>([]);
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Team Workspace</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Collaborate on research with your team</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCurrentPage('search')} leftIcon={<i className="fas fa-arrow-left" />}>
            Back to Search
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl text-sm">
            <i className="fas fa-exclamation-circle mr-2" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <i className="fas fa-spinner fa-spin text-3xl text-indigo-500" />
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-slate-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Your First Team</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Start collaborating by creating a team workspace for your research group.</p>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name (e.g., Oncology Research Group)"
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <Button variant="primary" onClick={handleCreateTeam} leftIcon={<i className="fas fa-plus" />}>
                Create Team
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Your Teams</h3>
                <div className="space-y-2">
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => setActiveTeam(team)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeTeam?.id === team.id
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{team.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{team.plan}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="New team name"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                  />
                  <Button variant="secondary" size="sm" className="w-full" onClick={handleCreateTeam} leftIcon={<i className="fas fa-plus" />}>
                    Create Team
                  </Button>
                </div>
              </div>
            </div>

            {/* Main */}
            <div className="lg:col-span-3 space-y-6">
              {activeTeam && (
                <>
                  {/* Team Header */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">{activeTeam.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {members.length} members • {activeTeam.plan} plan
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {(['collections', 'members', 'assignments', 'activity', 'settings'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                              tab === t
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Collections Tab */}
                  {tab === 'collections' && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          placeholder="New collection name"
                          className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <Button variant="primary" onClick={handleCreateCollection} leftIcon={<i className="fas fa-folder-plus" />}>
                          Create Collection
                        </Button>
                      </div>

                      {collections.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-slate-700">
                          <i className="fas fa-folder-open text-4xl text-gray-300 dark:text-gray-600 mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No collections yet. Create one to start sharing articles.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {collections.map(col => (
                            <div key={col.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => openCollection(col.id)}
                                className="w-full text-left p-5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{col.name}</h3>
                                    {col.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{col.description}</p>}
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                      {col.articleCount || 0} articles · {expandedCollectionId === col.id ? 'Hide' : 'View'} list
                                    </p>
                                  </div>
                                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center shrink-0">
                                    <i className={`fas fa-folder${expandedCollectionId === col.id ? '-open' : ''} text-indigo-500`} />
                                  </div>
                                </div>
                              </button>

                              {expandedCollectionId === col.id && (
                                <div className="border-t border-gray-100 dark:border-slate-700 px-5 py-4 bg-slate-50/80 dark:bg-slate-900/40">
                                  {collectionLoading ? (
                                    <p className="text-sm text-gray-500"><i className="fas fa-spinner fa-spin mr-2" />Loading…</p>
                                  ) : collectionArticles.length === 0 ? (
                                    <p className="text-sm text-gray-500">No articles yet. Add papers from search using the team save scope when that flow is enabled, or use the API.</p>
                                  ) : (
                                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                                      {collectionArticles.map((art) => (
                                        <li key={art.uid} className="flex items-start justify-between gap-2 text-sm">
                                          <span className="text-gray-800 dark:text-gray-200 line-clamp-2">{art.title || art.uid}</span>
                                          {(userRole === 'owner' || userRole === 'admin') && (
                                            <button
                                              type="button"
                                              onClick={() => removeFromCollection(art.uid)}
                                              className="text-red-600 dark:text-red-400 text-xs font-bold shrink-0"
                                            >
                                              Remove
                                            </button>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Members Tab */}
                  {tab === 'members' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 space-y-3">
                          <div className="flex gap-3">
                            <input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="colleague@university.edu"
                              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <Button variant="primary" onClick={handleInvite} leftIcon={<i className="fas fa-envelope" />}>
                              Invite
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            After inviting, copy the link below and send it by hospital email. The colleague must sign in (or create an account with the same email) before accepting.
                          </p>
                          {lastInviteLink && (
                            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 px-3 py-2 text-xs">
                              <span className="font-bold text-indigo-800 dark:text-indigo-200">Invitation link</span>
                              <input
                                readOnly
                                value={lastInviteLink}
                                className="mt-1 w-full px-2 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        {members.map((member) => {
                          const row = member as MemberRow;
                          const uid = memberUserId(row);
                          const isSelf = user?.id === uid;
                          return (
                            <div key={uid} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                                  <i className="fas fa-user text-gray-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{member.name || member.email}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {userRole === 'owner' && row.role !== 'owner' && (
                                  <select
                                    title="Member role"
                                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    value={row.role === 'admin' ? 'admin' : 'member'}
                                    onChange={(e) => handleMemberRoleChange(row, e.target.value as 'member' | 'admin')}
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                )}
                                {(userRole === 'owner' || userRole === 'admin') && row.role !== 'owner' && !isSelf && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(row)}
                                    className="text-xs font-bold text-red-600 dark:text-red-400 px-2 py-1"
                                  >
                                    Remove
                                  </button>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                  member.role === 'owner' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                                    : member.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                  {member.role}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {tab === 'assignments' && (
                    <div className="space-y-4">
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Create Assignment</h3>
                          <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.5fr_auto]">
                            <input
                              value={assignmentTitle}
                              onChange={(e) => setAssignmentTitle(e.target.value)}
                              placeholder="Paper, collection, or screening task"
                              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <select
                              title="Assign reviewer"
                              value={assignmentMember}
                              onChange={(e) => setAssignmentMember(e.target.value)}
                              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">Unassigned</option>
                              {members.map((member) => (
                                <option key={memberUserId(member as MemberRow)} value={memberUserId(member as MemberRow)}>
                                  {member.name || member.email}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={assignmentDue}
                              onChange={(e) => setAssignmentDue(e.target.value)}
                              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <Button variant="primary" onClick={handleCreateAssignment} leftIcon={<i className="fas fa-user-check" />}>
                              Assign
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                          <h3 className="font-bold text-gray-900 dark:text-white">Current Assignments</h3>
                        </div>
                        {assignmentsLoading ? (
                          <div className="p-6 text-center"><i className="fas fa-spinner fa-spin text-indigo-400" /></div>
                        ) : assignments.length === 0 ? (
                          <p className="p-6 text-sm text-gray-400 dark:text-gray-500">No assignments yet.</p>
                        ) : (
                          <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {assignments.map((a) => (
                              <div key={a.id} className="px-6 py-4 flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">{a.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {a.assigneeName ? `Assigned to ${a.assigneeName}` : 'Unassigned'}
                                    {a.dueDate ? ` · due ${a.dueDate}` : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${a.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                                    {a.status}
                                  </span>
                                  {(userRole === 'owner' || userRole === 'admin') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAssignment(a.id)}
                                      className="text-xs text-red-500 dark:text-red-400 font-bold"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'activity' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Workspace Activity</h3>
                      {activityLoading ? (
                        <div className="text-center py-4"><i className="fas fa-spinner fa-spin text-indigo-400" /></div>
                      ) : activityFeed.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500">No activity yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {activityFeed.map((entry) => (
                            <div key={entry.id} className="rounded-xl bg-gray-50 dark:bg-slate-700/50 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              <span className="font-medium text-gray-700 dark:text-gray-200">{entry.userName || 'Team member'}</span>
                              {' · '}
                              {entry.message}
                              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Settings Tab */}
                  {tab === 'settings' && (userRole === 'owner' || userRole === 'admin') && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Team Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team name</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={teamRename}
                              onChange={(e) => setTeamRename(e.target.value)}
                              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <Button
                              variant="secondary"
                              onClick={async () => {
                                if (!activeTeam || !teamRename.trim() || teamRename.trim() === activeTeam.name) return;
                                try {
                                  await api.collaboration.updateTeam(activeTeam.id, { name: teamRename.trim() });
                                  loadTeamDetails(activeTeam.id);
                                  loadTeams();
                                  loadTeamActivity(activeTeam.id);
                                } catch (err: unknown) {
                                  setError(err instanceof Error ? err.message : 'Failed to rename team');
                                }
                              }}
                            >
                              Save name
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                          <select
                            value={activeTeam.plan}
                            onChange={async (e) => {
                              await api.collaboration.updateTeam(activeTeam.id, { plan: e.target.value });
                              loadTeamDetails(activeTeam.id);
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="free">Free (3 members)</option>
                            <option value="pro">Pro (10 members)</option>
                            <option value="enterprise">Enterprise (unlimited)</option>
                          </select>
                        </div>
                        {userRole === 'owner' && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Transfer ownership and billing changes can be layered on next; for deanery rollouts, designate one owner per workspace.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
