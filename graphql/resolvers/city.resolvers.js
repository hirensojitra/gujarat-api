const pool = require("../../database/index");

const checkAuth = (user) => {
  if (!user || (user.role.toUpperCase() !== "ADMINISTRATOR" && user.role.toUpperCase() !== "OWNER")) {
    throw new Error("Unauthorized");
  }
};

const resolvers = {
  Query: {
    getCities: async (_, { pagination, is_metro }, { user }) => {
      checkAuth(user);
      const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "DESC", search = "" } = pagination || {};
      const offset = (page - 1) * limit;

      let query = `SELECT * FROM cities WHERE is_deleted = false`;
      let queryParams = [];
      let paramIndex = 1;

      if (is_metro !== undefined) {
        query += ` AND is_metro = $${paramIndex++}`;
        queryParams.push(is_metro);
      }

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR gu_name ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY ${sortBy === 'name' ? 'name' : sortBy === 'gu_name' ? 'gu_name' : 'created_at'} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);
      return result.rows;
    },
    getDeletedCities: async (_, { pagination }, { user }) => {
      checkAuth(user);
      const { page = 1, limit = 10, sortBy = "created_at", sortOrder = "DESC", search = "" } = pagination || {};
      const offset = (page - 1) * limit;

      let query = `SELECT * FROM cities WHERE is_deleted = true`;
      let queryParams = [];
      let paramIndex = 1;

      if (search) {
        query += ` AND (name ILIKE $${paramIndex} OR gu_name ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY ${sortBy === 'name' ? 'name' : sortBy === 'gu_name' ? 'gu_name' : 'created_at'} ${sortOrder === 'ASC' ? 'ASC' : 'DESC'} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);
      return result.rows;
    },
    getCityById: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "SELECT * FROM cities WHERE id = $1";
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        throw new Error("City not found");
      }
      return result.rows[0];
    },
    getCityStats: async (_, __, { user }) => {
      checkAuth(user);
      const totalQuery = "SELECT COUNT(*) FROM cities";
      const activeQuery = "SELECT COUNT(*) FROM cities WHERE is_deleted = false";
      const deletedQuery = "SELECT COUNT(*) FROM cities WHERE is_deleted = true";
      const metroQuery = "SELECT COUNT(*) FROM cities WHERE is_deleted = false AND is_metro = true";
      const regularQuery = "SELECT COUNT(*) FROM cities WHERE is_deleted = false AND is_metro = false";
      
      const [totalResult, activeResult, deletedResult, metroResult, regularResult] = await Promise.all([
        pool.query(totalQuery),
        pool.query(activeQuery),
        pool.query(deletedQuery),
        pool.query(metroQuery),
        pool.query(regularQuery)
      ]);

      return {
        totalCities: parseInt(totalResult.rows[0].count, 10),
        activeCities: parseInt(activeResult.rows[0].count, 10),
        deletedCities: parseInt(deletedResult.rows[0].count, 10),
        totalMetro: parseInt(metroResult.rows[0].count, 10),
        totalRegular: parseInt(regularResult.rows[0].count, 10)
      };
    }
  },
  Mutation: {
    createCity: async (_, { name, gu_name, is_metro }, { user }) => {
      checkAuth(user);
      const query = "INSERT INTO cities (name, gu_name, is_metro) VALUES ($1, $2, $3) RETURNING *";
      const result = await pool.query(query, [name, gu_name, is_metro]);
      return result.rows[0];
    },
    updateCity: async (_, { id, name, gu_name, is_metro }, { user }) => {
      checkAuth(user);
      let query = "UPDATE cities SET ";
      let fields = [];
      let values = [];
      let count = 1;

      if (name !== undefined) { fields.push(`name = $${count++}`); values.push(name); }
      if (gu_name !== undefined) { fields.push(`gu_name = $${count++}`); values.push(gu_name); }
      if (is_metro !== undefined) { fields.push(`is_metro = $${count++}`); values.push(is_metro); }

      if (fields.length === 0) return null;
      fields.push(`updated_at = NOW()`);
      
      values.push(id);
      query += fields.join(", ") + ` WHERE id = $${count} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0];
    },
    softDeleteCity: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "UPDATE cities SET is_deleted = true, updated_at = NOW() WHERE id = $1 RETURNING *";
      const result = await pool.query(query, [id]);
      return result.rows[0];
    },
    restoreCity: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "UPDATE cities SET is_deleted = false, updated_at = NOW() WHERE id = $1 RETURNING *";
      const result = await pool.query(query, [id]);
      return result.rows[0];
    },
    hardDeleteCity: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "DELETE FROM cities WHERE id = $1 RETURNING id";
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    }
  }
};

module.exports = { resolvers };
