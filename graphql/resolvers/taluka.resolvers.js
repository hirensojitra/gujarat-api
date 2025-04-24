const pool = require("../../database/index");

const resolvers = {
  Query: {
    getSelectedDistrictId: async () => {
      const query = `
        SELECT id FROM districts
        WHERE is_deleted = FALSE
        ORDER BY name ASC
        LIMIT 1;
      `;
      const result = await pool.query(query);
      return result.rows[0]?.id || null;
    },

    getTalukas: async (_, { district_id, pagination }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM talukas
        WHERE district_id = $1 AND is_deleted = FALSE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3;
      `;
      const result = await pool.query(query, [district_id, limit, offset]);
      return result.rows;
    },
    
    getTalukasByDistrictId: async (_, { district_id, pagination = {} }) => {
      const {
        page = 1,
        limit = 1000,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM talukas
        WHERE district_id = $1 AND is_deleted = FALSE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3;
      `;
      const result = await pool.query(query, [district_id, limit, offset]);
      return result.rows;
    },

    getDeletedTalukasByDistrictId: async (_, { district_id, pagination = {} }) => {
      const {
        page = 1,
        limit = 1000,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM talukas
        WHERE district_id = $1 AND is_deleted = TRUE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $2 OFFSET $3;
      `;
      const result = await pool.query(query, [district_id, limit, offset]);
      return result.rows;
    },

    getDeletedTalukas: async (_, { pagination }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "name",
        sortOrder = "ASC",
      } = pagination;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM talukas
        WHERE is_deleted = TRUE
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2;
      `;
      const result = await pool.query(query, [limit, offset]);
      return result.rows;
    },

    getTalukaById: async (_, { id }) => {
      const query = "SELECT * FROM talukas WHERE id = $1 AND is_deleted = FALSE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getDeletedTalukaById: async (_, { id }) => {
      const query = "SELECT * FROM talukas WHERE id = $1 AND is_deleted = TRUE";
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    },

    getTalukaStats: async () => {
      const sql = `
        SELECT
          COUNT(*) AS "totalTalukas",
          COUNT(*) FILTER (WHERE is_deleted = FALSE) AS "activeTalukas",
          COUNT(*) FILTER (WHERE is_deleted = TRUE) AS "deletedTalukas"
        FROM talukas;
      `;
      const { rows } = await pool.query(sql);
      return {
        totalTalukas: parseInt(rows[0].totalTalukas, 10),
        activeTalukas: parseInt(rows[0].activeTalukas, 10),
        deletedTalukas: parseInt(rows[0].deletedTalukas, 10),
      };
    },
    getTalukaStatsByDistrict: async (_, { district_id, activePagination = {}, deletedPagination = {} }) => {
      let selectedId = district_id;

      // 1. Fallback to first district if none selected
      if (!selectedId) {
        const fallback = await pool.query(`
          SELECT id FROM districts WHERE is_deleted = FALSE ORDER BY name ASC LIMIT 1
        `);
        selectedId = fallback.rows[0]?.id;
      }

      // 2. Batch query execution
      const [districtsResult, countsResult, activeTalukasResult, deletedTalukasResult] = await Promise.all([
        pool.query(`SELECT id, name, gu_name, is_deleted FROM districts WHERE is_deleted = FALSE ORDER BY name ASC`),

        pool.query(`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_deleted = FALSE) AS active,
            COUNT(*) FILTER (WHERE is_deleted = TRUE) AS deleted
          FROM talukas WHERE district_id = $1
        `, [selectedId]),

        pool.query(`
          SELECT t.id, t.name, t.gu_name, d.name AS district_name, d.gu_name AS district_gu_name
          FROM talukas t
          JOIN districts d ON d.id = t.district_id
          WHERE t.district_id = $1 AND t.is_deleted = FALSE
          ORDER BY ${activePagination.sortBy || 't.name'} ${activePagination.sortOrder || 'ASC'}
          LIMIT $2 OFFSET $3
        `, [
          selectedId,
          activePagination.limit || 10,
          ((activePagination.page || 1) - 1) * (activePagination.limit || 10)
        ]),

        pool.query(`
          SELECT t.id, t.name, t.gu_name, d.name AS district_name, d.gu_name AS district_gu_name
          FROM talukas t
          JOIN districts d ON d.id = t.district_id
          WHERE t.district_id = $1 AND t.is_deleted = TRUE
          ORDER BY ${deletedPagination.sortBy || 't.name'} ${deletedPagination.sortOrder || 'ASC'}
          LIMIT $2 OFFSET $3
        `, [
          selectedId,
          deletedPagination.limit || 10,
          ((deletedPagination.page || 1) - 1) * (deletedPagination.limit || 10)
        ]),
      ]);

      const shapeTalukas = (rows) =>
        rows.map((t) => ({
          id: t?.id,
          name: t?.name,
          gu_name: t?.gu_name
        }));
      

      const countRow = countsResult.rows[0];

      return {
        districts: districtsResult.rows,
        selectedId,
        activeTalukasByDistrictId: shapeTalukas(activeTalukasResult.rows),
        deletedTalukasByDistrictId: shapeTalukas(deletedTalukasResult.rows),
        totalTalukasByDistrictId: parseInt(countRow.total, 10),
        totalActiveTalukasByDistrictId: parseInt(countRow.active, 10),
        totalDeletedTalukasByDistrictId: parseInt(countRow.deleted, 10),
      };
    }    
  },
  TalukaWithDistrict: {
    district: async (parent) => {
      const result = await pool.query(
        `SELECT * FROM districts WHERE id = $1 AND is_deleted = FALSE LIMIT 1`,
        [parent.district_id]
      );
      return result.rows[0] || null;
    },
  },
  Mutation: {
    createTaluka: async (_, { name, gu_name, district_id, is_deleted }) => {
      const sql = `
        INSERT INTO talukas (name, gu_name, district_id, is_deleted)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, gu_name, district_id, is_deleted;
      `;
      const result = await pool.query(sql, [name, gu_name, district_id, is_deleted ? 1 : 0]);
      return result.rows[0];
    },

    createTalukas: async (_, { districts }) => {
      const insertQueries = districts.map((district) => {
        return pool.query(
          `
            INSERT INTO talukas (name, gu_name, district_id, is_deleted)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, gu_name, district_id, is_deleted;
          `,
          [district.name, district.gu_name, district.district_id, district.is_deleted ? 1 : 0]
        );
      });

      const results = await Promise.all(insertQueries);
      return results.map((result) => result.rows[0]);
    },

    updateTaluka: async (_, { id, name, gu_name, district_id, is_deleted }) => {
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

      if (district_id) {
        updateFields.push(`district_id = $${updateFields.length + 1}`);
        values.push(district_id);
      }

      if (is_deleted !== undefined) {
        updateFields.push(`is_deleted = $${updateFields.length + 1}`);
        values.push(is_deleted ? 1 : 0);
      }

      values.push(id);

      const query = `
        UPDATE talukas
        SET ${updateFields.join(", ")}
        WHERE id = $${values.length} AND is_deleted = FALSE
        RETURNING *;
      `;
      const result = await pool.query(query, values);
      return result.rows[0];
    },

    updateTalukas: async (_, { districts }) => {
      const updateQueries = districts.map((district) => {
        const { id, name, gu_name, district_id, is_deleted } = district;
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

        if (district_id) {
          updateFields.push(`district_id = $${updateFields.length + 1}`);
          values.push(district_id);
        }

        if (is_deleted !== undefined) {
          updateFields.push(`is_deleted = $${updateFields.length + 1}`);
          values.push(is_deleted ? 1 : 0);
        }

        values.push(id);

        const query = `
          UPDATE talukas
          SET ${updateFields.join(", ")}
          WHERE id = $${values.length} AND is_deleted = FALSE
          RETURNING *;
        `;
        return pool.query(query, values);
      });

      const results = await Promise.all(updateQueries);
      return results.map((result) => result.rows[0]);
    },

    softDeleteTaluka: async (_, { id }) => {
      const sql = "UPDATE talukas SET is_deleted = TRUE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    softDeleteTalukas: async (_, { ids }) => {
      const deleteQueries = ids.map((id) => {
        return pool.query(
          "UPDATE talukas SET is_deleted = TRUE WHERE id = $1 RETURNING *",
          [id]
        );
      });

      const results = await Promise.all(deleteQueries);
      return results.map((result) => result.rows[0]);
    },

    restoreTaluka: async (_, { id }) => {
      const sql = "UPDATE talukas SET is_deleted = FALSE WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rows[0];
    },

    restoreTalukas: async (_, { ids }) => {
      const restoreQueries = ids.map((id) => {
        return pool.query(
          "UPDATE talukas SET is_deleted = FALSE WHERE id = $1 RETURNING *",
          [id]
        );
      });

      const results = await Promise.all(restoreQueries);
      return results.map((result) => result.rows[0]);
    },

    hardDeleteTaluka: async (_, { id }) => {
      const sql = "DELETE FROM talukas WHERE id = $1 RETURNING *";
      const result = await pool.query(sql, [id]);
      return result.rowCount > 0;
    },

    hardDeleteTalukas: async (_, { ids }) => {
      const deleteQueries = ids.map((id) => {
        return pool.query("DELETE FROM talukas WHERE id = $1 RETURNING *", [id]);
      });

      const results = await Promise.all(deleteQueries);
      return results.every((result) => result.rowCount > 0);
    },
  }
};

module.exports = { resolvers };
