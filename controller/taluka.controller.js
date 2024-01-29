const pool = require("../database/index");
const talukaController = {
  getAll: async (req, res) => {
    try {
      const sql = "SELECT * FROM taluka WHERE is_deleted = 0";
      const result = await pool.query(sql);
      res.json({
        data: result.rows,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: "Taluka not found",
      });
    }
  },
  getByDistrictId: async (req, res) => {
    try {
      const { id } = req.params;
      const getTalukasByDistrictQuery = `SELECT t.id, t.name, t.gu_name, d.name as district_name, d.id as district_id, d.gu_name as district_gu_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.district_id = $1 AND t.is_deleted = 0 AND d.is_deleted = 0`;
      const talukas = await pool.query(getTalukasByDistrictQuery, [id]);
      res.json(talukas.rows);
    } catch (error) {
      console.error("Error retrieving talukas:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  getDeletedAll: async (req, res) => {
    try {
      const sql =
        "SELECT t.*, d.name AS district_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.is_deleted = 1 AND d.is_deleted = 0";
      const result = await pool.query(sql);
      res.json({
        data: result.rows,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: "Taluka not found",
      });
    }
  },
  getDeletedByDistrictId: async (req, res) => {
    try {
      const { id } = req.params;
      const sql =
        "SELECT t.*, d.name AS district_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.is_deleted = 1 AND d.is_deleted = 0 AND t.district_id = $1";
      const result = await pool.query(sql, [id]);
      res.json(result.rows);
    } catch (error) {
      res.json({
        status: "error",
        message: "Taluka not found",
      });
    }
  },
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const sql = `SELECT t.id, t.name, t.gu_name, d.name AS district_name, d.id AS district_id, d.gu_name AS district_gu_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.id = $1 AND t.is_deleted = 0 AND d.is_deleted = 0`;
      const result = await pool.query(sql, [id]);
      res.json({
        data: result.rows,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
      });
    }
  },
  create: async (req, res) => {
    try {
      const { name, gu_name, is_deleted, district_id } = req.body;
      const sql =
        "INSERT INTO taluka (name, gu_name, is_deleted, district_id) VALUES ($1, $2, $3, $4) RETURNING *";
      const result = await pool.query(sql, [
        name,
        gu_name,
        is_deleted ? 1 : 0,
        district_id,
      ]);
      res.json({
        data: result.rows,
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
      const { name, gu_name, is_deleted, district_id } = req.body;
      const { id } = req.params;

      const sql = `
            UPDATE taluka t
            SET name = $1, gu_name = $2, is_deleted = $3
            WHERE t.id = $4 AND t.is_deleted = 0
                AND EXISTS (
                    SELECT 1 FROM district d 
                    WHERE d.id = $5 AND d.is_deleted = 0 AND t.district_id = d.id
                )
        `;

      const result = await pool.query(sql, [
        name,
        gu_name,
        is_deleted ? 1 : 0,
        id,
        district_id,
      ]);

      res.json({
        data: result.rows,
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
      const sql = "UPDATE taluka SET is_deleted = 1 WHERE id = $1";
      const result = await pool.query(sql, [id]);
      res.json({
        data: result.rows,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
      });
    }
  },
  restore: async (req, res) => {
    try {
      const { id } = req.params;

      const sql = `UPDATE taluka
                    SET is_deleted = 0
                    WHERE id = $1
                        AND EXISTS (
                            SELECT 1 FROM district d 
                            WHERE d.id = taluka.district_id AND d.is_deleted = 0
                        );`;

      const result = await pool.query(sql, [id]);

      res.json({
        data: result.rows,
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
        SELECT COUNT(*) AS deletedtalukacount 
        FROM taluka 
        WHERE is_deleted = 1 
          AND district_id = $1
      `;
      const result = await pool.query(sql, [id]);
      res.json(result.rows[0]);
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
      });
    }
  },
};

module.exports = talukaController;
