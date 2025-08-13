const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;
const pool = require("../database/index");
const multer = require("multer");
const sharp = require("sharp");

const MIME_TYPES = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
};

const VALID_FORMATS = Object.keys(MIME_TYPES);
function sanitizeTableName(folderName) {
  return folderName.replace(/[\s-]/g, "_").toLowerCase(); // Replace spaces and hyphens with underscores
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
    const randomName = Math.random().toString(36).substring(2, 8); // 6 random chars
    cb(null, randomName + path.extname(file.originalname));
  },
});

// Initialize multer for file uploads
const upload = multer({ storage: storage });
function generateAlphanumericId(length = 5) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Recursively generate and verify a unique alphanumeric ID for both folders and images
async function generateUniqueId(tableName, columnName) {
  const newId = generateAlphanumericId();

  // Query the table to check if the ID already exists
  const result = await pool.query(
    `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} = $1`,
    [newId]
  );

  // If the ID already exists, generate a new one recursively
  if (result.rows.length > 0) {
    return generateUniqueId(tableName, columnName); // Recursive call
  }

  return newId; // Unique ID found
}
const imgController = {
  // Controller: Create a new folder and its associated table in the database
  createFolder: async (req, res) => {
    const { folderName } = req.body;

    try {
      // Generate a unique alphanumeric folder ID
      const uniqueFolderId = await generateUniqueId("folders", "id");

      // Insert folder into folders table and return the created_at timestamp
      const folderInsert = await pool.query(
        "INSERT INTO folders (id, name) VALUES ($1, $2) RETURNING created_at",
        [uniqueFolderId, folderName]
      );
      const createdAt = folderInsert.rows[0].created_at;

      // Return the newly created folder's details, including created_at timestamp
      res
        .status(201)
        .json({
          message: "Folder created",
          folderId: uniqueFolderId,
          createdAt,
        });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error creating folder" });
    }
  },
  // Controller: Upload an image to a folder
  uploadImage: [
    (req, res, next) => {
      upload.single("image")(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          return res
            .status(500)
            .json({ error: "Multer error occurred while uploading." });
        } else if (err) {
          return res
            .status(500)
            .json({ error: "An error occurred while uploading the file." });
        }
        next();
      });
    },
    async (req, res) => {
      const { folderId } = req.params;
      const { metadata } = req.body;

      try {
        const folderResult = await pool.query(
          "SELECT * FROM folders WHERE id = $1",
          [folderId]
        );

        if (folderResult.rows.length === 0) {
          return res.status(404).json({ error: "Folder not found" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        // Generate a unique alphanumeric image ID
        const uniqueImageId = await generateUniqueId(`user_images`, "id");

        // Insert image record with the generated unique ID
        const insertQuery = `
                    INSERT INTO user_images (id, folder_id, image_url, metadata)
                    VALUES ($1, $2, $3, $4) RETURNING id
                `;
        const result = await pool.query(insertQuery, [
          uniqueImageId,
          folderId,
          imageUrl,
          metadata,
        ]);

        res
          .status(201)
          .json({
            message: "Image uploaded successfully",
            imageId: result.rows[0].id,
          });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error uploading image" });
      }
    },
  ],
  // Controller: Get all folders (with pagination, searching, sorting)
  getFolders: async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "created_at",
      order = "asc",
    } = req.query;
    const offset = (page - 1) * limit;
    try {
      const query = `
            SELECT * FROM folders
            WHERE name ILIKE $1
            ORDER BY ${sortBy} ${order}
            LIMIT $2 OFFSET $3
        `;
      const result = await pool.query(query, [
        `%${search}%`,
        parseInt(limit),
        offset,
      ]);

      res.status(200).json({ folders: result.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching folders" });
    }
  },
  getTotalFolderCount: async (req, res) => {
    const search = req.query.search || ""; // Get search query from request, default to empty string

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
      console.error("Error fetching total folder count:", error);
      res.status(500).json({ error: "Internal Server Error" }); // Handle any errors
    }
  },
  getImagesInFolder: async (req, res) => {
    const { folderId } = req.params;
    const { page = 1, limit = 10, search = "", sort = "asc" } = req.query; // Get userid from query
    const offset = (page - 1) * limit;
    try {
      const folderResult = await pool.query(
        "SELECT * FROM folders WHERE id = $1",
        [folderId]
      );

      if (folderResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Folder not found or not owned by user" });
      }

      const folderName = folderResult.rows[0].name;

      // Fetch images within the user's folder
      const query = `
                SELECT * FROM user_images
                WHERE folder_id = $1 AND image_url ILIKE $2
                ORDER BY image_url ${sort}
                LIMIT $3 OFFSET $4
            `;
      const result = await pool.query(query, [
        folderId,
        `%${search}%`,
        limit,
        offset,
      ]);

      res.status(200).json({ images: result.rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching images" });
    }
  },
  getTotalImageCountInFolder: async (req, res) => {
    const { folderId } = req.params;
    const { search = "" } = req.query;
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
      res.status(500).json({ error: "Error fetching image count" });
    }
  },
  // Controller: Delete an image
  deleteImage: async (req, res) => {
    const { folderId, imageId } = req.params;
    try {
      const imageResult = await pool.query(
        `SELECT image_url FROM user_images WHERE id = $1 and folder_id = $2`,
        [imageId, folderId]
      );
      const imageUrl = imageResult.rows[0].image_url;
      if (!imageUrl) {
        return res
          .status(404)
          .json({ error: "Image not found or does not belong to this user" });
      }
      const imagePath = path.join(
        __dirname,
        "../uploads",
        folderId,
        path.basename(imageUrl)
      );
      const deleteQuery = `DELETE FROM user_images WHERE id = $1`;
      await pool.query(deleteQuery, [imageId]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (fs.existsSync(imagePath)) {
        await fsPromises.unlink(imagePath);
      }
      // Delete the image from the images table
      res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error deleting image" });
    }
  },
  getImageData: async (req, res) => {
    const { imageId } = req.params;
    const { quality, format, thumb } = req.query;

    try {
      // Query the database to fetch the image URL and folder by imageId
      const imageResult = await pool.query(
        "SELECT image_url, folder_id FROM user_images WHERE id = $1",
        [imageId]
      );

      if (imageResult.rows.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }

      const imageUrl = imageResult.rows[0].image_url;
      const folderid = imageResult.rows[0].folder_id;
      const imagePath = path.join(
        __dirname,
        "../uploads",
        folderid,
        path.basename(imageUrl)
      );
      // Check if the image exists on the filesystem
      if (!fs.existsSync(imagePath)) {
        return res
          .status(404)
          .json({ error: "Image not found on the filesystem" });
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
          case "png":
            image = image.png();
            break;
          case "webp":
            image = image.webp();
            break;
          case "jpeg":
          case "jpg":
            image = image.jpeg();
            break;
          case "gif":
            image = image.gif();
            break;
          case "bmp":
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
      const contentType = format === "png" ? "image/png" : "image/jpeg";
      res.set("Content-Type", contentType);

      // Send the processed image
      image.pipe(res);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ error: "Error fetching image" });
    }
  },
  // Controller: Rename an existing folder
  renameFolder: async (req, res) => {
    const { folderId } = req.params;
    const { folderName } = req.body;

    try {
      // Fetch the old folder name from the database
      const folderResult = await pool.query(
        "SELECT * FROM folders WHERE id = $1",
        [folderId]
      );

      if (folderResult.rows.length === 0) {
        return res.status(404).json({ error: "Folder not found" });
      }

      const oldFolderName = folderResult.rows[0].id;
      const oldSanitizedFolderName = sanitizeTableName(oldFolderName);
      const newSanitizedFolderName = sanitizeTableName(folderName);

      const oldFolderPath = path.join(__dirname, `../uploads/${folderId}`);
      const newFolderPath = path.join(
        __dirname,
        `../uploads/${newSanitizedFolderName}`
      );

      fs.renameSync(oldFolderPath, newFolderPath);
      await pool.query("UPDATE folders SET name = $1 WHERE id = $2", [
        folderName,
        folderId,
      ]);

      res.status(200).json({ message: "Folder renamed successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error renaming folder" });
    }
  },
  deleteFolder: async (req, res) => {
    const { folderId } = req.params;

    try {
      // Fetch the folder name from the database
      const folderResult = await pool.query(
        "SELECT * FROM folders WHERE id = $1",
        [folderId]
      );
      if (folderResult.rows.length === 0) {
        return res.status(404).json({ error: "Folder not found" });
      }
      const folderPath = path.join(__dirname, `../uploads/${folderId}`);
      // Delete the folder from the database
      await pool.query("DELETE FROM folders WHERE id = $1", [folderId]);

      // Remove the folder from the file system with retries
      if (fs.existsSync(folderPath)) {
        await retryDelete(folderPath); // Use retry logic
      }

      res.status(200).json({ message: "Folder deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error deleting folder" });
    }
  },
  refreshImage: [
    // Middleware to handle file upload
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return res
            .status(500)
            .json({ error: "Multer error occurred while uploading." });
        } else if (err) {
          return res
            .status(500)
            .json({ error: "An error occurred while uploading the file." });
        }
        next();
      });
    },
    // Main function to refresh the image
    async (req, res) => {
      const { folderId, imageId } = req.params;

      try {
        // Get the current image information from the database
        const folderResult = await pool.query(
          "SELECT * FROM folders WHERE id = $1",
          [folderId]
        );
        if (folderResult.rows.length === 0) {
          return res.status(404).json({ error: "Folder not found" });
        }

        const folderName = folderResult.rows[0].name;
        const sanitizedFolderName = sanitizeTableName(folderName);

        // Get the current image URL from the database
        const imageResult = await pool.query(
          `SELECT image_url FROM user_images WHERE id = $1`,
          [imageId]
        );
        if (imageResult.rows.length === 0) {
          return res.status(404).json({ error: "Image not found" });
        }

        const oldImageUrl = imageResult.rows[0].image_url;
        const oldImagePath = path.join(
          __dirname,
          `../uploads/${folderId}`,
          path.basename(oldImageUrl)
        );

        // Delete the old image from the filesystem
        if (fs.existsSync(oldImagePath)) {
          await fsPromises.unlink(oldImagePath);
        } else {
          return res
            .status(404)
            .json({ error: "Old image not found on the filesystem" });
        }

        // Save the new image details in the database
        const newImageUrl = `/uploads/${req.file.filename}`;
        const updateQuery = `
                    UPDATE user_images 
                    SET image_url = $1 
                    WHERE id = $2
                `;
        await pool.query(updateQuery, [newImageUrl, imageId]);

        res
          .status(200)
          .json({
            message: "Image replaced successfully",
            imageUrl: newImageUrl,
          });
      } catch (error) {
        console.error("Error in refreshImage:", error);
        res.status(500).json({ error: "Error replacing image" });
      }
    },
  ],
};

async function retryDelete(folderPath, retries = 5, delay = 100) {
  while (retries > 0) {
    try {
      await fsPromises.rm(folderPath, { recursive: true, force: true });
      break; // Exit the loop if successful
    } catch (err) {
      if (err.code === "EBUSY" && retries > 0) {
        retries--;
        console.log(
          `Retrying to delete folder due to EBUSY. Retries left: ${retries}`
        );
        await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
      } else {
        throw err; // If error is not EBUSY or retries are exhausted, throw the error
      }
    }
  }
}

module.exports = imgController;
