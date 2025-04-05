const { Router } = require('express');
const User = require('../models/user');
const Blog = require('../models/blog');
const router = Router();

// Search users route
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.render('search', {
                users: [],
                query: '',
                user: req.user
            });
        }
        
        // Search users by fullName or email containing the query string
        const users = await User.find({
            $or: [
                { fullName: { $regex: query, $options: 'i' } }, // Case insensitive search
                { email: { $regex: query, $options: 'i' } }
            ],
            _id: { $ne: req.user?._id } // Exclude the current user from results
        });
        
        return res.render('search', {
            users,
            query,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// View user profile route
router.get('/user/:id', async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id)
            .populate('followers')
            .populate('following');
        
        if (!profileUser) {
            return res.status(404).send('User not found');
        }
        
        // Fetch blogs created by this user
        const userBlogs = await Blog.find({ createdBy: req.params.id })
            .populate('createdBy')
            .sort({ createdAt: -1 });
            
        // Get fully populated current user if logged in
        let currentUser = null;
        let isFollowing = false;
        
        if (req.user) {
            currentUser = await User.findById(req.user._id);
            // Make sure following is an array
            if (!currentUser.following) {
                currentUser.following = [];
            }
            
            // Check if current user is following this user
            isFollowing = profileUser.followers.some(
                follower => follower._id.toString() === currentUser._id.toString()
            );
        }
        
        return res.render('userProfile', {
            profileUser,
            userBlogs,
            isFollowing,
            user: currentUser || req.user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Follow user route
router.post('/follow/:id', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        
        // Get the current user with full data
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({
                success: false,
                message: 'Current user not found'
            });
        }
        
        // Initialize following array if it doesn't exist
        if (!currentUser.following) {
            currentUser.following = [];
        }
        
        const userToFollow = await User.findById(req.params.id);
        if (!userToFollow) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Initialize followers array if it doesn't exist
        if (!userToFollow.followers) {
            userToFollow.followers = [];
        }
        
        // Check if already following
        const alreadyFollowing = userToFollow.followers.some(
            followerId => followerId.toString() === currentUser._id.toString()
        );
        
        if (alreadyFollowing) {
            // Unfollow logic
            await User.findByIdAndUpdate(
                req.params.id,
                { $pull: { followers: currentUser._id } }
            );
            
            await User.findByIdAndUpdate(
                currentUser._id,
                { $pull: { following: req.params.id } }
            );
            
            return res.json({ 
                success: true, 
                following: false, 
                message: 'User unfollowed successfully' 
            });
        } else {
            // Follow logic
            await User.findByIdAndUpdate(
                req.params.id,
                { $push: { followers: currentUser._id } }
            );
            
            await User.findByIdAndUpdate(
                currentUser._id,
                { $push: { following: req.params.id } }
            );
            
            return res.json({ 
                success: true, 
                following: true, 
                message: 'User followed successfully' 
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal Server Error' 
        });
    }
});

// Get followers list
router.get('/followers/:id', async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id).populate('followers');
        
        if (!profileUser) {
            return res.status(404).send('User not found');
        }
        
        // Get fully populated current user if logged in
        let currentUser = null;
        if (req.user) {
            currentUser = await User.findById(req.user._id);
            // Make sure following is an array
            if (!currentUser.following) {
                currentUser.following = [];
            }
        }
        
        return res.render('followers', {
            profileUser: profileUser,
            followers: profileUser.followers,
            user: currentUser || req.user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

// Get following list
router.get('/following/:id', async (req, res) => {
    try {
        const profileUser = await User.findById(req.params.id).populate('following');
        
        if (!profileUser) {
            return res.status(404).send('User not found');
        }
        
        // Get fully populated current user if logged in
        let currentUser = null;
        if (req.user) {
            currentUser = await User.findById(req.user._id);
            // Make sure following is an array
            if (!currentUser.following) {
                currentUser.following = [];
            }
        }
        
        return res.render('following', {
            profileUser: profileUser,
            following: profileUser.following,
            user: currentUser || req.user
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

module.exports = router; 