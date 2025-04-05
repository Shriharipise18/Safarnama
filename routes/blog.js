const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = Router();
const Blog = require('../models/blog');
const Comment = require('../models/comments');

// Helper function to determine file type
function getFileType(file) {
    const mimeType = file.mimetype;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf' || 
        mimeType === 'application/msword' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        return 'document';
    }
    return 'other';
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(`./public/uploads/`));
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images, videos, audios, and common document formats
    if (file.fieldname === 'coverImage') {
        // For cover images, only allow image files
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed for cover image!'), false);
        }
        if (file.size > MAX_IMAGE_SIZE) {
            return cb(new Error('Cover image size exceeds the limit of 10MB!'), false);
        }
    }
    
    if (file.size > MAX_FILE_SIZE) {
        return cb(new Error('File size exceeds the limit of 50MB!'), false);
    }
    
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// Multiple file upload configuration for media files
const mediaUpload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
}).array('mediaFiles', 10); // Allow up to 10 files per upload

// Add New Blog Page Route
router.get('/add-new', (req, res) => {
    return res.render('addBlog', {
        user: req.user, // Pass the logged-in user to the view
    });
});

// Media files upload endpoint
router.post('/upload-media', (req, res) => {
    mediaUpload(req, res, function(err) {
        if (err) {
            console.error('Media upload error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'Error uploading files'
            });
        }
        
        try {
            const uploadedFiles = [];
            
            // Process each uploaded file
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    const fileType = getFileType(file);
                    const fileURL = `/uploads/${file.filename}`;
                    
                    uploadedFiles.push({
                        url: fileURL,
                        type: file.mimetype,
                        name: file.originalname,
                        size: file.size,
                        uploadDate: new Date()
                    });
                });
            }
            
            return res.json({
                success: true,
                files: uploadedFiles
            });
        } catch (error) {
            console.error('Error processing uploaded files:', error);
            return res.status(500).json({
                success: false,
                message: 'Error processing uploaded files'
            });
        }
    });
});

// Create New Blog Route
router.post('/', upload.single('coverImage'), async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            console.log('User not authenticated when trying to create blog');
            return res.status(401).send('You must be logged in to create a blog post');
        }
        
        const { title, body, category, mediaFiles } = req.body;
        
        console.log('Creating blog with user:', req.user._id);
        console.log('Blog data:', { title, category });
        
        // Prepare blog data
        const blogData = {
            title,
            body,
            category,
            createdBy: req.user._id
        };
        
        // Add cover image if uploaded
        if (req.file) {
            blogData.coverImageURL = `/uploads/${req.file.filename}`;
            console.log('Cover image added:', blogData.coverImageURL);
        }
        
        // Add media files if provided
        if (mediaFiles) {
            try {
                blogData.mediaFiles = JSON.parse(mediaFiles);
                console.log('Media files added:', blogData.mediaFiles.length);
            } catch (err) {
                console.error('Error parsing media files:', err);
            }
        }

        // Create the blog
        const blog = await Blog.create(blogData);
        console.log('Blog created with ID:', blog._id);
        
        // Redirect to the newly created blog's page
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error('Error creating blog:', error);
        return res.status(500).send('Internal Server Error: ' + error.message);
    }
});

// Image upload endpoint
router.post('/upload-image', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false,
            message: 'No file uploaded' 
        });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ 
        success: true,
        location: imageUrl 
    });
});

