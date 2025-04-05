const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const crypto = require('crypto');
const { createTokenForUser } = require('../services/authentication');

// Create random password for Google auth users
const generatePassword = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Check if environment variables are properly configured
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

console.log('Passport configuration:');
console.log(`Google Client ID: ${googleClientId ? 'Available' : 'MISSING'}`);
console.log(`Google Client Secret: ${googleClientSecret ? 'Available' : 'MISSING'}`);

try {
    // Only configure Google strategy if we have the required credentials
    if (googleClientId && googleClientSecret) {
        // Google OAuth Strategy
        passport.use(new GoogleStrategy({
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: "/user/auth/google/callback",
            proxy: true
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('Google auth profile received:', {
                    id: profile.id,
                    displayName: profile.displayName,
                    emails: profile.emails ? 'Available' : 'Not available',
                    photos: profile.photos ? 'Available' : 'Not available'
                });

                if (!profile.emails || !profile.emails.length) {
                    console.error('No email found in Google profile');
                    return done(new Error('No email found in Google profile'), null);
                }

                // Check if a user already exists with this Google ID or email
                let user = await User.findOne({ 
                    $or: [
                        { googleId: profile.id },
                        { email: profile.emails[0].value }
                    ]
                });
                
                if (user) {
                    console.log('Existing user found for Google auth:', user.email);
                    // If user exists but doesn't have googleId, update it
                    if (!user.googleId) {
                        user.googleId = profile.id;
                        
                        // Also update profile image if available
                        if (profile.photos && profile.photos.length) {
                            user.profileImageURL = profile.photos[0].value;
                        }
                        
                        await user.save();
                        console.log('Updated existing user with Google ID');
                    }
                    return done(null, user);
                } else {
                    console.log('Creating new user for Google auth');
                    // Create a new user with Google profile data
                    const randomPassword = generatePassword();
                    
                    const userData = {
                        fullName: profile.displayName,
                        email: profile.emails[0].value,
                        password: randomPassword,
                        googleId: profile.id
                    };
                    
                    // Add profile image if available
                    if (profile.photos && profile.photos.length) {
                        userData.profileImageURL = profile.photos[0].value;
                    }
                    
                    console.log('New user data:', {
                        fullName: userData.fullName,
                        email: userData.email,
                        hasProfileImage: !!userData.profileImageURL
                    });
                    
                    // Create user
                    user = await User.create(userData);
                    console.log('New user created with ID:', user._id);
                    
                    return done(null, user);
                }
            } catch (error) {
                console.error('Error in Google auth strategy:', error);
                return done(error, null);
            }
        }));
    } else {
        console.error('Google OAuth is DISABLED due to missing environment variables');
    }
} catch (error) {
    console.error('Error setting up Google strategy:', error);
}

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    console.log('Serializing user:', user._id);
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        console.log('Deserializing user ID:', id);
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error('Error deserializing user:', error);
        done(error, null);
    }
});

module.exports = passport; 