const pool = require("../database/index");
const villageController = {
  getAll: async (req, res) => {
    try {
      const sql = `
            SELECT v.*, t.name AS taluka_name, d.name AS district_name
            FROM villages v
            JOIN talukas t ON v.taluka_id = t.id
            JOIN districts d ON t.district_id = d.id
            WHERE v.is_deleted = FALSE AND t.is_deleted = FALSE AND d.is_deleted = FALSE
            ORDER BY v.name ASC
        `;

      const result = await pool.query(sql);

      res.json({
        data: result.rows,
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
        message: "Village not found",
      });
    }
  },
  getByTalukaId: async (req, res) => {
    try {
      const { id } = req.params;
      const getVillagesByTaluka = `
            SELECT v.id, v.name, v.gu_name, t.name as taluka_name, t.id as taluka_id, t.gu_name as taluka_gu_name, d.name as district_name, d.id as district_id, d.gu_name as district_gu_name
            FROM villages v
            JOIN talukas t ON v.taluka_id = t.id
            JOIN districts d ON t.district_id = d.id
            WHERE v.taluka_id = $1 AND v.is_deleted = FALSE AND t.is_deleted = FALSE AND d.is_deleted = FALSE
            ORDER BY v.name ASC;
        `;
      const villages = await pool.query(getVillagesByTaluka, [id]);

      res.json(villages.rows);
    } catch (error) {
      console.error("Error retrieving villages:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  getDeletedAll: async (req, res) => {
    try {
      const sql = `
            SELECT v.*, t.name AS taluka_name, d.name AS district_name
            FROM villages v
            JOIN talukas t ON v.taluka_id = t.id
            JOIN districts d ON t.district_id = d.id
            WHERE v.is_deleted = TRUE AND t.is_deleted = FALSE AND d.is_deleted = FALSE
            ORDER BY v.name ASC
        `;
      const result = await pool.query(sql);

      res.json({
        data: result.rows,
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
        message: "Village not found",
      });
    }
  },
  getDeletedByTalukaId: async (req, res) => {
    try {
      const { id } = req.params;

      const sql = `
            SELECT v.*, t.name AS taluka_name, d.name AS district_name
            FROM villages v
            JOIN talukas t ON v.taluka_id = t.id
            JOIN districts d ON t.district_id = d.id
            WHERE v.is_deleted = TRUE AND t.is_deleted = FALSE AND d.is_deleted = FALSE AND v.taluka_id = $1
            ORDER BY v.name ASC
        `;

      const result = await pool.query(sql, [id]);

      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
        message: "Village not found",
      });
    }
  },
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate id to ensure it's a number
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({
          status: "error",
          message: "Invalid ID parameter"
        });
      }

      const sql = `
        SELECT v.id, v.name, v.gu_name, t.name AS taluka_name, t.id AS taluka_id, t.gu_name AS taluka_gu_name,
               d.name AS district_name, d.id AS district_id, d.gu_name AS district_gu_name
        FROM villages v
        JOIN talukas t ON v.taluka_id = t.id
        JOIN districts d ON t.district_id = d.id
        WHERE v.id = $1 AND v.is_deleted = FALSE AND t.is_deleted = FALSE AND d.is_deleted = FALSE
      `;

      const result = await pool.query(sql, [Number(id)]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Village not found" });
      }

      res.json({
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error in getById:", error);
      res.status(500).json({
        status: "error",
        message: "Internal Server Error",
      });
    }
  },
  create: async (req, res) => {
    try {
      const { name, gu_name, taluka_id } = req.body;

      const sql = `
          INSERT INTO villages (name, gu_name, is_deleted, taluka_id)
          VALUES ($1, $2, FALSE, $3)
          RETURNING *
      `;
      const result = await pool.query(sql, [name, gu_name, taluka_id]);

      res.json({
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  update: async (req, res) => {
    try {
      const { name, gu_name, taluka_id } = req.body;
      const { id } = req.params;

      const sql = `
      UPDATE villages SET
      name = $1,
      gu_name = $2,
      taluka_id = $3
      WHERE id = $4 AND is_deleted = FALSE
      RETURNING *
      `;

      const result = await pool.query(sql, [name, gu_name, taluka_id, id]);

      res.json({
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const sql = `
      UPDATE villages
        SET is_deleted = TRUE
        WHERE id = $1 AND is_deleted = FALSE
        RETURNING *`;
      const result = await pool.query(sql, [id]);
      res.json({
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  restore: async (req, res) => {
    try {
      const { id } = req.params;

      const sql = `
            UPDATE villages
            SET is_deleted = FALSE
            WHERE id = $1
            RETURNING *
        `;

      const result = await pool.query(sql, [id]);

      res.json({
        data: result.rows[0],
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  deletedLength: async (req, res) => {
    try {
      const { id } = req.params;

      const sql = `
            SELECT COUNT(*) AS deletedvillagecount
            FROM villages v
            JOIN talukas t ON v.taluka_id = t.id
            WHERE v.is_deleted = TRUE AND t.is_deleted = FALSE AND t.id = $1
        `;

      const result = await pool.query(sql, [id]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
};

module.exports = villageController;
