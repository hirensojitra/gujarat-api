const pool = require("../../database/index");

const resolvers = {
  Query: {
    getDistricts: async (_, { pagination }) => {
      const { page = 1, limit = 10, sortBy = "name", sortOrder = "ASC" } = pagination;
      const offset = (page - 1) * limit;

      const query = `SELECT * FROM districts WHERE is_deleted = FALSE ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },
    getDistricts: async () => {
      const query = "SELECT * FROM districts WHERE is_deleted = FALSE ORDER BY name ASC";
      const result = await pool.query(query);
      return result.rows;
    },
    getDistrictById: async (_, { id }) => {
      const query = "SELECT * FROM districts WHERE id = $1 AND is_deleted = FALSE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },
    getDeletedDistricts: async (_, { pagination }) => {
      const { page = 1, limit = 10, sortBy = "name", sortOrder = "ASC" } = pagination;
      const offset = (page - 1) * limit;

      const query = `SELECT * FROM districts WHERE is_deleted = true ORDER BY ${sortBy} ${sortOrder} LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getDeletedDistrictById: async (_, { id }) => {
      const query = "SELECT * FROM districts WHERE id = $1 AND is_deleted = true";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },
    getDistrictStats: async () => {
      const sql = `
        SELECT
          COUNT(*)                                             AS "districtLength",
          COUNT(*) FILTER (WHERE is_deleted = FALSE)           AS "activeDistrictLength",
          COUNT(*) FILTER (WHERE is_deleted = TRUE)            AS "deletedDistrictLength"
        FROM districts;
      `;
      const { rows } = await pool.query(sql);
      // rows[0] will be { districtLength: '10', activeDistrictLength: '8', deletedDistrictLength: '2' }
      // PG returns strings for COUNT, so we cast to integers:
      return {
        districtLength:      parseInt(rows[0].districtLength, 10),
        activeDistrictLength: parseInt(rows[0].activeDistrictLength, 10),
        deletedDistrictLength: parseInt(rows[0].deletedDistrictLength, 10),
      };
    }
  },

  Mutation: {
    createDistrict: async (_, { name, gu_name, is_deleted }) => {
      const sql = `
          INSERT INTO districts (name, gu_name, is_deleted)
          VALUES ($1, $2, $3)
          RETURNING id, name, gu_name, is_deleted`;
      const result = await pool.query(sql, [name, gu_name, is_deleted ? 1 : 0]);
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    },

    createDistricts: async (_, { districts }) => {
      const insertQueries = districts.map((district) => {
        return pool.query(
          `
            INSERT INTO districts (name, gu_name, is_deleted)
            VALUES ($1, $2, $3)
            RETURNING id, name, gu_name, is_deleted
          `,
          [district.name, district.gu_name, district.is_deleted ? 1 : 0]
        );
      });

      const results = await Promise.all(insertQueries);
      return results.map((result) => result.rows[0]);
    },

    updateDistrict: async (_, { id, name, gu_name, is_deleted }) => {
      let updateFields = [];
      let values = [];

      if (name) {
        updateFields.push(`name = $${updateFields.length + 1}`);
        values.push(name);
      }

      if (gu_name) {
        updateFields.push(`gu_name = $${updateFields.length + 1}`);
        values.push(gu_name);
      }

      if (is_deleted !== undefined) {
        updateFields.push(`is_deleted = $${updateFields.length + 1}`);
        values.push(is_deleted ? 1 : 0);
      }

      values.push(id);

      const query = `
        UPDATE districts
        SET ${updateFields.join(', ')}
        WHERE id = $${values.length} AND is_deleted = FALSE
        RETURNING *;
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    },

    updateDistricts: async (_, { districts }) => {
      const updateQueries = districts.map((district) => {
        const { id, name, gu_name, is_deleted } = district;
        let updateFields = [];
        let values = [];

        if (name) {
          updateFields.push(`name = $${updateFields.length + 1}`);
          values.push(name);
        }

        if (gu_name) {
          updateFields.push(`gu_name = $${updateFields.length + 1}`);
          values.push(gu_name);
        }

        if (is_deleted !== undefined) {
          updateFields.push(`is_deleted = $${updateFields.length + 1}`);
          values.push(is_deleted ? 1 : 0);
        }

        values.push(id);

        const query = `
          UPDATE districts
          SET ${updateFields.join(', ')}
          WHERE id = $${values.length} AND is_deleted = FALSE
          RETURNING *;
        `;
        return pool.query(query, values);
      });

      const results = await Promise.all(updateQueries);
      return results.map((result) => result.rows[0]);
    },

    softDeleteDistrict: async (_, { id }) => {
      const sql = "UPDATE districts SET is_deleted = TRUE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    softDeleteDistricts: async (_, { ids }) => {
      const deleteQueries = ids.map((id) => {
        return pool.query(
          "UPDATE districts SET is_deleted = TRUE WHERE id = $1 RETURNING *",
          [id]
        );
      });

      const results = await Promise.all(deleteQueries);
      return results.map((result) => result.rows[0]);
    },

    hardDeleteDistrict: async (_, { id }) => {
      const sql = "DELETE FROM districts WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rowCount > 0;
    },

    hardDeleteDistricts: async (_, { ids }) => {
      const deleteQueries = ids.map((id) => {
        return pool.query("DELETE FROM districts WHERE id = $1 RETURNING *", [id]);
      });

      const results = await Promise.all(deleteQueries);
      return results.every((result) => result.rowCount > 0);
    },

    restoreDistrict: async (_, { id }) => {
      const sql = "UPDATE districts SET is_deleted = FALSE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    restoreDistricts: async (_, { ids }) => {
      const restoreQueries = ids.map((id) => {
        return pool.query(
          "UPDATE districts SET is_deleted = FALSE WHERE id = $1 RETURNING *",
          [id]
        );
      });

      const results = await Promise.all(restoreQueries);
      return results.map((result) => result.rows[0]);
    },
  },
};

module.exports = { resolvers };
