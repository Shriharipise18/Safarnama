const express = require('express');
const { Comment } = require('../models/comment');
const router = express.Router();

// Add comment route
router.post('/:blogId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).redirect('/user/signin');
        }

        const { content } = req.body;
        const blogId = req.params.blogId;
        
        if (!content || content.trim() === '') {
            return res.redirect(`/blog/${blogId}`);
        }

        // Create comment
        await Comment.create({
            content,
            blogId,
            createdBy: req.user._id
        });

        return res.redirect(`/blog/${blogId}`);
    } catch (error) {
        console.error('Error creating comment:', error);
        return res.status(500).send('Internal Server Error');
    }
});

module.exports = router; 