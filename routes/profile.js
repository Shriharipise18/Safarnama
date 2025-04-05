const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Blog = require('../models/blog');
const Comment = require('../models/comments');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.resolve('./public/uploads/profiles');
        console.log('Upload directory:', uploadDir);
        
        // Make sure the directory exists with proper permissions
        try {
            const fs = require('fs');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Created directory:', uploadDir);
            }
            
            // Test if directory is writable
            try {
                const testFile = path.join(uploadDir, 'test.txt');
                fs.writeFileSync(testFile, 'test', { flag: 'w' });
                fs.unlinkSync(testFile);
                console.log('Directory is writable');
            } catch (writeErr) {
                console.error('Directory is not writable:', writeErr);
            }
        } catch (err) {
            console.error('Error with directory:', err);
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const filename = 'profile-' + uniqueSuffix + ext;
        console.log('Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (increased from 5MB)
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Profile Route
router.get('/', async (req, res) => {
    try {
        console.log('Profile route hit'); // Debugging
        if (!req.user) {
            console.log('User not logged in, redirecting to signin'); // Debugging
            return res.redirect('/user/signin');
        }

        // Fetch the logged-in user's data
        const user = await User.findById(req.user._id);

        // Fetch blogs created by the user
        const blogs = await Blog.find({ createdBy: req.user._id }).populate('createdBy');

        // Fetch comments made by the user and populate the blogId field
        const comments = await Comment.find({ createdBy: req.user._id })
            .populate({
                path: 'blogId',
                select: 'title', // Only populate the title field of the blog
            })
            .then(comments => comments.filter(comment => comment.blogId)); // Filter out comments with null blogId

        console.log('User:', user); // Debugging
        console.log('Blogs:', blogs); // Debugging
        console.log('Comments:', comments); // Debugging

        // Render the profile page with user data, blogs, and comments
        return res.render('profile', {
            user: req.user,
            blogs,
            comments,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Edit Profile Page Route
router.get('/edit', async (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }
    
    try {
        const user = await User.findById(req.user._id);
        return res.render('editProfile', {
            user: user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Update Profile Route with Photo Upload
router.post('/update', (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }
    
    // Handle the file upload with better error handling
    const uploadMiddleware = upload.single('profileImage');
    
    uploadMiddleware(req, res, async function(err) {
        if (err) {
            console.error('Upload error:', err);
            
            // Handle multer errors
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).render('editProfile', {
                    user: req.user,
                    error: 'File is too large. Maximum size is 10MB.'
                });
            }
            
            return res.status(400).render('editProfile', {
                user: req.user,
                error: 'Error uploading file: ' + err.message
            });
        }
        
        try {
            const updateData = {
                fullName: req.body.fullName,
                bio: req.body.bio
            };
            
            // If a new profile image was uploaded
            if (req.file) {
                console.log('File info:', req.file);
                
                // Create a relative path that will work with express.static
                // The profile image URL needs to be relative to the public directory
                // since express.static serves files from there
                const relativePath = '/uploads/profiles/' + req.file.filename;
                updateData.profileImageURL = relativePath;
                
                console.log('Profile image path:', req.file.path);
                console.log('Profile image URL set to:', updateData.profileImageURL);
                
                // Check if the file exists
                const fs = require('fs');
                if (fs.existsSync(req.file.path)) {
                    console.log('Uploaded file exists at path:', req.file.path);
                } else {
                    console.error('Uploaded file does not exist at path:', req.file.path);
                }
            }
            
            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                updateData,
                { new: true }
            );
            
            console.log('Updated user:', updatedUser);
            return res.redirect('/profile');
        } catch (error) {
            console.error(error);
            return res.status(500).render('editProfile', {
                user: req.user,
                error: 'Internal Server Error. Please try again.'
            });
        }
    });
});

module.exports = router;