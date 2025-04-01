const pool = require("../database/index");

const postController = {
  getAllData: async (req, res) => {
    try {
      // Extract pagination, search, sorting, and additional filters
      const {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "created_at",
        order = "desc",
        published, // Can be true, false, or undefined
        info_show, // Can be true, false, or undefined
      } = req.query;

      // Pagination calculations
      const pageSize = parseInt(limit, 10);
      const offset = (parseInt(page, 10) - 1) * pageSize;

      // Search filter logic
      const searchQuery = `%${search.toLowerCase()}%`;

      // Ensure valid sort order (asc or desc)
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";

      // Whitelist of sortable columns to prevent SQL injection
      const validSortColumns = ["id", "title", "created_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";

      // Base query and parameters array
      let whereClauses = ["deleted = false", "(LOWER(title) LIKE $1)"];
      let queryParams = [searchQuery];

      // Add conditions dynamically if filters are provided
      if (published !== undefined) {
        whereClauses.push("published = $2");
        queryParams.push(published === "true");
      }

      if (info_show !== undefined) {
        whereClauses.push("info_show = $3");
        queryParams.push(info_show === "true");
      }

      // Final query string
      const postsQuery = `
                SELECT * 
                FROM post_details
                WHERE ${whereClauses.join(" AND ")}
                ORDER BY ${sortColumn} ${validOrder}
                LIMIT $${queryParams.length + 1} OFFSET $${
        queryParams.length + 2
      };`;
      // Add pagination parameters
      queryParams.push(pageSize, offset);

      // Execute the query
      const postsResult = await pool.query(postsQuery, queryParams);

      // Query to get the total number of posts for pagination
      const countQuery = `
                SELECT COUNT(*) FROM post_details
                WHERE ${whereClauses.join(" AND ")};
            `;
      const countResult = await pool.query(
        countQuery,
        queryParams.slice(0, -2)
      ); // Remove LIMIT & OFFSET params
      const totalPosts = parseInt(countResult.rows[0].count, 10);

      // Send response with posts and pagination details
      res.status(200).json({
        success: true,
        posts: postsResult.rows,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalPosts / pageSize),
          totalPosts,
        },
      });
    } catch (error) {
      console.error("Error retrieving data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  addPost: async (req, res) => {
    try {
      const {
        h,
        w,
        title,
        info,
        info_show,
        backgroundurl,
        data,
        download_counter,
        published,
      } = req.body;
      const jsonData = JSON.stringify(data);
      const currentUTC = new Date().toISOString();
      const currentIST = new Date(currentUTC).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      const newPostId = Math.random().toString(36).substr(2, 9);
      const insertQuery = `
                INSERT INTO post_details (deleted, h, w, title, info, info_show, backgroundurl, data, download_counter, created_at,published, updated_at,id)
                VALUES (false, $1, $2, $3, $4, $5, $6, $7, $8, $9, $9,$10,$11)
                RETURNING id
            `;
      const { rows } = await pool.query(insertQuery, [
        h,
        w,
        title,
        info,
        info_show,
        backgroundurl,
        jsonData,
        download_counter,
        currentIST,
        newPostId,
        published,
      ]);
      res
        .status(201)
        .json({ id: rows[0].id, message: "Post added successfully" });
    } catch (error) {
      console.error("Error adding post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  updateData: async (req, res) => {
    try {
      const {
        id,
        h,
        w,
        title,
        info,
        info_show,
        backgroundurl,
        data,
        download_counter,
        published,
      } = req.body;
      const jsonData = JSON.stringify(data);
      const currentUTC = new Date().toISOString();
      const currentIST = new Date(currentUTC).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      const updateQuery = `
                UPDATE post_details
                SET h = $1,
                    w = $2,
                    title = $3,
                    info = $4,
                    info_show = $5,
                    backgroundurl = $6,
                    data = $7,
                    updated_at = $8,
                    download_counter = $9,
                    published = $10
                WHERE id = $11
            `;
      await pool.query(updateQuery, [
        h,
        w,
        title,
        info,
        info_show,
        backgroundurl,
        jsonData,
        currentIST,
        download_counter,
        published,
        id,
      ]);
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
      const currentIST = new Date(currentUTC).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      const query = `
                UPDATE post_details
                SET deleted_at = $1,
                deleted = true,
                published = false
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
      // Extract pagination, search, and sorting parameters from the query
      const {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "deleted_at",
        order = "desc",
      } = req.query;

      // Pagination calculations
      const pageSize = parseInt(limit, 10);
      const offset = (parseInt(page, 10) - 1) * pageSize;

      // Search filter logic
      const searchQuery = `%${search.toLowerCase()}%`;

      // Ensure valid sort order (asc or desc)
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";

      // Whitelist of sortable columns to prevent SQL injection
      const validSortColumns = ["id", "title", "deleted_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "deleted_at";

      // Dynamic query to fetch soft-deleted posts with pagination, search, and sorting
      const postsQuery = `
                SELECT * 
                FROM post_details
                WHERE deleted = true
                  AND (LOWER(title) LIKE $1)
                ORDER BY ${sortColumn} ${validOrder}
                LIMIT $2 OFFSET $3;
            `;

      // Execute the query
      const postsResult = await pool.query(postsQuery, [
        searchQuery,
        pageSize,
        offset,
      ]);

      // Query to get the total number of soft-deleted posts for pagination purposes
      const countQuery = `
                SELECT COUNT(*) FROM post_details
                WHERE deleted = true
                  AND (LOWER(title) LIKE $1);
            `;
      const countResult = await pool.query(countQuery, [searchQuery]);
      const totalPosts = parseInt(countResult.rows[0].count, 10);

      // Send the response with posts and pagination details
      res.status(200).json({
        success: true,
        posts: postsResult.rows,
        pagination: {
          currentPage: parseInt(page, 10),
          totalPages: Math.ceil(totalPosts / pageSize),
          totalPosts,
        },
      });
    } catch (error) {
      console.error("Error retrieving soft-deleted data:", error);
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
                SELECT COUNT(*) AS total_count FROM post_details
                WHERE deleted = true
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
      const currentIST = new Date(currentUTC).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
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
  },
};

module.exports = postController;
