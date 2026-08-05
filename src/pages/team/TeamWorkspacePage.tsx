import React from 'react';
import { useTeamWorkspacePage } from './useTeamWorkspacePage';
import { TeamPageHeader } from './TeamPageHeader';
import { TeamEmptyState } from './TeamEmptyState';
import { TeamSidebar } from './TeamSidebar';
import { TeamHeaderTabs } from './TeamHeaderTabs';
import { TeamCollectionsTab } from './TeamCollectionsTab';
import { TeamMembersTab } from './TeamMembersTab';
import { TeamAssignmentsTab } from './TeamAssignmentsTab';
import { TeamActivityTab } from './TeamActivityTab';
import { TeamSettingsTab } from './TeamSettingsTab';

export const TeamWorkspacePage: React.FC = () => {
  const {
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
  } = useTeamWorkspacePage();

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <TeamPageHeader onBack={() => setCurrentPage('search')} />

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
          <TeamEmptyState
            newTeamName={newTeamName}
            onNewTeamNameChange={setNewTeamName}
            onCreateTeam={handleCreateTeam}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <TeamSidebar
              teams={teams}
              activeTeam={activeTeam}
              newTeamName={newTeamName}
              onSelectTeam={setActiveTeam}
              onNewTeamNameChange={setNewTeamName}
              onCreateTeam={handleCreateTeam}
            />

            <div className="lg:col-span-3 space-y-6">
              {activeTeam && (
                <>
                  <TeamHeaderTabs
                    activeTeam={activeTeam}
                    members={members}
                    tab={tab}
                    onTabChange={setTab}
                  />

                  {tab === 'collections' && (
                    <TeamCollectionsTab
                      collections={collections}
                      newCollectionName={newCollectionName}
                      expandedCollectionId={expandedCollectionId}
                      collectionArticles={collectionArticles}
                      collectionLoading={collectionLoading}
                      userRole={userRole}
                      onNewCollectionNameChange={setNewCollectionName}
                      onCreateCollection={handleCreateCollection}
                      onOpenCollection={openCollection}
                      onRemoveFromCollection={removeFromCollection}
                    />
                  )}

                  {tab === 'members' && (
                    <TeamMembersTab
                      members={members}
                      userRole={userRole}
                      userId={user?.id}
                      inviteEmail={inviteEmail}
                      lastInviteLink={lastInviteLink}
                      onInviteEmailChange={setInviteEmail}
                      onInvite={handleInvite}
                      onMemberRoleChange={handleMemberRoleChange}
                      onRemoveMember={handleRemoveMember}
                    />
                  )}

                  {tab === 'assignments' && (
                    <TeamAssignmentsTab
                      members={members}
                      userRole={userRole}
                      assignmentTitle={assignmentTitle}
                      assignmentMember={assignmentMember}
                      assignmentDue={assignmentDue}
                      assignments={assignments}
                      assignmentsLoading={assignmentsLoading}
                      onAssignmentTitleChange={setAssignmentTitle}
                      onAssignmentMemberChange={setAssignmentMember}
                      onAssignmentDueChange={setAssignmentDue}
                      onCreateAssignment={handleCreateAssignment}
                      onDeleteAssignment={handleDeleteAssignment}
                    />
                  )}

                  {tab === 'activity' && (
                    <TeamActivityTab
                      activityFeed={activityFeed}
                      activityLoading={activityLoading}
                    />
                  )}

                  {tab === 'settings' && (userRole === 'owner' || userRole === 'admin') && (
                    <TeamSettingsTab
                      activeTeam={activeTeam}
                      userRole={userRole}
                      teamRename={teamRename}
                      onTeamRenameChange={setTeamRename}
                      onRenameTeam={handleRenameTeam}
                      onPlanChange={handlePlanChange}
                    />
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
