const pool = require("../database/index");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ─── Ensure thumb directory exists at startup ────────────────────────────────
const THUMB_DIR = path.join(__dirname, "../uploads/thumb");
ensureDirSync(THUMB_DIR);

// ─── Multer storage for thumbnails ───────────────────────────────────────────
// Write to a .tmp.jpg first to avoid Windows file-lock conflicts
// (sharp in thumb-images.controller may hold a read-lock on the .jpg).
const thumbStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, THUMB_DIR),
  filename: (req, _file, cb) => {
    cb(null, `${req.params.postId}.tmp.jpg`);
  },
});
const thumbUpload = multer({
  storage: thumbStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
}).single("thumbnail");

const electionPostController = {
  getAllData: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "created_at",
        order = "desc",
        published,
        info_show,
        target_organization_type,
        templateType,
      } = req.query;

      const pageSize = parseInt(limit, 10);
      const offset = (parseInt(page, 10) - 1) * pageSize;
      const searchQuery = `%${search.toLowerCase()}%`;
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
      const validSortColumns = ["id", "title", "created_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";

      let whereClauses = ["deleted = false", "(LOWER(title) LIKE $1)"];
      let queryParams = [searchQuery];

      if (published !== undefined) {
        whereClauses.push(`published = $${queryParams.length + 1}`);
        queryParams.push(published === "true");
      }

      if (info_show !== undefined) {
        whereClauses.push(`info_show = $${queryParams.length + 1}`);
        queryParams.push(info_show === "true");
      }
      
      if (target_organization_type) {
        whereClauses.push(`target_organization_type = $${queryParams.length + 1}`);
        queryParams.push(target_organization_type);
      }

      if (templateType) {
        whereClauses.push(`templateType = $${queryParams.length + 1}`);
        queryParams.push(templateType);
      }

      const postsQuery = `
                SELECT * 
                FROM election_post_details
                WHERE ${whereClauses.join(" AND ")}
                ORDER BY ${sortColumn} ${validOrder}
                LIMIT $${queryParams.length + 1} OFFSET $${
        queryParams.length + 2
      };`;
      queryParams.push(pageSize, offset);

      const postsResult = await pool.query(postsQuery, queryParams);

      const countQuery = `
                SELECT COUNT(*) FROM election_post_details
                WHERE ${whereClauses.join(" AND ")};
            `;
      const countResult = await pool.query(
        countQuery,
        queryParams.slice(0, -2)
      );
      const totalPosts = parseInt(countResult.rows[0].count, 10);

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
      console.error("Error retrieving election post data:", error);
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
        track,
        target_organization_type,
      } = req.body;

      const jsonData = JSON.stringify(data);
      const currentUTC = new Date();
      const newPostId = Math.random().toString(36).substr(2, 9);

      const insertQuery = `
        INSERT INTO election_post_details 
          (deleted, h, w, title, info, info_show, backgroundurl, data, download_counter, created_at, published, track, updated_at, id, target_organization_type)
        VALUES 
          (false, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $9, $12, $13)
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
        currentUTC,
        published,
        track,
        newPostId,
        target_organization_type,
      ]);

      res.status(201).json({ id: rows[0].id, message: "Election post added successfully" });
    } catch (error) {
      console.error("Error adding election post:", error);
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
        track,
        target_organization_type,
      } = req.body;

      const jsonData = JSON.stringify(data);
      const currentUTC = new Date().toISOString();
      const currentIST = new Date(currentUTC).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      const updateQuery = `
        UPDATE election_post_details
        SET h = $1,
            w = $2,
            title = $3,
            info = $4,
            info_show = $5,
            backgroundurl = $6,
            data = $7,
            updated_at = $8,
            download_counter = $9,
            published = $10,
            track = $11,
            target_organization_type = $12
        WHERE id = $13
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
        track,
        target_organization_type,
        id,
      ]);
      res.status(200).json({ message: "Election post data updated successfully" });
    } catch (error) {
      console.error("Error updating election post data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getDataById: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                SELECT * FROM election_post_details
                WHERE id = $1
            `;
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Data not found" });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error retrieving election post data:", error);
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
                UPDATE election_post_details
                SET deleted_at = $1,
                deleted = true,
                published = false
                WHERE id = $2
            `;
      await pool.query(query, [currentIST, id]);
      res.json({ message: "Data soft deleted successfully" });
    } catch (error) {
      console.error("Error soft deleting election post data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  recoverData: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                UPDATE election_post_details
                SET deleted_at = NULL,
                deleted = false
                WHERE id = $1
            `;
      await pool.query(query, [id]);
      res.json({ message: "Restored successfully" });
    } catch (error) {
      console.error("Error restoring election post data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  hardDeleteData: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
                DELETE FROM election_post_details
                WHERE id = $1
            `;
      await pool.query(query, [id]);
      res.json({ message: "Data hard deleted successfully" });
    } catch (error) {
      console.error("Error hard deleting election post data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getAllSoftDeletedData: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 12,
        search = "",
        sortBy = "deleted_at",
        order = "desc",
      } = req.query;

      const pageSize = parseInt(limit, 10);
      const offset = (parseInt(page, 10) - 1) * pageSize;
      const searchQuery = `%${search.toLowerCase()}%`;
      const validOrder = order.toLowerCase() === "desc" ? "DESC" : "ASC";
      const validSortColumns = ["id", "title", "deleted_at"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? sortBy
        : "deleted_at";

      const postsQuery = `
                SELECT * 
                FROM election_post_details
                WHERE deleted = true
                  AND (LOWER(title) LIKE $1)
                ORDER BY ${sortColumn} ${validOrder}
                LIMIT $2 OFFSET $3;
            `;

      const postsResult = await pool.query(postsQuery, [
        searchQuery,
        pageSize,
        offset,
      ]);

      const countQuery = `
                SELECT COUNT(*) FROM election_post_details
                WHERE deleted = true
                  AND (LOWER(title) LIKE $1);
            `;
      const countResult = await pool.query(countQuery, [searchQuery]);
      const totalPosts = parseInt(countResult.rows[0].count, 10);

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
      console.error("Error retrieving soft-deleted election post data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getPostLength: async (req, res) => {
    try {
      const query = `
                SELECT COUNT(*) AS total_count FROM election_post_details
                WHERE deleted = false
            `;
      const { rows } = await pool.query(query);
      const totalCount = parseInt(rows[0].total_count);
      res.json({ totalLength: totalCount });
    } catch (error) {
      console.error(
        "Error retrieving total length of election post data:",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getDeletedPostLength: async (req, res) => {
    try {
      const query = `
                SELECT COUNT(*) AS total_count FROM election_post_details
                WHERE deleted = true
            `;
      const { rows } = await pool.query(query);
      const totalCount = parseInt(rows[0].total_count);
      res.json({ totalLength: totalCount });
    } catch (error) {
      console.error(
        "Error retrieving total length of soft deleted election post data:",
        error
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getDownloadCounter: async (req, res) => {
    try {
      const { id } = req.params;
      const query = `SELECT download_counter FROM election_post_details WHERE id = $1`;
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Data not found" });
      }
      res.json(rows[0]);
    } catch (error) {
      console.error("Error retrieving election download counter:", error);
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
      const query = `SELECT download_counter FROM election_post_details WHERE id = $1`;
      const { rows } = await pool.query(query, [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: "Data not found" });
      }
      const currentCounter = rows[0].download_counter;
      const newCounter = currentCounter + 1;
      const updateQuery = `UPDATE election_post_details SET download_counter = $1, updated_at = $2 WHERE id = $3`;
      await pool.query(updateQuery, [newCounter, currentIST, id]);
      res.json({ download_counter: newCounter });
    } catch (error) {
      console.error("Error updating election download counter:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  uploadThumbnail: [
    thumbUpload,
    (req, res) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ error: "No file received — field name must be 'thumbnail'" });
        }

        const postId = req.params.postId;
        const tmpPath   = req.file.path;                         // ..\thumb\<id>.tmp.jpg
        const finalPath = path.join(THUMB_DIR, `${postId}.jpg`); // ..\thumb\<id>.jpg

        // Rename .tmp.jpg → .jpg (replaces existing, avoids Windows read-lock)
        fs.rename(tmpPath, finalPath, (err) => {
          if (err) {
            console.error(`[uploadThumbnail] Rename failed:`, err);
            // Still return success — the .tmp.jpg was written; next read will pick it up
          }
          console.log(`[uploadThumbnail] Saved: ${finalPath}`);
          res.status(201).json({
            message: "Thumbnail uploaded successfully",
            path: `/thumb/${postId}.jpg`,
          });
        });
      } catch (error) {
        console.error("[uploadThumbnail] Error:", error);
        res.status(500).json({ error: "Thumbnail save failed", reason: error.message });
      }
    },
  ],
};

module.exports = electionPostController;
