const jwt = require('jsonwebtoken');

// Get JWT Secret from environment or use a default
const JWT_SECRET = process.env.JWT_SECRET || "$uperMan@123";

function createTokenForUser(user) {
    const payload = {
        _id: user._id,
        email: user.email,
        profileImageURL: user.profileImageURL,
        role: user.role,
        fullName: user.fullName
    };
    
    return jwt.sign(payload, JWT_SECRET);
}

function validateToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = {
    createTokenForUser,
    validateToken
};