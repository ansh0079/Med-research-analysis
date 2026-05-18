// ==========================================
// Team Workspace API Routes
// ==========================================

const express = require('express');
const crypto = require('crypto');
const { requireAuthJwt } = require('../middleware/auth');

const router = express.Router();

function requireTeamRole(db, minRole = 'member') {
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

// ==========================================
// Teams
// ==========================================

router.post('/', requireAuthJwt, async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const id = crypto.randomUUID();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const uniqueSlug = `${slug}-${id.slice(0, 8)}`;

    try {
        await db.createTeam({ id, name: name.trim(), slug: uniqueSlug, ownerId: req.user.id });
        await db.addTeamMember(id, req.user.id, 'owner');
        const team = await db.getTeamById(id);
        res.status(201).json({ team: { ...team, memberCount: 1 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', requireAuthJwt, async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        const teams = await db.getUserTeams(req.user.id);
        res.json({ teams });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:teamId', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        const members = await db.getTeamMembers(req.params.teamId);
        res.json({ team: req.team, members, role: req.teamRole });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:teamId', requireAuthJwt, requireTeamRole(require('../../database'), 'admin'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { name, plan, memberLimit } = req.body;
    try {
        await db.updateTeam(req.params.teamId, { name, plan, memberLimit });
        const team = await db.getTeamById(req.params.teamId);
        res.json({ team });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:teamId', requireAuthJwt, requireTeamRole(require('../../database'), 'owner'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        await db.deleteTeam(req.params.teamId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Members & Invitations
// ==========================================

router.post('/:teamId/invitations', requireAuthJwt, requireTeamRole(require('../../database'), 'admin'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { email, role = 'member' } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: 'email is required' });

    // Check member limit
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
            expiresAt
        });
        res.status(201).json({ invitation: { email: email.trim(), role, token, expiresAt } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/invitations/:token/accept', requireAuthJwt, async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        const invitation = await db.acceptTeamInvitation(req.params.token, req.user.id);
        if (!invitation) return res.status(400).json({ error: 'Invalid or expired invitation' });
        res.json({ success: true, teamId: invitation.team_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:teamId/members/:userId', requireAuthJwt, requireTeamRole(require('../../database'), 'admin'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { teamId, userId } = req.params;
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
    try {
        await db.removeTeamMember(teamId, userId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/:teamId/members/:userId/role', requireAuthJwt, requireTeamRole(require('../../database'), 'owner'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { teamId, userId } = req.params;
    const { role } = req.body;
    if (!['member', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be member or admin' });
    try {
        await db.updateTeamMemberRole(teamId, userId, role);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// Collections
// ==========================================

router.get('/:teamId/collections', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        const collections = await db.getTeamCollections(req.params.teamId);
        res.json({ collections });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:teamId/collections', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const id = crypto.randomUUID();
    try {
        await db.createTeamCollection({
            id,
            teamId: req.params.teamId,
            name: name.trim(),
            description: description?.trim(),
            createdBy: req.user.id
        });
        res.status(201).json({ collection: { id, name, description, teamId: req.params.teamId, articleCount: 0 } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:teamId/collections/:collectionId', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
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
            _notes: r.notes
        }));
        res.json({ collection: { ...collection, articles } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:teamId/collections/:collectionId', requireAuthJwt, requireTeamRole(require('../../database'), 'admin'), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        await db.deleteTeamCollection(req.params.collectionId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:teamId/collections/:collectionId/articles', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    const { article } = req.body;
    if (!article || !article.uid) return res.status(400).json({ error: 'article with uid is required' });

    try {
        await db.addArticleToTeamCollection(req.params.collectionId, article, req.user.id);
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:teamId/collections/:collectionId/articles/:articleId', requireAuthJwt, requireTeamRole(require('../../database')), async (req, res) => {
    const db = req.app.locals.db || require('../../database');
    try {
        await db.removeArticleFromTeamCollection(req.params.collectionId, req.params.articleId);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { teamRoutes: router };
