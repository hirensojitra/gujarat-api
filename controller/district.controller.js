const pool = require("../database/index");
const districtController = {
  getAll: async (req, res) => {
    try {
      const [rows, fields] = await pool.query(
        "SELECT * FROM district WHERE is_deleted = false"
      );
      res.json(rows);
    } catch (error) {
      res.json({
        status: "error",
        message: "Districts not found",
      });
    }
  },
  getDeletedAll: async (req, res) => {
    try {
      const [rows, fields] = await pool.query(
        "SELECT * FROM district WHERE is_deleted = true"
      );
      res.json({
        data: rows,
      });
    } catch (error) {
      res.json({
        status: "error",
        message: "Districts not found",
      });
    }
  },
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows, fields] = await pool.query(
        "SELECT * FROM district WHERE id = ? AND is_deleted = false",
        [id]
      );
      res.json(rows[0]||{});
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
      });
    }
  },
  create: async (req, res) => {
    try {
      const { name, gu_name, is_deleted } = req.body;
      const sql =
        "INSERT INTO district (name, gu_name, is_deleted) VALUES (?, ?, ?)";
      const [rows, fields] = await pool.query(sql, [name, gu_name, is_deleted]);
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
  update: async (req, res) => {
    try {
      const { name, gu_name, is_deleted } = req.body;
      const { id } = req.params;
      const sql =
        "UPDATE district SET name = ?, gu_name = ?, is_deleted = ? WHERE id = ? AND is_deleted = false";
      const [rows, fields] = await pool.query(sql, [
        name,
        gu_name,
        is_deleted,
        id,
      ]);
      res.json({
        success: true,
        data: rows,
      });
    } catch (error) {
      console.log(error);
      res.json({
        success: false,
        message: "Data : " + req.body,
      });
    }
  },
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows, fields] = await pool.query(
        "UPDATE district SET is_deleted = true WHERE id = ?",
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
      const [rows, fields] = await pool.query(
        "UPDATE district SET is_deleted = false WHERE id = ?",
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
  deletedLength: async (req, res) => {
    try {
      const { id } = req.params;
      const [rows, fields] = await pool.query(
        "SELECT COUNT(*) AS deletedDistrictsCount FROM district WHERE is_deleted = true",
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
};

module.exports = districtController;
