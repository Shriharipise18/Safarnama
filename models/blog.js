const { Schema, model } = require('mongoose');

const blogSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    coverImageURL: {
        type: String,
        required: false,
    },
    mediaFiles: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        size: {
            type: Number,
            required: true
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
    category: {
        type: String,
        required: true,
        enum: ['Technology', 'Travel', 'Food', 'Lifestyle', 'Fashion', 'Other'], // Add your categories here
    },
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    dislikes: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }]},
     { timestamps: true });

const Blog = model('blog', blogSchema);

module.exports = Blog;