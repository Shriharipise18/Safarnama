const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'conversation',
        required: true
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image'],
        default: 'text'
    },
    seenBy: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }]
}, { timestamps: true });

const Message = model('message', messageSchema);

module.exports = Message;
