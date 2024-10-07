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


// Controller: Create a new folder and its associated table in the database
// Controller: Create a new folder and its associated table in the database
exports.createFolder = async (req, res) => {
    const { folderName } = req.body;

    try {
        // Sanitize the folder name to avoid SQL injection
        const sanitizedFolderName = sanitizeTableName(folderName);

        // Generate a unique alphanumeric folder ID
        const uniqueFolderId = await generateUniqueId('folders', 'id');

        // Insert folder into folders table and return the created_at timestamp
        const folderInsert = await pool.query(
            'INSERT INTO folders (id, name) VALUES ($1, $2) RETURNING created_at',
            [uniqueFolderId, folderName]
        );
        const createdAt = folderInsert.rows[0].created_at;

        // Dynamically create a table for the folder to store image paths
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${sanitizedFolderName}_images (
                id VARCHAR(5) PRIMARY KEY,
                folder_id VARCHAR(5) NOT NULL,
                image_url TEXT NOT NULL,
                metadata JSONB,
                FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
            );
        `;
        await pool.query(createTableQuery);

        // Return the newly created folder's details, including created_at timestamp
        res.status(201).json({ message: 'Folder created', folderId: uniqueFolderId, createdAt });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating folder' });
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
            const sanitizedFolderName = sanitizeTableName(folderName);
            const imageUrl = `/uploads/${folderId}/${req.file.filename}`;

            // Generate a unique alphanumeric image ID
            const uniqueImageId = await generateUniqueId(`${sanitizedFolderName}_images`, 'id');

            // Insert image record with the generated unique ID
            const insertQuery = `
                INSERT INTO ${sanitizedFolderName}_images (id, folder_id, image_url, metadata)
                VALUES ($1, $2, $3, $4) RETURNING id
            `;
            const result = await pool.query(insertQuery, [uniqueImageId, folderId, imageUrl, metadata]);

            res.status(201).json({ message: 'Image uploaded successfully', imageId: result.rows[0].id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error uploading image' });
        }
    }
];

// Controller: Get all folders (with pagination, searching, sorting)
exports.getFolders = async (req, res) => {
    const { page = 1, limit = 10, search = '', sortBy = 'created_at', order = 'asc' } = req.query;

    const offset = (page - 1) * limit; // Correct the offset calculation

    try {
        const query = `
            SELECT * FROM folders
            WHERE name ILIKE $1
            ORDER BY ${sortBy} ${order}
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [`%${search}%`, parseInt(limit), offset]);

        res.status(200).json({ folders: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching folders' });
    }
};
;
exports.getTotalFolderCount = async (req, res) => {
    const search = req.query.search || ''; // Get search query from request, default to empty string

    try {
        const query = `
        SELECT COUNT(*) as count 
        FROM folders 
        WHERE name ILIKE $1
      `;

        const result = await pool.query(query, [`%${search}%`]); // Execute the query with the search term
        const count = parseInt(result.rows[0].count, 10); // Parse the count to an integer

        res.json({ count }); // Respond with the count in JSON format
    } catch (error) {
        console.error('Error fetching total folder count:', error);
        res.status(500).json({ error: 'Internal Server Error' }); // Handle any errors
    }
};



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
        const sanitizedFolderName = sanitizeTableName(folderName);
        const query = `
            SELECT * FROM ${sanitizedFolderName}_images
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
exports.getTotalImageCountInFolder = async (req, res) => {
    const { folderId } = req.params;
    const { search = '' } = req.query;

    try {
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const sanitizedFolderName = sanitizeTableName(folderName);

        const query = `
            SELECT COUNT(*) as count FROM ${sanitizedFolderName}_images
            WHERE image_url ILIKE $1
        `;
        const result = await pool.query(query, [`%${search}%`]);

        res.status(200).json({ totalCount: parseInt(result.rows[0].count, 10) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching image count' });
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
        const sanitizedFolderName = sanitizeTableName(folderName);
        const deleteQuery = `DELETE FROM ${sanitizedFolderName}_images WHERE id = $1`;
        await pool.query(deleteQuery, [imageId]);

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting image' });
    }
};
exports.getImageData = async (req, res) => {
    const { folderId, imageId } = req.params;
    try {
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);
        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const sanitizedFolderName = sanitizeTableName(folderName);
        const deleteQuery = `DELETE FROM ${sanitizedFolderName}_images WHERE id = $1`;

        // First, find the file to be deleted
        const imageResult = await pool.query(`SELECT image_url FROM ${sanitizedFolderName}_images WHERE id = $1`, [imageId]);
        if (imageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Image not found in database' });
        }

        const imagePath = path.join(__dirname, `../uploads/${folderId}/${imageResult.rows[0].image_url}`);
        console.log('Attempting to delete file at path:', imagePath);

        // Check if the file exists
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting file:', err);
                    return res.status(500).json({ error: 'Error deleting file from filesystem' });
                }

                // After file is deleted, delete the record from the database
                pool.query(deleteQuery, [imageId], (dbErr) => {
                    if (dbErr) {
                        console.error('Error deleting image from database:', dbErr);
                        return res.status(500).json({ error: 'Error deleting image from database' });
                    }

                    res.status(200).json({ message: 'Image deleted successfully' });
                });
            });
        } else {
            return res.status(404).json({ error: 'File not found on the filesystem' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting image' });
    }
};
// Controller: Rename an existing folder
exports.renameFolder = async (req, res) => {
    const { folderId } = req.params;
    const { folderName } = req.body;

    try {
        // Fetch the old folder name from the database
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const oldFolderName = folderResult.rows[0].name;
        const oldSanitizedFolderName = sanitizeTableName(oldFolderName);
        const newSanitizedFolderName = sanitizeTableName(folderName);

        const oldFolderPath = path.join(__dirname, `../uploads/${folderId}`);
        const newFolderPath = path.join(__dirname, `../uploads/${newSanitizedFolderName}`);

        // Rename the folder on the file system
        fs.renameSync(oldFolderPath, newFolderPath);

        // Update the folder name in the database
        await pool.query('UPDATE folders SET name = $1 WHERE id = $2', [folderName, folderId]);

        // Rename the associated table in the database
        await pool.query(`ALTER TABLE ${oldSanitizedFolderName}_images RENAME TO ${newSanitizedFolderName}_images`);

        res.status(200).json({ message: 'Folder renamed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error renaming folder' });
    }
};

async function retryDelete(folderPath, retries = 5, delay = 100) {
    while (retries > 0) {
        try {
            await fsPromises.rm(folderPath, { recursive: true, force: true });
            break; // Exit the loop if successful
        } catch (err) {
            if (err.code === 'EBUSY' && retries > 0) {
                retries--;
                console.log(`Retrying to delete folder due to EBUSY. Retries left: ${retries}`);
                await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
            } else {
                throw err; // If error is not EBUSY or retries are exhausted, throw the error
            }
        }
    }
}

exports.deleteFolder = async (req, res) => {
    const { folderId } = req.params;

    try {
        // Fetch the folder name from the database
        const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);

        if (folderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const folderName = folderResult.rows[0].name;
        const sanitizedFolderName = sanitizeTableName(folderName);
        const folderPath = path.join(__dirname, `../uploads/${folderId}`);

        // Delete the associated table for the folder
        const dropTableQuery = `DROP TABLE IF EXISTS ${sanitizedFolderName}_images`;
        await pool.query(dropTableQuery);

        // Delete the folder from the database
        await pool.query('DELETE FROM folders WHERE id = $1', [folderId]);

        // Remove the folder from the file system with retries
        if (fs.existsSync(folderPath)) {
            await retryDelete(folderPath); // Use retry logic
        }

        res.status(200).json({ message: 'Folder deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting folder' });
    }
}
exports.refreshImage = [
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

        try {
            // Get the current image information from the database
            const folderResult = await pool.query('SELECT * FROM folders WHERE id = $1', [folderId]);
            if (folderResult.rows.length === 0) {
                return res.status(404).json({ error: 'Folder not found' });
            }

            const folderName = folderResult.rows[0].name;
            const sanitizedFolderName = sanitizeTableName(folderName);

            // Get the current image URL from the database
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
];