// Delete Blog Route
router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).send('Blog not found');
        }

        // Check if the logged-in user is the creator of the blog
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send('You are not authorized to delete this blog');
        }

        // Delete all comments associated with this blog
        await Comment.deleteMany({ blogId: req.params.id });
        
        // Delete associated media files from the filesystem
        if (blog.coverImageURL) {
            const coverImagePath = path.join(__dirname, '../public', blog.coverImageURL);
            if (fs.existsSync(coverImagePath)) {
                fs.unlinkSync(coverImagePath);
            }
        }
        
        if (blog.mediaFiles && blog.mediaFiles.length > 0) {
            blog.mediaFiles.forEach(media => {
                const mediaPath = path.join(__dirname, '../public', media.fileURL);
                if (fs.existsSync(mediaPath)) {
                    fs.unlinkSync(mediaPath);
                }
            });
        }
        
        // Delete the blog
        await Blog.findByIdAndDelete(req.params.id);
        
        // Redirect to profile page after deletion
        return res.redirect('/profile');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Get Single Blog Route
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate('createdBy');
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        
        // Fetch comments for this blog
        const comments = await Comment.find({ blogId: req.params.id }).populate('createdBy').sort({ createdAt: -1 });
        
        // Define category colors (same as in index.js)
        const categoryColors = {
            Technology: '#007bff', // Blue
            Travel: '#28a745',     // Green
            Food: '#dc3545',       // Red
            Lifestyle: '#ffc107',  // Yellow
            Fashion: '#6f42c1',    // Purple
            Other: '#17a2b8',      // Cyan
        };
        
        return res.render('blog', {
            blog,
            comments,
            categoryColors
        });
    } catch (error) {
        console.error('Error fetching blog:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Like Blog Route
router.post('/like/:id', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).redirect('/user/signin');
        }
        
        const blogId = req.params.id;
        const userId = req.user._id;
        
        // Find the blog
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        
        // Initialize arrays if they don't exist
        if (!blog.likes) blog.likes = [];
        if (!blog.dislikes) blog.dislikes = [];
        
        // Check if user already liked this blog
        const alreadyLiked = blog.likes.includes(userId);
        
        if (alreadyLiked) {
            // Unlike: Remove from likes array
            blog.likes = blog.likes.filter(id => id.toString() !== userId.toString());
        } else {
            // Like: Add to likes array and remove from dislikes if present
            blog.likes.push(userId);
            blog.dislikes = blog.dislikes.filter(id => id.toString() !== userId.toString());
        }
        
        await blog.save();
        return res.redirect(`/blog/${blogId}`);
    } catch (error) {
        console.error('Error in like blog route:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Dislike Blog Route
router.post('/dislike/:id', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).redirect('/user/signin');
        }
        
        const blogId = req.params.id;
        const userId = req.user._id;
        
        // Find the blog
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).send('Blog not found');
        }
        
        // Initialize arrays if they don't exist
        if (!blog.likes) blog.likes = [];
        if (!blog.dislikes) blog.dislikes = [];
        
        // Check if user already disliked this blog
        const alreadyDisliked = blog.dislikes.includes(userId);
        
        if (alreadyDisliked) {
            // Undislike: Remove from dislikes array
            blog.dislikes = blog.dislikes.filter(id => id.toString() !== userId.toString());
        } else {
            // Dislike: Add to dislikes array and remove from likes if present
            blog.dislikes.push(userId);
            blog.likes = blog.likes.filter(id => id.toString() !== userId.toString());
        }
        
        await blog.save();
        return res.redirect(`/blog/${blogId}`);
    } catch (error) {
        console.error('Error in dislike blog route:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Add Comment Route
router.post('/comment/:blogId', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required'
            });
        }
        
        const newComment = await Comment.create({
            content: req.body.content,
            blogId: req.params.blogId,
            createdBy: req.user._id,
        });
        
        // Populate the createdBy field to include user details
        const populatedComment = await Comment.findById(newComment._id)
            .populate('createdBy', 'firstName lastName profileImage');
            
        // Check if the request expects JSON (AJAX request)
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({
                success: true,
                comment: {
                    _id: populatedComment._id,
                    content: populatedComment.content,
                    createdAt: populatedComment.createdAt,
                    user: {
                        _id: populatedComment.createdBy._id,
                        firstName: populatedComment.createdBy.firstName,
                        lastName: populatedComment.createdBy.lastName,
                        profileImage: populatedComment.createdBy.profileImage
                    }
                }
            });
        }
        
        // For traditional form submissions, redirect back to the blog page
        return res.redirect(`/blog/${req.params.blogId}`);
    } catch (error) {
        console.error(error);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ 
                success: false, 
                message: 'Internal Server Error'
            });
        }
        return res.status(500).send('Internal Server Error');
    }
});

module.exports = router;