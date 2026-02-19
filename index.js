// Load environment variables first
require('dotenv').config();
console.log('Environment variables loaded:', {
    GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET_EXISTS: !!process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY_EXISTS: !!process.env.GEMINI_API_KEY
});

const express = require('express');
const path = require('path');
const ejs = require('ejs')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override');
const multer = require('multer');
const session = require('express-session');
const passport = require('./config/passport');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/blogfy';
mongoose.connect(mongoUrl)
    .then((e) => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Ensure upload directories exist
const fs = require('fs');
const uploadDirs = [
    path.join(__dirname, 'public/uploads'),
    path.join(__dirname, 'public/uploads/profiles')
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

const Blog = require('./models/blog')
const User = require('./models/user')

const userRoute = require('./routes/user')
const blogRoute = require('./routes/blog')
const profileRoute = require('./routes/profile');
const commentRoute = require('./routes/comments');
const socialRoute = require('./routes/social');
const editBlogRoute = require('./routes/edit-blog');

const { checkForAuthenticationCookie } = require('./middlewares/authentication');
const http = require('http');
const { Server } = require('socket.io');
const botRoute = require('./routes/bot');
const { initSocket } = require('./gateway/socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket logic
initSocket(io);

const PORT = process.env.PORT || 8000;

app.set("view engine", "ejs")
app.set("views", path.resolve("views"));


// Use helmet for security headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now as it might block external assets (Google Fonts, etc.)
}));

//middleware
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(methodOverride('_method'))
app.use(checkForAuthenticationCookie("token"))

// Make user available in templates (must be before routes)
app.use((req, res, next) => {
    const { token } = req.cookies;
    if (token) {
        try {
            // Use environment variable for JWT_SECRET with fallback
            const JWT_SECRET = process.env.JWT_SECRET || "$uperMan@123";
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;
        } catch (error) {
            console.error('JWT verification error:', error);
            res.clearCookie("token");
            return res.redirect('/');
        }
    }
    next();
});

// Set up Express session before initializing Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Express middleware to make user available in all views
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Serve static files from public directory
app.use(express.static(path.resolve('./public')));
app.use('/public', express.static(path.resolve('./public')));
app.use('/uploads', express.static(path.resolve('./public/uploads')));
app.use('/images', express.static(path.resolve('./public/images')));

// Specific route for avatar image to ensure it's always available
app.get('/images/avatar.avif', (req, res) => {
    const avatarPath = path.join(__dirname, 'public', 'images', 'default.png');
    res.sendFile(avatarPath);
});

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.url.includes('/uploads/')) {
        console.log('Static file request for:', req.url);
        // Check if file exists
        const filePath = path.join(__dirname, 'public', req.url);
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
            console.log('File exists at:', filePath);
        } else {
            console.log('File does not exist at:', filePath);
        }
    }
    next();
});

// Direct handler for profile images to bypass cache issues
app.get('/uploads/profiles/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'public/uploads/profiles', req.params.filename);
    console.log('Direct profile image request for:', filePath);

    const fs = require('fs');
    if (fs.existsSync(filePath)) {
        console.log('Sending file directly from:', filePath);
        res.sendFile(filePath);
    } else {
        console.log('File not found, sending default image');
        res.sendFile(path.join(__dirname, 'public/images/default.png'));
    }
});

app.use(express.json()) // Add JSON support for API routes
app.use('/comment', commentRoute);
// app.get('/',async(req,res)=>{
//     const allBlogs = await Blog.find({});
//     return res.render('home',{
//         user: req.user,
//         blogs: allBlogs
//     });
// })
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'public/uploads/')); // Save images in the "uploads" folder
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage: storage });

// Image upload endpoint
app.post('/upload-image', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`; // Return the image URL
    res.json({ location: imageUrl });
});

// Media files upload endpoint for TinyMCE
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ location: fileUrl });
});

app.get('/', async (req, res) => {
    try {
        const blogs = await Blog.find({}).populate('createdBy');

        // Group blogs by category
        const blogsByCategory = blogs.reduce((acc, blog) => {
            if (!acc[blog.category]) {
                acc[blog.category] = [];
            }
            acc[blog.category].push(blog);
            return acc;
        }, {});

        // Define category colors
        const categoryColors = {
            Technology: '#007bff', // Blue
            Travel: '#28a745',     // Green
            Food: '#dc3545',       // Red
            Lifestyle: '#ffc107',  // Yellow
            Fashion: '#6f42c1',    // Purple
            Other: '#17a2b8',      // Cyan
        };

        // Real statistics for the platform
        const [totalUsers, totalBlogs] = await Promise.all([
            User.countDocuments({}),
            Blog.countDocuments({})
        ]);

        return res.render('home', {
            user: req.user,
            blogsByCategory,
            categoryColors,
            stats: {
                users: totalUsers,
                blogs: totalBlogs,
                countries: 12 // Hardcoded for now but can be derived if location is added later
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

const chatRoute = require('./routes/chat');

app.use('/user', userRoute)
// If any request start with /user then use `userRoute`
app.use('/blog', blogRoute)
app.use('/profile', profileRoute);
app.use('/social', socialRoute);
app.use('/edit-blog', editBlogRoute);
app.use('/chat', chatRoute);
app.use('/api/bot', botRoute);

// Debug routes - Disable in production
if (process.env.NODE_ENV !== 'production') {
    // Debug image route
    app.get('/debug-image', (req, res) => {
        // ... (existing debug code)
    });

    // Test route for checking file access
    app.get('/test-static', (req, res) => {
        // ... (existing debug code)
    });

    // Debug profile image route
    app.get('/debug-profile-image', (req, res) => {
        // ... (existing debug code)
    });
}

// Global Error Handler (must be last)
app.use(errorHandler);

server.listen(PORT, () => console.log(`Server started at PORT:${PORT}`));
