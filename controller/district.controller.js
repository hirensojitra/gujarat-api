const pool = require("../database/index");
const districtController = {
  getAll: async (req, res) => {
    try {
      const query = "SELECT * FROM district WHERE is_deleted = 0 ORDER BY name ASC";
      const { rows } = await pool.query(query);
      res.json(rows);
    } catch (error) {
      console.error("Error retrieving districts:", error);
      res.status(500).json({
        status: "error",
        message: "Districts not found",
      });
    }
  },
  getDeletedAll: async (req, res) => {
    try {
      const sql = "SELECT * FROM district WHERE is_deleted = $1";
      const result = await pool.query(sql, [1]);
      res.json(result.rows);
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
      const sql = "SELECT * FROM district WHERE id = $1 AND is_deleted = 0";
      const result = await pool.query(sql, [id]);
      res.json(result.rows[0] || {});
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
        "INSERT INTO district (name, gu_name, is_deleted) VALUES ($1, $2, $3) RETURNING *";
      const result = await pool.query(sql, [name, gu_name, is_deleted ? 1 : 0]);
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
  update: async (req, res) => {
    try {
      const { name, gu_name, is_deleted } = req.body;
      const { id } = req.params;
      const sql =
        "UPDATE district SET name = $1, gu_name = $2, is_deleted = $3 WHERE id = $4 AND is_deleted = 0";
      const result = await pool.query(sql, [
        name,
        gu_name,
        is_deleted ? 1 : 0,
        id,
      ]);
      res.json({
        success: true,
        data: result.rows,
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
      const sql = "UPDATE district SET is_deleted = 1 WHERE id = $1";
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
      console.log(id);
      const sql = "UPDATE district SET is_deleted = 0 WHERE id = $1";
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
  deletedLength: async (req, res) => {
    try {
      const sql =
        "SELECT COUNT(*) AS deletedDistrictsCount FROM district WHERE is_deleted = 1";
      const result = await pool.query(sql);
      res.json({
        deletedDistrictCount: result.rows[0].deleteddistrictscount,
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
