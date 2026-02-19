const passport = require('passport');
const User = require('../models/user');
const crypto = require('crypto');
const { createTokenForUser } = require('../services/authentication');

// Create random password for Google auth users
const generatePassword = () => {
    return crypto.randomBytes(16).toString('hex');
};

const GitHubStrategy = require('passport-github2').Strategy;

// Check if environment variables are properly configured
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

console.log('Passport configuration:');
console.log(`GitHub Client ID: ${githubClientId ? 'Available' : 'MISSING'}`);
console.log(`GitHub Client Secret: ${githubClientSecret ? 'Available' : 'MISSING'}`);

console.log('Attempting to configure GitHub Strategy...');
try {
    // Only configure GitHub strategy if we have the required credentials
    if (githubClientId && githubClientSecret && githubClientId !== 'YOUR_GITHUB_CLIENT_ID') {
        console.log('Credentials found, registering GitHub Strategy...');
        // GitHub OAuth Strategy
        passport.use(new GitHubStrategy({
            clientID: githubClientId,
            clientSecret: githubClientSecret,
            callbackURL: `${process.env.APP_URL || 'http://localhost:3000'}/user/auth/github/callback`,
            scope: ['user:email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('GitHub auth profile received:', {
                    id: profile.id,
                    username: profile.username,
                    emails: profile.emails ? 'Available' : 'Not available',
                });

                let email = null;
                if (profile.emails && profile.emails.length > 0) {
                    email = profile.emails[0].value;
                } else {
                    // Sometimes GitHub doesn't return public email, might need to handle this
                    // For now, we'll error out if no email
                    console.error('No email found in GitHub profile');
                    return done(new Error('No email found in GitHub profile. Please ensure your GitHub email is public or verify it.'), null);
                }

                // Check if a user already exists with this GitHub ID or email
                let user = await User.findOne({
                    $or: [
                        { githubId: profile.id },
                        { email: email }
                    ]
                });

                if (user) {
                    console.log('Existing user found for GitHub auth:', user.email);
                    // If user exists but doesn't have githubId, update it
                    if (!user.githubId) {
                        user.githubId = profile.id;

                        // Also update profile image if available and current one is default
                        if (profile.photos && profile.photos.length && user.profileImageURL === '/images/default.png') {
                            user.profileImageURL = profile.photos[0].value;
                        }

                        await user.save();
                        console.log('Updated existing user with GitHub ID');
                    }
                    return done(null, user);
                } else {
                    console.log('Creating new user for GitHub auth');
                    // Create a new user with GitHub profile data
                    const randomPassword = generatePassword();

                    const userData = {
                        fullName: profile.displayName || profile.username,
                        email: email,
                        password: randomPassword,
                        githubId: profile.id
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
                console.error('Error in GitHub auth strategy:', error);
                return done(error, null);
            }
        }));
        console.log('GitHub Strategy registered successfully!');
    } else {
        console.error('GitHub OAuth is DISABLED. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env');
    }
} catch (error) {
    console.error('Error setting up GitHub strategy:', error);
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