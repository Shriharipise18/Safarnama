// routes/blogRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Blog = require('../models/blog');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(`./public/uploads/`));
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage: storage });

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// Route to display the edit blog form
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        // Check if the logged-in user is the author of the blog
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to edit this blog.');
        }

        res.render('editBlog', { 
            blog,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching blog');
    }
});

// Route to handle blog updates
router.post('/:id', upload.single('coverImage'), async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        // Check if the logged-in user is the author of the blog
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to edit this blog.');
        }

        const { title, body, category } = req.body;
        
        console.log('Updating blog with body content:', body.substring(0, 50) + '...');
        
        const updateData = {
            title,
            body,
            category,
            updatedAt: Date.now()
        };

        // If a new cover image was uploaded
        if (req.file) {
            updateData.coverImageURL = `/uploads/${req.file.filename}`;
            console.log('New cover image uploaded:', updateData.coverImageURL);
        }

        const updatedBlog = await Blog.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        console.log('Blog updated successfully:', updatedBlog._id);
        res.redirect(`/blog/${updatedBlog._id}`);
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).send('Error updating blog: ' + error.message);
    }
});

module.exports = router;