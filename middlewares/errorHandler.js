/**
 * Global Error Handling Middleware
 * Prevents stack trace leaks in production and provides consistent error responses.
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // In development, we can send the stack trace
    const response = {
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(statusCode).json(response);
    }

    // For regular page requests, render an error page if it exists, or just send text
    res.status(statusCode);

    // Check if we have an error view
    try {
        res.render('error', {
            error: response,
            user: req.user || null
        });
    } catch (renderError) {
        res.send(`<h1>Error ${statusCode}</h1><p>${message}</p>`);
    }
};

module.exports = errorHandler;
