-- Align team_invitations with acceptTeamInvitation (accepted_at)
ALTER TABLE team_invitations ADD COLUMN accepted_at DATETIME;
