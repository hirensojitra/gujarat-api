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
                ORDER BY id
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
            // Destructure the request body to get the data to insert
            const { deleted, h, w, title, info, backgroundurl, data } = req.body;

            // Convert the data array to JSONB format
            const jsonData = JSON.stringify(data);

            // Generate a random ID
            const newPostId = Math.random().toString(36).substr(2, 9);

            // Construct the SQL INSERT statement with RETURNING clause to get the ID
            const insertQuery = `
                INSERT INTO post_details (id, deleted, h, w, title, info, backgroundurl, data)
                VALUES ($1, $2, $3, $4, $5, $6, $7,$8 )
                RETURNING id
            `;

            // Execute the INSERT statement and extract the ID of the newly added data
            const { rows } = await pool.query(insertQuery, [newPostId, deleted, h, w, title, info, backgroundurl, jsonData]);

            // Send the ID of the newly added data as a string in the response
            res.status(201).json({ id: newPostId, message: "Post added successfully" });
        } catch (error) {
            // Handle any errors
            console.error("Error adding post:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    // Update post details
    updateData: async (req, res) => {
        try {
            const {
                id,
                deleted,
                h,
                w,
                title,
                info,
                backgroundurl,
                data
            } = req.body;

            // Convert the data array to JSONB format
            const jsonData = JSON.stringify(data);
            // Construct the SQL UPDATE statement
            const updateQuery = `
        UPDATE post_details
        SET 
            deleted = $1,
            h = $2,
            w = $3,
            title = $4,
            info = $5, 
            backgroundurl = $6,
            data = $7
        WHERE id = $8 and deleted = false
      `;
            // Execute the UPDATE statement
            await pool.query(updateQuery, [
                deleted,
                h,
                w,
                title,
                info,
                backgroundurl,
                jsonData,
                id
            ]);

            // Send a success response
            res.status(200).json({ message: "Post data updated successfully" });
        } catch (error) {
            // Handle any errors
            console.error("Error updating post data:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },
    // Get post details by ID
    getDataById: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
        SELECT * FROM post_details
        WHERE id = $1 AND deleted = false
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
    // Soft delete post data by ID
    softDeleteData: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
        UPDATE post_details
        SET deleted = true
        WHERE id = $1
      `;
            await pool.query(query, [id]);
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
        SET deleted = false
        WHERE id = $1
      `;
            await pool.query(query, [id]);
            res.json({ message: "Restored successfully" });
        } catch (error) {
            console.error("Error restore data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    // Hard delete post data by ID
    hardDeleteData: async (req, res) => {
        try {
            const { id } = req.params;
            const query = `
        DELETE FROM post_details
        WHERE id = $1 and deleted = true
      `;
            await pool.query(query, [id]);
            res.json({ message: "Data hard deleted successfully" });
        } catch (error) {
            console.error("Error hard deleting data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    // Get all soft deleted post data
    getAllSoftDeletedData: async (req, res) => {
        try {
            const { page } = req.query;
            const pageSize = 12;
            const offset = (page - 1) * pageSize;
            const query = `
        SELECT * FROM post_details
        WHERE deleted = true
        ORDER BY id
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
    // Get total length of non-soft deleted post data
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
    // Get total length of soft deleted post data
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
            const query = `SELECT download_counter FROM post_details WHERE id = $1 and deleted = false
      `;
            const result = await pool.query(query, [id]);
            if (result.rows.length > 0) {
                return result.rows[0].download_counter;
            } else {
                throw new Error('Post not found');
            }
        } catch (error) {
            console.error("Post not found:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
    updateDownloadCounter: async (req, res) => {
        try {
            const { id } = req.params;
            const currentCounter = await getDownloadCounter(id); // Assuming you have a method to get the current download counter

            // Increment the current counter by 1
            const newCounter = currentCounter + 1;

            // Update the download counter in the database
            const updateQuery = `UPDATE post_details SET download_counter = $1 WHERE id = $2`;
            await pool.query(updateQuery, [newCounter, id]);

            // Return the updated counter value
            res.json({ download_counter: newCounter });
        } catch (error) {
            console.error("Error updating download counter:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

};

module.exports = postController;
