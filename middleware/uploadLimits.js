const multer = require('multer');

// Define allowed file types (for example, only images)
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

    // Check if the file's mimetype is allowed
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false); // Reject the file
    }
};

// Define upload limits
const limits = {
    fileSize: 20 * 1024 * 1024, // Limit file size to 20MB
};

// Export multer configuration with limits and file filter
const uploadLimits = multer({
    limits: limits,
    fileFilter: fileFilter
});

module.exports = uploadLimits;
