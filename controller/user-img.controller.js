const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const pool = require("../database/index");
const multer = require('multer');
const sharp = require('sharp');

function sanitizeTableName(folderName) {
    return folderName.replace(/[\s-]/g, '_').toLowerCase(); // Replace spaces and hyphens with underscores
}
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
function generateAlphanumericId(length = 5) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Recursively generate and verify a unique alphanumeric ID for both folders and images
async function generateUniqueId(tableName, columnName) {
    const newId = generateAlphanumericId();

    // Query the table to check if the ID already exists
    const result = await pool.query(`SELECT ${columnName} FROM ${tableName} WHERE ${columnName} = $1`, [newId]);

    // If the ID already exists, generate a new one recursively
    if (result.rows.length > 0) {
        return generateUniqueId(tableName, columnName); // Recursive call
    }

    return newId; // Unique ID found
}
const imgController = {
    // Controller: Create a new folder and its associated table in the database
    createFolder: async (req, res) => {
        const { folderName, userid } = req.body;
        try {

            // Generate a unique alphanumeric folder ID
            const uniqueFolderId = await generateUniqueId('folders', 'id');

            // Insert folder into the folders table with the user ID and return the created_at timestamp
            const folderInsert = await pool.query(
                'INSERT INTO folders (id, name, user_id) VALUES ($1, $2, $3) RETURNING created_at',
                [uniqueFolderId, folderName, userid]
            );
            const folderPath = path.join(__dirname, `../uploads/${uniqueFolderId}`);

            // Create the folder in the file system
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath, { recursive: true });
            }
            const createdAt = folderInsert.rows[0].created_at;
            // Return the newly created folder's details, including created_at timestamp
            res.status(201).json({ message: 'Folder created', folderId: uniqueFolderId, createdAt });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error creating folder' });
        }
    },
    // Controller: Upload an image to a folder
    uploadImage: [
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
            const { userid, folderId } = req.body;
            const { filename } = req.file;
            console.log(req.body)
            try {
                const imageId = await generateUniqueId('user_images', 'id');
                const imageUrl = `/uploads/${filename}`; // Store the relative path to the image
                await pool.query(
                    'INSERT INTO user_images (id, folder_id, image_url) VALUES ($1, $2, $3)',
                    [imageId, folderId, imageUrl]
                );

                // Step 3: Return success response with image details
                res.status(201).json({
                    message: 'Image uploaded successfully',
                    imageId,
                    imageUrl
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Error uploading image' });
            }
        }
    ],
    // Controller: Get all folders (with pagination, searching, sorting)
    getFolders: async (req, res) => {
        const { page = 1, limit = 10, search = '', sortBy = 'created_at', order = 'asc', userid } = req.query;
        const offset = (page - 1) * limit;
        try {
            // Fetch user-specific folders with pagination, searching, and sorting
            const query = `
                SELECT * FROM folders
                WHERE user_id = $1 AND name ILIKE $2
                ORDER BY ${sortBy} ${order}
                LIMIT $3 OFFSET $4
            `;
            const result = await pool.query(query, [userid, `%${search}%`, parseInt(limit), offset]);
            res.status(200).json({ folders: result.rows });
        } catch (error) {
            console.error('Error fetching folders:', error);
            res.status(500).json({ error: 'Error fetching folders', details: error.message });
        }
    }
    ,
    getTotalFolderCount: async (req, res) => {
        const userid = req.query.userid || req.query.userid; // Accept userid from body or query parameters
        const search = req.query.search || ''; // Search query, default to an empty string if not provided

        if (!userid) {
            return res.status(400).json({ error: 'User ID is required' }); // Respond with an error if userid is not provided
        }

        try {
            // Query to count the folders owned by the user
            const query = `
                SELECT COUNT(*) as count
                FROM folders
                WHERE user_id = $1 AND name ILIKE $2
            `;

            const result = await pool.query(query, [userid, `%${search}%`]);
            const count = parseInt(result.rows[0].count, 10); // Parse the count as an integer

            res.json({ count }); // Return the folder count in the response
        } catch (error) {
            console.error('Error fetching total folder count:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    getImagesInFolder: async (req, res) => {
        const { folderId } = req.params;
        const { page = 1, limit = 10, search = '', sort = 'asc', userid } = req.query; // Get userid from query
        const offset = (page - 1) * limit;
        try {
            // Ensure userid is provided
            if (!userid) {
                return res.status(400).json({ error: 'User ID is required' });
            }

            // Fetch the folder by folderId and check if it belongs to the current user

            const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1 AND user_id = $2', [folderId, userid]);

            if (folderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Folder not found or not owned by user' });
            }

            // Fetch images within the user's folder
            const query = `
                SELECT * FROM user_images
                WHERE folder_id = $1 AND image_url ILIKE $2
                ORDER BY image_url ${sort}
                LIMIT $3 OFFSET $4
            `;
            const result = await pool.query(query, [folderId, `%${search}%`, limit, offset]);

            res.status(200).json({ images: result.rows });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error fetching images' });
        }
    },
    getTotalImageCountInFolder: async (req, res) => {
        const { folderId } = req.params;
        const { search = '' } = req.query;
        try {
            const query = `
                SELECT COUNT(*) as count FROM user_images
                WHERE folder_id = $1 AND image_url ILIKE $2
            `;
            const result = await pool.query(query, [folderId, `%${search}%`]);
            const totalCount = parseInt(result.rows[0].count, 10);
            res.status(200).json({ totalCount });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error fetching image count' });
        }
    }
    ,
    // Controller: Delete an image
    deleteImage: async (req, res) => {
        const { folderId, imageId } = req.params;

        try {
            // Fetch the image URL from the database
            const imageResult = await pool.query(`SELECT image_url FROM user_images WHERE id = $1 AND folder_id = $2`, [imageId, folderId]);

            // Check if the image exists
            if (imageResult.rows.length === 0) {
                return res.status(404).json({ error: 'Image not found or does not belong to this folder' });
            }

            const imageUrl = imageResult.rows[0].image_url;
            const imagePath = path.join(__dirname, '../uploads', folderId, path.basename(imageUrl));

            console.log('Attempting to delete:', imagePath); // Log the path to be deleted

            // Check if the file exists in the filesystem
            if (fs.existsSync(imagePath)) {
                await fsPromises.rm(imagePath, { recursive: true, force: true });
                console.log('File deleted successfully'); // Log success message

                // Only delete the image record from the database after successful file deletion
                await pool.query(`DELETE FROM user_images WHERE id = $1`, [imageId]);

                // Respond with a success message
                res.status(200).json({ message: 'Image deleted successfully' });
            } else {
                console.error('File does not exist:', imagePath); // Log if the file does not exist
                return res.status(404).json({ error: 'Image file not found in the filesystem' });
            }
        } catch (error) {
            console.error('Error deleting image:', error); // Log the error
            res.status(500).json({ error: 'Error deleting image' });
        }
    },

    getImageData: async (req, res) => {
        const { imageId } = req.params;
        const { quality, format, thumb } = req.query;

        try {
            // Query the database to fetch the image URL and folder by imageId
            const imageResult = await pool.query(
                'SELECT image_url, folder_id FROM user_images WHERE id = $1',
                [imageId]
            );

            if (imageResult.rows.length === 0) {
                return res.status(404).json({ error: 'Image not found' });
            }

            const imageUrl = imageResult.rows[0].image_url;
            const folderid = imageResult.rows[0].folder_id;
            const imagePath = path.join(__dirname, '../uploads', folderid, path.basename(imageUrl));
            // Check if the image exists on the filesystem
            if (!fs.existsSync(imagePath)) {
                return res.status(404).json({ error: 'Image not found on the filesystem' });
            }

            // Load the image using Sharp
            let image = sharp(imagePath);

            // Apply quality setting if specified
            if (quality) {
                const parsedQuality = parseInt(quality);
                if (!isNaN(parsedQuality)) {
                    image = image.jpeg({ quality: parsedQuality });
                }
            }

            // Handle format conversion (defaults to JPEG if not specified)
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
                    case 'bmp':
                        image = image.bmp();
                        break;
                    default:
                        image = image.jpeg();
                }
            }

            // Generate a thumbnail if requested
            if (thumb) {
                image = image.resize(100); // Resize to a 100px thumbnail
            }

            // Set the content type for the response
            const contentType = format === 'png' ? 'image/png' : 'image/jpeg';
            res.set('Content-Type', contentType);

            // Send the processed image
            image.pipe(res);
        } catch (error) {
            console.error('Error fetching image:', error);
            res.status(500).json({ error: 'Error fetching image' });
        }
    },
    // Controller: Rename an existing folder
    renameFolder: async (req, res) => {
        const { folderId } = req.params;
        const { folderName } = req.body;
        const { userid } = req.user;

        try {
            // Fetch the folder details from the database
            const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

            if (folderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Folder not found' });
            }

            const folder = folderResult.rows[0];

            // Check if the folder belongs to the user
            if (folder.user_id !== userid) {
                return res.status(403).json({ error: 'You do not have permission to rename this folder' });
            }
            await pool.query('UPDATE folders SET name = $1 WHERE id = $2', [folderName, folderId]);
            return res.status(200).json({ message: 'Folder renamed successfully' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error renaming folder' });
        }
    },
    deleteFolder: async (req, res) => {
        const { folderId } = req.params; // Extract the folder ID from the request parameters

        try {
            // Fetch the folder from the database to check ownership
            const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

            if (folderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Folder not found or access denied' });
            }

            // Assuming the user_id is stored in the folder's database record
            const folder = folderResult.rows[0];
            const folderPath = path.join(__dirname, `../uploads/${folderId}`);

            // Check if the folder exists and delete its contents
            if (fs.existsSync(folderPath)) {
                await fsPromises.rm(folderPath, { recursive: true, force: true });
            }

            // Remove the folder entry from the database
            await pool.query('DELETE FROM folders WHERE id = $1', [folderId]);

            // Send a success response
            res.status(200).json({ message: 'Folder deleted successfully' });
        } catch (error) {
            console.error('Error deleting folder:', error);
            res.status(500).json({ error: 'Error deleting folder' });
        }
    }
    ,
    refreshImage: [
        // Middleware to handle file upload
        (req, res, next) => {
            upload.single('image')(req, res, (err) => {
                if (err instanceof multer.MulterError) {
                    return res.status(500).json({ error: 'Multer error occurred while uploading.' });
                } else if (err) {
                    return res.status(500).json({ error: 'An error occurred while uploading the file.' });
                }
                next();
            });
        },
        // Main function to refresh the image
        async (req, res) => {
            const { folderId, imageId } = req.params;
            const userid = req.body.userid; // Assuming userid is sent in the request body

            try {
                // Check if the folder belongs to the user
                const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1 AND user_id = $2', [folderId, userid]);
                if (folderResult.rows.length === 0) {
                    return res.status(404).json({ error: 'Folder not found or you do not have permission to access it.' });
                }

                const folderName = folderResult.rows[0].name;
                const sanitizedFolderName = sanitizeTableName(folderName);

                // Get the current image information from the database
                const imageResult = await pool.query(`SELECT image_url FROM ${sanitizedFolderName}_images WHERE id = $1`, [imageId]);
                if (imageResult.rows.length === 0) {
                    return res.status(404).json({ error: 'Image not found' });
                }

                const oldImageUrl = imageResult.rows[0].image_url;
                const oldImagePath = path.join(__dirname, `../uploads/${folderId}`, path.basename(oldImageUrl));

                // Delete the old image from the filesystem
                if (fs.existsSync(oldImagePath)) {
                    await fsPromises.unlink(oldImagePath);
                } else {
                    return res.status(404).json({ error: 'Old image not found on the filesystem' });
                }

                // Save the new image details in the database
                const newImageUrl = `/uploads/${folderId}/${req.file.filename}`;
                const updateQuery = `
                    UPDATE ${sanitizedFolderName}_images 
                    SET image_url = $1 
                    WHERE id = $2
                `;
                await pool.query(updateQuery, [newImageUrl, imageId]);

                res.status(200).json({ message: 'Image replaced successfully', imageUrl: newImageUrl });
            } catch (error) {
                console.error('Error in refreshImage:', error);
                res.status(500).json({ error: 'Error replacing image' });
            }
        }
    ]

}
module.exports = imgController;