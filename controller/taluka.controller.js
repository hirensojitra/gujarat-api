const pool = require("../database/index");
const talukaController = {
  getAll: async (req, res) => {
    try {
      const [rows, fields] = await pool.query(
        "SELECT * FROM taluka WHERE is_deleted = false"
      );
      res.json({
        data: rows,
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
      const getTalukasByDistrictQuery = `SELECT t.id, t.name, t.gu_name, d.name as district_name, d.id as district_id, d.gu_name as district_gu_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.district_id = ? AND t.is_deleted = false AND d.is_deleted = false;`;
      const [talukas] = await pool.query(getTalukasByDistrictQuery, [id]);
      res.json(talukas);
    } catch (error) {
      console.error("Error retrieving talukas:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },
  getDeletedAll: async (req, res) => {
    try {
      const [rows, fields] = await pool.query(
        "SELECT t.*, d.name AS district_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.is_deleted = true and d.is_deleted = false"
      );
      res.json({
        data: rows,
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
      const [rows, fields] = await pool.query(
        "SELECT t.*, d.name AS district_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.is_deleted = true AND d.is_deleted = false AND t.district_id = ?",
        [id]
      );
      res.json(rows);
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
      const [rows, fields] = await pool.query(
        `SELECT t.id, t.name, t.gu_name, d.name as district_name, d.id as district_id, d.gu_name as district_gu_name FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.id = ? AND t.is_deleted = false AND d.is_deleted = false;`,
        [id]
      );
      res.json({
        data: rows,
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
        "INSERT INTO taluka (name, gu_name, is_deleted, district_id) VALUES (?, ?, ?, ?)";
      const [rows, fields] = await pool.query(sql, [
        name,
        gu_name,
        is_deleted,
        district_id,
      ]);
      res.json({
        data: rows,
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
        SET t.name = ?, t.gu_name = ?, t.is_deleted = ?
        WHERE t.id = ? AND t.is_deleted = false
          AND EXISTS (SELECT 1 FROM district d WHERE d.id = ? AND d.is_deleted = false AND t.district_id = d.id)
      `;

      const [rows, fields] = await pool.query(sql, [
        name,
        gu_name,
        is_deleted,
        id,
        district_id,
      ]);

      res.json({
        data: rows,
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  delete: async (req, res) => {
    console.log(req.params)
    try {
      const { id } = req.params;
      const [rows, fields] = await pool.query(
        "UPDATE taluka SET is_deleted = true WHERE id = ?",
        [id]
      );
      res.json({
        data: rows,
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
  
      const sql = `
        UPDATE taluka t
        SET t.is_deleted = false
        WHERE t.id = ?
          AND EXISTS (SELECT 1 FROM district d WHERE d.id = t.district_id AND d.is_deleted = false)
      `;
  
      const [rows, fields] = await pool.query(sql, [id]);
      
      res.json({
        data: rows,
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
      const [rows, fields] = await pool.query(
        "SELECT COUNT(*) AS deletedTalukaCount FROM taluka WHERE is_deleted = true",
        [id]
      );
      res.json(rows[0]);
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
      });
    }
  },
};

module.exports = talukaController;
