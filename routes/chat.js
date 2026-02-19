const { Router } = require('express');
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');

const router = Router();

// Render Chat UI
router.get('/', (req, res) => {
    if (!req.user) return res.redirect('/user/signin');
    res.render('chat', { user: req.user });
});

// API: Get all conversations for current user
router.get('/api/conversations', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const conversations = await Conversation.find({
            participants: req.user._id
        })
            .populate('participants', 'fullName profileImageURL')
            .populate({
                path: 'lastMessage',
                populate: { path: 'sender', select: 'fullName' }
            })
            .sort({ updatedAt: -1 });

        res.json(conversations);
    } catch (err) {
        console.error('Error fetching conversations:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Get messages for a specific conversation
router.get('/api/messages/:conversationId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId
        })
            .populate('sender', 'fullName profileImageURL')
            .sort({ createdAt: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// API: Get or create a conversation with another user
router.post('/api/conversation/user/:userId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
        return res.status(400).json({ error: 'Cannot chat with yourself' });
    }

    try {
        // Find existing private conversation
        let conversation = await Conversation.findOne({
            type: 'private',
            participants: { $all: [currentUserId, targetUserId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [currentUserId, targetUserId],
                type: 'private'
            });
        }

        res.json(conversation);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
