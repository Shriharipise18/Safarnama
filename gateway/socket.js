const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Message = require('../models/message');
const Conversation = require('../models/conversation');

const JWT_SECRET = process.env.JWT_SECRET || "$uperMan@123";

const initSocket = (io) => {
    // Middleware to authenticate socket
    io.use((socket, next) => {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) return next(new Error('Authentication error'));

        const parsedCookies = cookie.parse(cookies);
        const token = parsedCookies.token;

        if (!token) return next(new Error('Authentication error'));

        try {
            const user = jwt.verify(token, JWT_SECRET);
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    const onlineUsers = new Map(); // userId -> socketId

    io.on('connection', (socket) => {
        const userId = socket.user._id.toString();
        onlineUsers.set(userId, socket.id);

        console.log(`User connected: ${socket.user.fullName} (${userId})`);
        io.emit('user_status', { userId, status: 'online' });

        // Send current online users to the newly connected user
        socket.emit('online_users', Array.from(onlineUsers.keys()));

        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${userId} joined room ${conversationId}`);
        });

        socket.on('send_message', async (data) => {
            const { conversationId, content, messageType = 'text' } = data;

            try {
                // Save message to DB
                const message = await Message.create({
                    conversationId,
                    sender: userId,
                    content,
                    messageType
                });

                // Update lastMessage in Conversation
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: message._id
                });

                // Emit to room
                io.to(conversationId).emit('new_message', {
                    _id: message._id,
                    conversationId,
                    sender: {
                        _id: userId,
                        fullName: socket.user.fullName,
                        profileImageURL: socket.user.profileImageURL
                    },
                    content,
                    messageType,
                    createdAt: message.createdAt
                });

            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(conversationId).emit('user_typing', {
                conversationId,
                userId,
                fullName: socket.user.fullName,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            console.log(`User disconnected: ${userId}`);
            io.emit('user_status', { userId, status: 'offline' });
        });
    });
};

module.exports = { initSocket };
