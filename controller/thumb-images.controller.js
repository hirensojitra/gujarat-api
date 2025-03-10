const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const thumbDir = path.join(__dirname, '../uploads/thumb');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    cb(null, thumbDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Controller functions
const imagesController = {
  // Upload new thumbnail
  putImage: [
    upload.single("thumbnail"),
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
  
        const thumbDir = path.join(__dirname, "../uploads/thumb");
        const originalFilename = req.file.originalname;
        const newFilePath = path.join(thumbDir, originalFilename);
  
        // Rename the uploaded file to maintain original filename
        fs.renameSync(req.file.path, newFilePath);  
        res.status(201).json({
          message: "Thumbnail uploaded successfully",
          filename: originalFilename, // Preserve original filename
          path: `/thumb/${originalFilename}`,
        });
      } catch (error) {
        console.error("Thumbnail upload error:", error);
        res.status(500).json({ error: "Failed to upload thumbnail" });
      }
    },
  ],
  
  // Get thumbnail(s)
  getImages: async (req, res) => {
    const { id } = req.params; // Get image ID from URL
    const { quality, format, thumb } = req.query;

    try {
        const thumbDir = path.join(__dirname, "../uploads/thumb");
        // Construct the full image path
        const imagePath = path.join(thumbDir, `${id}.jpg`); // Ensure the correct file extension

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: "Thumbnail not found" });
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
        let outputFormat = "jpeg"; // Default to JPEG
        if (format) {
            switch (format.toLowerCase()) {
                case "png":
                    image = image.png();
                    outputFormat = "png";
                    break;
                case "webp":
                    image = image.webp();
                    outputFormat = "webp";
                    break;
                case "jpeg":
                case "jpg":
                    image = image.jpeg();
                    outputFormat = "jpeg";
                    break;
                case "gif":
                    image = image.gif();
                    outputFormat = "gif";
                    break;
                case "bmp":
                    image = image.bmp();
                    outputFormat = "bmp";
                    break;
                default:
                    image = image.jpeg();
                    outputFormat = "jpeg";
            }
        }

        // Generate a thumbnail if requested
        if (thumb) {
            image = image.resize(100); // Resize to a 100px thumbnail
        }

        // Set the content type for the response
        res.set("Content-Type", `image/${outputFormat}`);

        // Send the processed image
        image.pipe(res);

    } catch (error) {
        console.error("Error fetching image:", error);
        res.status(500).json({ error: "Error fetching image" });
    }
},

  // Delete thumbnail
  deleteImages: (req, res) => {
    if (!req.query.filename) {
      return res.status(400).json({ error: 'Filename parameter required' });
    }

    const filePath = path.join(__dirname, '../uploads/thumb', req.query.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete thumbnail' });
        }
        res.json({ message: 'Thumbnail deleted successfully' });
      });
    } else {
      res.status(404).json({ error: 'Thumbnail not found' });
    }
  },

  // Update thumbnail
  updateImage: [
    upload.single("thumbnail"),
    (req, res) => {
      try {
        if (!req.params.id) {
          return res.status(400).json({ error: "Thumbnail ID required" });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
  
        const thumbDir = path.join(__dirname, "../uploads/thumb");
        const oldFilePath = path.join(thumbDir, req.params.id);
        const newFilePath = path.join(thumbDir, req.params.id);
  
        // Remove old file only if it exists
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
  
        // Rename uploaded file to match original filename
        fs.renameSync(req.file.path, newFilePath);
  
        res.json({
          message: "Thumbnail updated successfully",
          filename: req.params.id, // Keep the original filename
          path: `/thumb/${req.params.id}`,
        });
      } catch (error) {
        console.error("Thumbnail update error:", error);
        res.status(500).json({ error: "Failed to update thumbnail" });
      }
    },
  ]  
};

module.exports = imagesController;