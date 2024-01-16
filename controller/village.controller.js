const pool = require("../database/index");
const villageController = {
  getAll: async (req, res) => {
    try {
      const sql = `
            SELECT v.*, t.name AS taluka_name, d.name AS district_name
            FROM village v
            JOIN taluka t ON v.taluka_id = t.id
            JOIN district d ON v.district_id = d.id
            WHERE v.is_deleted = false AND t.is_deleted = false AND d.is_deleted = false
          `;

      const [rows, fields] = await pool.query(sql);

      res.json({
        data: rows,
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
      FROM village v
      JOIN taluka t ON v.taluka_id = t.id
      JOIN district d ON v.district_id = d.id
      WHERE v.taluka_id = ? AND v.is_deleted = false AND t.is_deleted = false AND d.is_deleted = false;
    `;
      const [villages] = await pool.query(getVillagesByTaluka, [id]);

      res.json(villages);
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
        FROM village v
        JOIN taluka t ON v.taluka_id = t.id
        JOIN district d ON v.district_id = d.id
        WHERE v.is_deleted = true AND t.is_deleted = false AND d.is_deleted = false
      `;
      const [rows, fields] = await pool.query(sql);

      res.json({
        data: rows,
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
        FROM village v
        JOIN taluka t ON v.taluka_id = t.id
        JOIN district d ON v.district_id = d.id
        WHERE v.is_deleted = true AND t.is_deleted = false AND d.is_deleted = false AND v.taluka_id = ?
      `;

      const [rows, fields] = await pool.query(sql, [id]);

      res.json(rows);
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

      const sql = `
        SELECT v.id, v.name, v.gu_name, t.name as taluka_name, t.id as taluka_id, t.gu_name as taluka_gu_name, d.name as district_name, d.id as district_id, d.gu_name as district_gu_name
        FROM village v
        JOIN taluka t ON v.taluka_id = t.id
        JOIN district d ON v.district_id = d.id
        WHERE v.id = ? AND v.is_deleted = false AND t.is_deleted = false AND d.is_deleted = false
      `;

      const [rows, fields] = await pool.query(sql, [id]);

      res.json({
        data: rows[0],
      });
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
  create: async (req, res) => {
    try {
      const { name, gu_name, is_deleted, taluka_id } = req.body;

      const sql = `
      INSERT INTO village (name, gu_name, is_deleted, taluka_id, district_id)
      SELECT ?, ?, ?, t.id, d.id
      FROM taluka t
      JOIN district d ON t.district_id = d.id
      WHERE t.id = ? AND t.is_deleted = false AND d.is_deleted = false
    `;
      const [rows, fields] = await pool.query(sql, [
        name,
        gu_name,
        is_deleted,
        taluka_id,
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
      const { name, gu_name, is_deleted, taluka_id, district_id } = req.body;
      const { id } = req.params;

      const sql = `UPDATE village v SET
            v.name = ?,
            v.gu_name = ?,
            v.is_deleted = ?,
            v.taluka_id = ?,
            v.district_id = ? 
        WHERE
            v.id = ?
        AND 
            v.is_deleted = false
        AND EXISTS
            (SELECT 1 FROM taluka t
                JOIN
                    district d
                        ON
                            t.district_id = d.id
                                WHERE
                                    t.id = ?
                                AND
                                    t.is_deleted = false
                                AND 
                                    d.is_deleted = false
                                AND
                                    v.taluka_id = t.id)`;

      const [rows, fields] = await pool.query(sql, [
        name,
        gu_name,
        is_deleted,
        taluka_id,
        district_id,
        id,
        taluka_id,
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
    try {
      const { id } = req.params;

      const sql = `
        UPDATE village v
        SET v.is_deleted = true
        WHERE v.id = ? AND v.is_deleted = false
          AND EXISTS (SELECT 1 FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.id = v.taluka_id AND t.is_deleted = false AND d.is_deleted = false)
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
  restore: async (req, res) => {
    try {
      const { id } = req.params;

      const sql = `
      UPDATE village v
      SET v.is_deleted = false
      WHERE v.id = ?
        AND EXISTS (SELECT 1 FROM taluka t JOIN district d ON t.district_id = d.id WHERE t.id = v.taluka_id AND t.is_deleted = false AND d.is_deleted = false)
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

      const sql = `
      SELECT COUNT(*) AS deletedVillageCount
      FROM village v
      JOIN taluka t ON v.taluka_id = t.id
      JOIN district d ON v.district_id = d.id
      WHERE v.is_deleted = true AND t.is_deleted = false AND d.is_deleted = false
    `;

      const [rows, fields] = await pool.query(sql, [id]);

      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.json({
        status: "error",
      });
    }
  },
};

module.exports = villageController;
