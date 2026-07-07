'use strict';

const { limitBodySize, requireJson, validateBody, schemas } = require('../../../utils/validation');

function registerAgentConversationRoutes(app, deps) {
    const { db, requireAuthJwt, rateLimit } = deps;

    app.post('/api/learning/agent/conversations', limitBodySize(32 * 1024), requireJson, requireAuthJwt, rateLimit(10, 60), validateBody(schemas.agentConversation), async (req, res) => {
        try {
            const { topic, title } = req.body;
            const conversation = await db.createAgentConversation(req.user.id, topic, title);
            res.status(201).json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Create agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const { topic = '', limit = 20, offset = 0 } = req.query;
            const conversations = await db.listAgentConversations(req.user.id, {
                topic: String(topic),
                limit: Math.min(parseInt(limit, 10) || 20, 100),
                offset: parseInt(offset, 10) || 0,
            });
            res.json({ conversations });
        } catch (error) {
            req.log.error({ err: error }, 'List agent conversations error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(30, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            res.json({ conversation });
        } catch (error) {
            req.log.error({ err: error }, 'Get agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.patch('/api/learning/agent/conversations/:id', limitBodySize(256 * 1024), requireJson, requireAuthJwt, rateLimit(20, 60), validateBody(schemas.agentMessageAppend), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            const updated = await db.appendAgentMessages(req.params.id, req.body.messages);
            res.json({ conversation: updated });
        } catch (error) {
            req.log.error({ err: error }, 'Append agent messages error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.delete('/api/learning/agent/conversations/:id', requireAuthJwt, rateLimit(10, 60), async (req, res) => {
        try {
            const conversation = await db.getAgentConversation(req.params.id);
            if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
            if (conversation.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
            await db.deleteAgentConversation(req.params.id);
            res.json({ success: true });
        } catch (error) {
            req.log.error({ err: error }, 'Delete agent conversation error');
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

module.exports = { registerAgentConversationRoutes };
