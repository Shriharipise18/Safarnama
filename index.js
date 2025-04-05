// Load environment variables first
require('dotenv').config();
console.log('Environment variables loaded:', {
    GOOGLE_CLIENT_ID_EXISTS: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET_EXISTS: !!process.env.GOOGLE_CLIENT_SECRET
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

mongoose.connect('mongodb://127.0.0.1:27017/blogfy')
.then((e)=> console.log("MongoDB Connected"))

const Blog = require('./models/blog')

const userRoute = require('./routes/user')
const blogRoute = require('./routes/blog')
const profileRoute = require('./routes/profile');
const commentRoute = require('./routes/comments');
const socialRoute = require('./routes/social');
const editBlogRoute = require('./routes/edit-blog');

const { checkForAuthenticationCookie } = require('./middlewares/authentication');
const app = express();
const PORT = process.env.PORT || 5000;

app.set("view engine","ejs")
app.set("views", path.resolve( "views"));

//middleware
app.use(express.urlencoded({extended:false}))
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
    const avatarPath = path.join(__dirname, 'public', 'images', 'avatar.avif');
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
        cb(null, path.resolve('./public/uploads/')); // Save images in the "uploads" folder
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

        return res.render('home', {
            user: req.user,
            blogsByCategory,
            categoryColors,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

app.use('/user',userRoute) 
// If any request start with /user then use `userRoute`
app.use('/blog',blogRoute) 
app.use('/profile', profileRoute);
app.use('/social', socialRoute);
app.use('/edit-blog', editBlogRoute);

// Debug image route
app.get('/debug-image', (req, res) => {
    const imageToTest = req.query.image || '/uploads/profiles/profile-1743825604464-41655838.jpg';
    const defaultImage = '/images/default.png';
    
    res.send(`
        <html>
        <head>
            <title>Image Debug</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .image-container { border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; }
                img { max-width: 300px; margin-bottom: 10px; }
                .debug-info { font-family: monospace; background: #f0f0f0; padding: 10px; }
            </style>
        </head>
        <body>
            <h1>Image Debug Page</h1>
            
            <div class="image-container">
                <h2>Test Image (${imageToTest})</h2>
                <img src="${imageToTest}" onerror="this.onerror=null; this.src='${defaultImage}'; document.getElementById('error-msg').style.display='block';">
                <div id="error-msg" style="display:none; color:red;">Error loading image!</div>
                <div class="debug-info">
                    <p>Image path: ${imageToTest}</p>
                    <p>Timestamp: ${new Date().toISOString()}</p>
                </div>
            </div>
            
            <div class="image-container">
                <h2>Default Image (${defaultImage})</h2>
                <img src="${defaultImage}">
                <div class="debug-info">
                    <p>Default image path: ${defaultImage}</p>
                </div>
            </div>
            
            <h2>Test Another Image:</h2>
            <form action="/debug-image" method="GET">
                <input type="text" name="image" placeholder="/path/to/image.jpg" style="width:300px;">
                <button type="submit">Test</button>
            </form>
        </body>
        </html>
    `);
});

// Test route for checking file access
app.get('/test-static', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    
    // Check if public directory exists
    const publicDir = path.resolve('./public');
    const publicExists = fs.existsSync(publicDir);
    
    // Check if uploads directory exists
    const uploadsDir = path.resolve('./public/uploads');
    const uploadsExists = fs.existsSync(uploadsDir);
    
    // Check if profiles directory exists
    const profilesDir = path.resolve('./public/uploads/profiles');
    const profilesExists = fs.existsSync(profilesDir);
    
    // List files in profiles directory if it exists
    let profileFiles = [];
    if (profilesExists) {
        try {
            profileFiles = fs.readdirSync(profilesDir);
        } catch (err) {
            console.error('Error reading profiles directory:', err);
        }
    }
    
    res.json({
        publicDirExists: publicExists,
        uploadsDirExists: uploadsExists,
        profilesDirExists: profilesExists,
        publicDirPath: publicDir,
        uploadsDirPath: uploadsDir,
        profilesDirPath: profilesDir,
        profileFiles: profileFiles
    });
});

// Debug profile image route
app.get('/debug-profile-image', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Profile Image Debug</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .test-container { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; }
                img { display: block; margin-bottom: 10px; }
                pre { background: #f5f5f5; padding: 10px; overflow: auto; }
            </style>
        </head>
        <body>
            <h1>Profile Image Debugger</h1>
            
            <div class="test-container">
                <h2>Direct Fallback Test</h2>
                <img src="/images/avatar.avif" width="100" height="100" style="border-radius: 50%;">
                <p>This tests if the fallback image is accessible directly.</p>
            </div>
            
            <div class="test-container">
                <h2>Error Fallback Test</h2>
                <img src="/non-existent-image.jpg" width="100" height="100" style="border-radius: 50%;" 
                     onerror="this.src='/images/avatar.avif'; console.log('Fallback applied')">
                <p>This tests if the onerror fallback works correctly.</p>
            </div>
            
            <div class="test-container">
                <h2>Image Paths in Application</h2>
                <pre>
/images/avatar.avif - Primary fallback path
/public/avatar.avif - Secondary fallback path
                </pre>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT , ()=>console.log(`Server started at PORT:${PORT}`));