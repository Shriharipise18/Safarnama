const {Router} = require('express');
const User = require('../models/user');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { createTokenForUser } = require('../services/authentication');
const router = Router();

// Get JWT Secret from environment or use a default (same as in the checkForAuthenticationCookie middleware)
const JWT_SECRET = process.env.JWT_SECRET || "$uperMan@123";

router.get('/signin',(req,res)=>{
    return res.render("signin", {
        query: req.query
    })
})

router.get('/signup',(req,res)=>{
    return res.render("signup", {
        query: req.query
    });
})

router.get('/add-new', (req, res) => {
    console.log('Add Blog route hit'); // Debugging
    return res.render('addBlog', {
        user: req.user,
    });
});

router.post('/signup',async (req,res)=>{
    const {fullName, password, email} = req.body;
    try {
        await User.create({
            fullName,
            email,
            password
        });
        return res.redirect('/user/signin');
    } catch (error) {
        console.error("Signup error:", error);
        return res.render('signup', {
            error: "Error creating account. Email may already be in use."
        });
    }
})

router.post('/signin',async(req,res)=>{
    const { password, email } = req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        console.log("Token", token);
        return res.cookie('token', token).redirect('/');
    } catch (error) {
        console.error("Signin error:", error);
        return res.render('signin', {
            error: "Incorrect Email or Password",
        });
    }
})

// Google OAuth Routes
router.get('/auth/google', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth not properly configured. Missing credentials.');
        return res.render('signin', {
            error: "Google authentication is not available. Please sign in with email and password."
        });
    }
    
    // If configured, proceed with authentication
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })(req, res, next);
});

router.get('/auth/google/callback', (req, res, next) => {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth not properly configured. Missing credentials.');
        return res.redirect('/user/signin?error=google_auth_unavailable');
    }
    
    // If configured, proceed with authentication
    passport.authenticate('google', { 
        failureRedirect: '/user/signin',
        session: false
    }, (err, user) => {
        if (err || !user) {
            console.error('Error during Google auth callback:', err);
            return res.redirect('/user/signin?error=auth_failed');
        }
        
        try {
            // Generate JWT token for the authenticated user
            const token = createTokenForUser(user);
            
            // Set the token as a cookie and redirect to home
            return res.cookie('token', token).redirect('/');
        } catch (error) {
            console.error('Error in Google auth callback:', error);
            res.redirect('/user/signin?error=token_generation_failed');
        }
    })(req, res, next);
});

router.get('/logout',(req, res)=>{
    res.clearCookie('token').redirect('/');
})

module.exports=router;