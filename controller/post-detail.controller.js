const pool = require("../database/index");

const postController = {
    getAllData: async (req, res) => {
        try {
            const { page } = req.query;
            const pageSize = 12;
            const offset = (page - 1) * pageSize;
            const query = `
                SELECT * FROM post_details
                WHERE deleted = false
                ORDER BY created_at DESC
                OFFSET $1
                LIMIT $2;            
            `;
            const { rows } = await pool.query(query, [offset, pageSize]);
            res.json(rows);
        } catch (error) {
            console.error("Error retrieving data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    addPost: async (req, res) => {
        try {
            const { h, w, title, info, info_show, backgroundurl, data, download_counter } = req.body;
            const jsonData = JSON.stringify(data);
            const currentUTC = new Date().toISOString();
            const currentIST = new Date(currentUTC).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const newPostId = Math.random().toString(36).substr(2, 9);
            const insertQuery = `
                INSERT INTO post_details (deleted, h, w, title, info, info_show, backgroundurl, data, download_counter, created_at, updated_at,id)
                VALUES (false, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9,$10)
                RETURNING id
            `;
            const { rows } = await pool.query(insertQuery, [h, w, title, info, info_show, backgroundurl, jsonData, download_counter, currentIST, newPostId]);
            res.status(201).json({ id: rows[0].id, message: "Post added successfully" });
        } catch (error) {
            console.error("Error adding post:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    updateData: async (req, res) => {
        try {
            const { id, h, w, title, info, info_show, backgroundurl, data } = req.body;
            const jsonData = JSON.stringify(data);
            const currentUTC = new Date().toISOString();
            const currentIST = new Date(currentUTC).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const updateQuery = `
                UPDATE post_details
                SET h = $1,
                    w = $2,
                    title = $3,
                    info = $4,
                    info_show = $5,
                    backgroundurl = $6,
                    data = $7,
                    updated_at = $8
                WHERE id = $9
            `;
            await pool.query(updateQuery, [h, w, title, info, info_show, backgroundurl, jsonData, currentIST, id]);
            res.status(200).json({ message: "Post data updated successfully" });
        } catch (error) {
            console.error("Error updating post data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    getDataById: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                SELECT * FROM post_details
                WHERE id = $1
            `;
            const { rows } = await pool.query(query, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Data not found" });
            }
            res.json(rows[0]);
        } catch (error) {
            console.error("Error retrieving data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    softDeleteData: async (req, res) => {
        try {
            const { id } = req.params;
            const currentUTC = new Date().toISOString();
            const currentIST = new Date(currentUTC).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const query = `
                UPDATE post_details
                SET deleted_at = $1,
                deleted = true
                WHERE id = $2
            `;
            await pool.query(query, [currentIST, id]);
            res.json({ message: "Data soft deleted successfully" });
        } catch (error) {
            console.error("Error soft deleting data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    recoverData: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                UPDATE post_details
                SET deleted_at = NULL,
                deleted = false
                WHERE id = $1
            `;
            await pool.query(query, [id]);
            res.json({ message: "Restored successfully" });
        } catch (error) {
            console.error("Error restoring data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    hardDeleteData: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
                DELETE FROM post_details
                WHERE id = $1
            `;
            await pool.query(query, [id]);
            res.json({ message: "Data hard deleted successfully" });
        } catch (error) {
            console.error("Error hard deleting data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    getAllSoftDeletedData: async (req, res) => {
        try {
            const { page } = req.query;
            const pageSize = 12;
            const offset = (page - 1) * pageSize;
            const query = `
        SELECT * FROM post_details
        WHERE deleted = true
        ORDER BY deleted_at DESC
        OFFSET $1
        LIMIT $2
      `;
            const { rows } = await pool.query(query, [offset, pageSize]);
            res.json(rows);
        } catch (error) {
            console.error("Error retrieving soft deleted data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    getPostLength: async (req, res) => {
        try {
            const query = `
                SELECT COUNT(*) AS total_count FROM post_details
                WHERE deleted = false
            `;
            const { rows } = await pool.query(query);
            const totalCount = parseInt(rows[0].total_count);
            res.json({ totalLength: totalCount });
        } catch (error) {
            console.error("Error retrieving total length of non-soft deleted data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    getDeletedPostLength: async (req, res) => {
        try {
            const query = `
                SELECT COUNT(*) AS total_count FROM post_details
                WHERE deleted = true
            `;
            const { rows } = await pool.query(query);
            const totalCount = parseInt(rows[0].total_count);
            res.json({ totalLength: totalCount });
        } catch (error) {
            console.error("Error retrieving total length of soft deleted data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    getDownloadCounter: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `SELECT download_counter FROM post_details WHERE id = $1`;
            const { rows } = await pool.query(query, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Data not found" });
            }
            res.json(rows[0]);
        } catch (error) {
            console.error("Error retrieving download counter:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    updateDownloadCounter: async (req, res) => {
        try {
            const { id } = req.params;
            const currentUTC = new Date().toISOString();
            const currentIST = new Date(currentUTC).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
            const query = `SELECT download_counter FROM post_details WHERE id = $1`;
            const { rows } = await pool.query(query, [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Data not found" });
            }
            const currentCounter = rows[0].download_counter;
            const newCounter = currentCounter + 1;
            const updateQuery = `UPDATE post_details SET download_counter = $1, updated_at = $2 WHERE id = $3`;
            await pool.query(updateQuery, [newCounter, currentIST, id]);
            res.json({ download_counter: newCounter });
        } catch (error) {
            console.error("Error updating download counter:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
};

module.exports = postController;
