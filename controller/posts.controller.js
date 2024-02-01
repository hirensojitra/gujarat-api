const pool = require("../database/index");

const postController = {
  getAllData: async (req, res) => {
    try {
      const { page } = req.query;
      const pageSize = 12;
      const offset = (page - 1) * pageSize;
      const query = `
                SELECT * FROM post_data
                ORDER BY id
                OFFSET $1
                LIMIT $2
            `;
      const { rows } = await pool.query(query, [offset, pageSize]);
      res.json(rows);
    } catch (error) {
      console.error("Error retrieving data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  // Add new post
  addPost(req, res) {
    try {
      // Destructure the request body to get the data to insert
      const {
        type,
        avatar,
        name,
        address,
        deleted_at,
        "text-group": textGroup,
        details,
      } = req.body;

      // Construct the SQL INSERT statement
      const insertQuery = `
        INSERT INTO post_data (type, avatar, name, address, deleted_at, text_group, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      // Execute the INSERT statement
      pool.query(insertQuery, [
        type,
        avatar,
        name,
        address,
        deleted_at,
        textGroup,
        details,
      ]);

      // Send a success response
      res.status(201).json({ message: "Post added successfully" });
    } catch (error) {
      // Handle any errors
      console.error("Error adding post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  updateData: async (req, res) => {
    try {
      const {
        id,
        type,
        avatar,
        name,
        address,
        deleted_at,
        text_group,
        details,
      } = req.body;
      // Construct the SQL UPDATE statement
      const updateQuery = `
            UPDATE post_data
            SET 
                type = $1,
                avatar = $2,
                name = $3,
                address = $4,
                deleted_at = $5,
                text_group = $6,
                details = $7
            WHERE id = $8
        `;

      // Execute the UPDATE statement
      await pool.query(updateQuery, [
        type,
        avatar,
        name,
        address,
        deleted_at,
        text_group,
        details,
        id,
      ]);

      // Send a success response
      res.status(200).json({ message: "Post data updated successfully" });
    } catch (error) {
      // Handle any errors
      console.error("Error updating post data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  // Get data by post id
  getDataById: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                SELECT * FROM post_data
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

  // Soft delete data by post id
  softDeleteData: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                UPDATE post_data
                SET deleted_at = NOW()
                WHERE id = $1
            `;
      await pool.query(query, [id]);
      res.json({ message: "Data soft deleted successfully" });
    } catch (error) {
      console.error("Error soft deleting data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Hard delete data by post id
  hardDeleteData: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                DELETE FROM post_data
                WHERE id = $1
            `;
      await pool.query(query, [id]);
      res.json({ message: "Data hard deleted successfully" });
    } catch (error) {
      console.error("Error hard deleting data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  // Get all soft deleted data by pagination length 12
  getAllSoftDeletedData: async (req, res) => {
    try {
      const { page } = req.query;
      const pageSize = 12;
      const offset = (page - 1) * pageSize;
      const query = `
                SELECT * FROM post_data
                WHERE deleted_at IS NOT NULL
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
  getPostLength: async (req, res) => {
    try {
      const query = `
            SELECT COUNT(*) AS total_count FROM post_data
            WHERE deleted_at IS false
        `;
      const { rows } = await pool.query(query);
      const totalCount = parseInt(rows[0].total_count);
      res.json({ totalLength: totalCount });
    } catch (error) {
      console.error(
        "Error retrieving total length of non-soft deleted data:",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getDeletedPostLength: async (req, res) => {
    try {
      const query = `
            SELECT COUNT(*) AS total_count FROM post_data
            WHERE deleted_at IS true
        `;
      const { rows } = await pool.query(query);
      const totalCount = parseInt(rows[0].total_count);
      res.json({ totalLength: totalCount });
    } catch (error) {
      console.error(
        "Error retrieving total length of soft deleted data:",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

module.exports = postController;
