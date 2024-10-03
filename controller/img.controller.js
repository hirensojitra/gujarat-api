const path = require('path');
const fs = require('fs');
const pool = require("../database/index");
const multer = require('multer');
const sharp = require('sharp');


// Set up storage engine for Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const folderId = req.params.folderId;
        const uploadPath = path.join(__dirname, `../uploads/${folderId}`);

        // Ensure the directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Timestamped filename
    }
});

// Initialize multer for file uploads
const upload = multer({ storage: storage });

// Controller: Create a new folder and its associated table in the database
exports.createFolder = async (req, res) => {
    const { folderName } = req.body;

    try {
        // Insert folder into folders table
        const folderInsert = await pool.query('INSERT INTO folders (name) VALUES ($1) RETURNING id', [folderName]);
        const folderId = folderInsert.rows[0].id;

        // Dynamically create a table for the folder to store image paths
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${folderName}_images (
                id SERIAL PRIMARY KEY,
                folder_id INT NOT NULL,
                image_url TEXT NOT NULL,
                metadata JSONB,
                FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
            );
        `;
        await pool.query(createTableQuery);

        res.status(201).json({ message: 'Folder created', folderId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating folder' });
    }
};

// Controller: Get all folders (with pagination, searching, sorting)
exports.getFolders = async (req, res) => {
    const { page = 1, limit = 10, search = '', sort = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    try {
        const query = `
            SELECT * FROM folders
            WHERE name ILIKE $1
            ORDER BY name ${sort}
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [`%${search}%`, limit, offset]);

        res.status(200).json({ folders: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching folders' });
    }
};

// Controller: Upload an image to a folder
exports.uploadImage = [
    (req, res, next) => {
        upload.single('image')(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(500).json({ error: 'Multer error occurred while uploading.' });
            } else if (err) {
                return res.status(500).json({ error: 'An error occurred while uploading the file.' });
            }
            next();
        });
    },
    async (req, res) => {
        const { folderId } = req.params;
        const { metadata } = req.body;

        try {
            const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

            if (folderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Folder not found' });
            }

            const folderName = folderResult.rows[0].name;
            const imageUrl = `/uploads/${folderId}/${req.file.filename}`;

            const insertQuery = `
                INSERT INTO ${folderName}_images (folder_id, image_url, metadata)
                VALUES ($1, $2, $3) RETURNING id
            `;
            const result = await pool.query(insertQuery, [folderId, imageUrl, metadata]);

            res.status(201).json({ message: 'Image uploaded successfully', imageId: result.rows[0].id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error uploading image' });
        }
    }
];

// Controller: Get all images in a folder (with pagination, searching, sorting)
exports.getImagesInFolder = async (req, res) => {
    const { folderId } = req.params;
    const { page = 1, limit = 10, search = '', sort = 'asc' } = req.query;
    const offset = (page - 1) * limit;

    try {
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const query = `
            SELECT * FROM ${folderName}_images
            WHERE image_url ILIKE $1
            ORDER BY image_url ${sort}
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [`%${search}%`, limit, offset]);

        res.status(200).json({ images: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching images' });
    }
};

// Controller: Delete an image
exports.deleteImage = async (req, res) => {
    const { folderId, imageId } = req.params;

    try {
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const deleteQuery = `DELETE FROM ${folderName}_images WHERE id = $1`;
        await pool.query(deleteQuery, [imageId]);

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting image' });
    }
};
exports.getImageData = async (req, res) => {
    const { folderId, imageName } = req.params;
    const { quality, format, thumb } = req.query;
    try {
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const imagePath = path.join(__dirname, `../uploads/${folderId}/${imageName}`);

        // Check if the file exists
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Process the image using sharp based on query parameters
        let image = sharp(imagePath);

        // Handle quality
        if (quality) {
            image = image.jpeg({ quality: parseInt(quality) }); // Adjust as needed
        }

        // Handle format
        if (format) {
            switch (format.toLowerCase()) {
                case 'png':
                    image = image.png();
                    break;
                case 'webp':
                    image = image.webp();
                    break;
                case 'jpeg':
                case 'jpg':
                    image = image.jpeg();
                    break;
                case 'gif':
                    image = image.gif();
                    break;
                case 'tiff':
                case 'tif':
                    image = image.tiff();
                    break;
                case 'bmp':
                    image = image.bmp();
                    break;
                default:
                    image = image.jpeg();
            }
        }


        // Handle thumbnail request
        if (thumb) {
            image = image.resize(100); // Example for thumbnail
        }

        // Set the appropriate content type
        const contentType = format === 'png' ? 'image/png' : 'image/jpeg'; // Adjust for other formats as needed
        res.set('Content-Type', contentType);
        image.pipe(res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching image' });
    }
};