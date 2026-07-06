// ==========================================
// Team Workspace API Routes
// ==========================================

const express = require('express');
const crypto = require('crypto');
const logger = require('../config/logger');

const isDev = process.env.NODE_ENV !== 'production';

// Simple in-memory rate limiter (consistent with other route files)
const _rl = {};
function rateLimit(max, windowSec) {
    return (req, res, next) => {
        const key = `team:${req.user?.id || req.ip}`;
        const now = Date.now();
        if (!_rl[key] || now - _rl[key].start > windowSec * 1000) {
            _rl[key] = { count: 1, start: now };
        } else {
            _rl[key].count++;
        }
        if (_rl[key].count > max) {
            return res.status(429).json({ error: 'Too many requests' });
        }
        next();
    };
}

function requireJson(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'DELETE' && !req.is('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    next();
}

function createTeamRouteHelpers(db) {
    async function logTeamActivity(teamId, userId, message) {
        if (!db?.createTeamActivity) return;
        try {
            await db.createTeamActivity({ teamId, userId, message });
        } catch (err) {
            logger.warn({ err, teamId }, 'Failed to log team activity');
        }
    }

    function requireTeamRole(minRole = 'member') {
        const levels = { member: 1, admin: 2, owner: 3 };
        return async (req, res, next) => {
            const { teamId } = req.params;
            const team = await db.getTeamById(teamId);
            if (!team) return res.status(404).json({ error: 'Team not found' });

            if (team.owner_id === req.user.id) {
                req.teamRole = 'owner';
                req.team = team;
                return next();
            }

            const members = await db.getTeamMembers(teamId);
            const member = members.find(m => m.user_id === req.user.id);
            if (!member) return res.status(403).json({ error: 'Not a team member' });

            if (levels[member.role] < levels[minRole]) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.teamRole = member.role;
            req.team = team;
            req.teamMembers = members;
            next();
        };
    }

    return { logTeamActivity, requireTeamRole };
}

/**
 * @param {import('express').Application} app
 * @param {{ db: object, requireAuthJwt: Function }} deps
 */
function registerTeamRoutes(app, { db, requireAuthJwt }) {
    const router = express.Router();
    const { logTeamActivity, requireTeamRole } = createTeamRouteHelpers(db);

    // ==========================================
    // Teams
    // ==========================================

    router.post('/', requireAuthJwt, requireJson, rateLimit(10, 60), async (req, res) => {
        const { name } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

        const id = crypto.randomUUID();
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const uniqueSlug = `${slug}-${id.slice(0, 8)}`;

        try {
            await db.createTeam({ id, name: name.trim(), slug: uniqueSlug, ownerId: req.user.id });
            await db.addTeamMember(id, req.user.id, 'owner');
            await logTeamActivity(id, req.user.id, `Created team "${name.trim()}"`);
            const team = await db.getTeamById(id);
            res.status(201).json({ team: { ...team, memberCount: 1 } });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.get('/', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const teams = await db.getUserTeams(req.user.id);
            res.json({ teams });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.get('/:teamId', requireAuthJwt, rateLimit(30, 60), requireTeamRole(), async (req, res) => {
        try {
            const members = await db.getTeamMembers(req.params.teamId);
            res.json({ team: req.team, members, role: req.teamRole });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.patch('/:teamId', requireAuthJwt, requireJson, rateLimit(10, 60), requireTeamRole('admin'), async (req, res) => {
        const { name, plan, memberLimit } = req.body;
        try {
            await db.updateTeam(req.params.teamId, { name, plan, memberLimit });
            if (name?.trim()) {
                await logTeamActivity(req.params.teamId, req.user.id, `Renamed team to "${name.trim()}"`);
            }
            const team = await db.getTeamById(req.params.teamId);
            res.json({ team });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.delete('/:teamId', requireAuthJwt, rateLimit(5, 60), requireTeamRole('owner'), async (req, res) => {
        try {
            await db.deleteTeam(req.params.teamId);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    // ==========================================
    // Activity & assignments
    // ==========================================

    router.get('/:teamId/activity', requireAuthJwt, rateLimit(30, 60), requireTeamRole(), async (req, res) => {
        try {
            const rows = await db.getTeamActivity(req.params.teamId, 50);
            const activity = rows.map((row) => ({
                id: row.id,
                message: row.message,
                createdAt: row.created_at,
                userId: row.user_id || null,
                userName: row.user_name || row.user_email || null,
            }));
            res.json({ activity });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.get('/:teamId/assignments', requireAuthJwt, rateLimit(30, 60), requireTeamRole(), async (req, res) => {
        try {
            const rows = await db.getTeamAssignments(req.params.teamId);
            const assignments = rows.map((row) => ({
                id: row.id,
                title: row.title,
                assigneeUserId: row.assignee_user_id || null,
                assigneeName: row.assignee_name || row.assignee_email || null,
                dueDate: row.due_date || null,
                status: row.status || 'open',
                createdAt: row.created_at,
                createdBy: row.created_by,
            }));
            res.json({ assignments });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.post('/:teamId/assignments', requireAuthJwt, requireJson, rateLimit(20, 60), requireTeamRole(), async (req, res) => {
        const { title, assigneeUserId, dueDate } = req.body;
        if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

        const id = crypto.randomUUID();
        try {
            if (assigneeUserId) {
                const members = req.teamMembers || await db.getTeamMembers(req.params.teamId);
                const isMember = members.some((m) => m.user_id === assigneeUserId)
                    || req.team?.owner_id === assigneeUserId;
                if (!isMember) {
                    return res.status(400).json({ error: 'Assignee must be a team member' });
                }
            }

            await db.createTeamAssignment({
                id,
                teamId: req.params.teamId,
                title: title.trim(),
                assigneeUserId: assigneeUserId || null,
                dueDate: dueDate || null,
                createdBy: req.user.id,
            });

            const assigneeLabel = assigneeUserId
                ? (req.teamMembers || []).find((m) => m.user_id === assigneeUserId)?.name
                    || (req.teamMembers || []).find((m) => m.user_id === assigneeUserId)?.email
                    || 'a reviewer'
                : 'the team';
            const dueSuffix = dueDate ? ` due ${dueDate}` : '';
            await logTeamActivity(
                req.params.teamId,
                req.user.id,
                `Assigned "${title.trim()}" to ${assigneeLabel}${dueSuffix}`
            );

            res.status(201).json({
                assignment: {
                    id,
                    title: title.trim(),
                    assigneeUserId: assigneeUserId || null,
                    dueDate: dueDate || null,
                    status: 'open',
                },
            });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.delete('/:teamId/assignments/:assignmentId', requireAuthJwt, rateLimit(10, 60), requireTeamRole('admin'), async (req, res) => {
        try {
            await db.deleteTeamAssignment(req.params.teamId, req.params.assignmentId);
            await logTeamActivity(req.params.teamId, req.user.id, 'Removed a review assignment');
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    // ==========================================
    // Members & Invitations
    // ==========================================

    router.post('/:teamId/invitations', requireAuthJwt, requireJson, rateLimit(10, 60), requireTeamRole('admin'), async (req, res) => {
        const { email, role = 'member' } = req.body;
        if (!email || !email.trim()) return res.status(400).json({ error: 'email is required' });

        const members = await db.getTeamMembers(req.params.teamId);
        const team = req.team;
        if (members.length >= (team.member_limit || 3)) {
            return res.status(403).json({ error: 'Team member limit reached' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        try {
            await db.createTeamInvitation({
                id: crypto.randomUUID(),
                teamId: req.params.teamId,
                email: email.trim(),
                role,
                token,
                expiresAt,
            });
            await logTeamActivity(req.params.teamId, req.user.id, `Invited ${email.trim()} to the team`);
            res.status(201).json({ invitation: { email: email.trim(), role, token, expiresAt } });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.post('/invitations/:token/accept', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const invitation = await db.acceptTeamInvitation(req.params.token, req.user.id);
            if (!invitation) return res.status(400).json({ error: 'Invalid or expired invitation' });
            await logTeamActivity(invitation.team_id, req.user.id, 'Joined the team via invitation');
            res.json({ success: true, teamId: invitation.team_id });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.delete('/:teamId/members/:userId', requireAuthJwt, rateLimit(10, 60), requireTeamRole('admin'), async (req, res) => {
        const { teamId, userId } = req.params;
        if (userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
        try {
            const members = await db.getTeamMembers(teamId);
            const removed = members.find((m) => m.user_id === userId);
            await db.removeTeamMember(teamId, userId);
            await logTeamActivity(teamId, req.user.id, `Removed member ${removed?.email || userId}`);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.patch('/:teamId/members/:userId/role', requireAuthJwt, requireJson, rateLimit(10, 60), requireTeamRole('owner'), async (req, res) => {
        const { teamId, userId } = req.params;
        const { role } = req.body;
        if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be member or admin' });
        try {
            const members = await db.getTeamMembers(teamId);
            const target = members.find((m) => m.user_id === userId);
            await db.updateTeamMemberRole(teamId, userId, role);
            await logTeamActivity(teamId, req.user.id, `Updated role for ${target?.email || userId} to ${role}`);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    // ==========================================
    // Collections
    // ==========================================

    router.get('/:teamId/collections', requireAuthJwt, rateLimit(30, 60), requireTeamRole(), async (req, res) => {
        try {
            const collections = await db.getTeamCollections(req.params.teamId);
            res.json({ collections });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.post('/:teamId/collections', requireAuthJwt, requireJson, rateLimit(10, 60), requireTeamRole(), async (req, res) => {
        const { name, description } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

        const id = crypto.randomUUID();
        try {
            await db.createTeamCollection({
                id,
                teamId: req.params.teamId,
                name: name.trim(),
                description: description?.trim(),
                createdBy: req.user.id,
            });
            await logTeamActivity(req.params.teamId, req.user.id, `Created collection "${name.trim()}"`);
            res.status(201).json({ collection: { id, name, description, teamId: req.params.teamId, articleCount: 0 } });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.get('/:teamId/collections/:collectionId', requireAuthJwt, rateLimit(30, 60), requireTeamRole(), async (req, res) => {
        try {
            const collection = await db.getTeamCollection(req.params.collectionId);
            if (!collection || collection.team_id !== req.params.teamId) {
                return res.status(404).json({ error: 'Collection not found' });
            }
            const rows = await db.getTeamCollectionArticles(req.params.collectionId);
            const articles = rows.map(r => ({
                ...JSON.parse(r.article_data),
                _addedAt: r.added_at,
                _addedBy: r.added_by,
                _notes: r.notes,
            }));
            res.json({ collection: { ...collection, articles } });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.delete('/:teamId/collections/:collectionId', requireAuthJwt, rateLimit(5, 60), requireTeamRole('admin'), async (req, res) => {
        try {
            await db.deleteTeamCollection(req.params.collectionId);
            await logTeamActivity(req.params.teamId, req.user.id, 'Deleted a team collection');
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.post('/:teamId/collections/:collectionId/articles', requireAuthJwt, requireJson, rateLimit(20, 60), requireTeamRole(), async (req, res) => {
        const { article } = req.body;
        if (!article || !article.uid) return res.status(400).json({ error: 'article with uid is required' });

        try {
            await db.addArticleToTeamCollection(req.params.collectionId, article, req.user.id);
            await logTeamActivity(req.params.teamId, req.user.id, `Added "${article.title || article.uid}" to a collection`);
            res.status(201).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    router.delete('/:teamId/collections/:collectionId/articles/:articleId', requireAuthJwt, rateLimit(20, 60), requireTeamRole(), async (req, res) => {
        try {
            await db.removeArticleFromTeamCollection(req.params.collectionId, req.params.articleId);
            await logTeamActivity(req.params.teamId, req.user.id, 'Removed an article from a team collection');
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: isDev ? err.message : 'Internal server error' });
        }
    });

    app.use('/api/teams', router);
}

module.exports = { registerTeamRoutes };
