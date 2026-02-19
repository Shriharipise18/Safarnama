const { Schema, model } = require('mongoose');

const conversationSchema = new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }],
    lastMessage: {
        type: Schema.Types.ObjectId, // Can be populated
        ref: 'message',
        default: null
    },
    type: {
        type: String,
        enum: ['private', 'group'],
        default: 'private'
    }
}, { timestamps: true });

const Conversation = model('conversation', conversationSchema);

module.exports = Conversation;
