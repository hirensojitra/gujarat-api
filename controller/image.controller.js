const fs = require('fs-extra');
const path = require('path');
const pool = require("../database/index");

const imagesDir = path.join(__dirname, '../images');

const imageController = {
    async getAllImages(req, res) {
        try {
            const query = 'SELECT * FROM images_data WHERE is_deleted = false';
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error("Error fetching images:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async getAllDeletedImages(req, res) {
        try {
            const query = 'SELECT * FROM images_data WHERE is_deleted = true';
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error("Error fetching is_deleted images:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async addImage(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const { label, description } = req.body;
            const filename = req.file.filename;
            const filepath = `/images/${filename}`;

            const query = {
                text: 'INSERT INTO images_data (label, filepath, description) VALUES ($1, $2, $3) RETURNING *',
                values: [label, filepath, description]
            };

            const result = await pool.query(query);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error("Error adding image:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async softDeleteImage(req, res) {
        try {
            const { id } = req.params;

            const query = {
                text: 'UPDATE images_data SET is_deleted = true WHERE id = $1 RETURNING *',
                values: [id]
            };

            const result = await pool.query(query);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Image not found" });
            }

            const imagePath = path.join(imagesDir, path.basename(result.rows[0].filepath));
            await fs.rename(imagePath, `${imagePath}.deleted`);

            res.json(result.rows[0]);
        } catch (error) {
            console.error("Error soft deleting image:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async restoreImage(req, res) {
        try {
            const { id } = req.params;

            const query = {
                text: 'UPDATE images_data SET is_deleted = false WHERE id = $1 RETURNING *',
                values: [id]
            };

            const result = await pool.query(query);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Image not found" });
            }

            const imagePath = path.join(imagesDir, path.basename(result.rows[0].filepath));
            await fs.rename(`${imagePath}.deleted`, imagePath);

            res.json(result.rows[0]);
        } catch (error) {
            console.error("Error restoring image:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    async hardDeleteImage(req, res) {
        try {
            const { id } = req.params;

            const query = {
                text: 'DELETE FROM images_data WHERE id = $1 RETURNING *',
                values: [id]
            };

            const result = await pool.query(query);
            if (result.rows.length === 0) {
                return res.status(404).json({ message: "Image not found" });
            }

            const imagePath = path.join(imagesDir, path.basename(result.rows[0].filepath));
            await fs.remove(imagePath);
            await fs.remove(`${imagePath}.deleted`);

            res.json({ message: "Image is_deleted successfully" });
        } catch (error) {
            console.error("Error hard deleting image:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = imageController;
