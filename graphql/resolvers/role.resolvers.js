// role.resolvers.js
const pool = require("../../database");

const ROLE_FIELDS = "id, code, name, description";

const resolvers = {
  Query: {
    roles: async () => {
      const { rows } = await pool.query(`
        SELECT ${ROLE_FIELDS}
          FROM roles
         ORDER BY id
      `);
      return rows;
    },
    role: async (_, { id }) => {
      const { rows } = await pool.query(
        `SELECT ${ROLE_FIELDS}
           FROM roles
          WHERE id = $1
          LIMIT 1`,
        [id]
      );
      return rows[0] || null;
    },
  },

  Mutation: {
    createRole: async (_, { input }) => {
      const { code, name, description } = input;
      const { rows } = await pool.query(
        `
        INSERT INTO roles (code, name, description)
             VALUES ($1, $2, $3)
        RETURNING ${ROLE_FIELDS}
        `,
        [code, name, description]
      );
      return rows[0];
    },

    updateRole: async (_, { id, input }) => {
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const [k, v] of Object.entries(input)) {
        if (v == null) continue;
        sets.push(`${k} = $${idx}`);
        vals.push(v);
        idx++;
      }
      if (sets.length === 0) {
        throw new Error("No fields provided for update");
      }
      vals.push(id);
      const { rows } = await pool.query(
        `
        UPDATE roles
           SET ${sets.join(", ")}
         WHERE id = $${idx}
        RETURNING ${ROLE_FIELDS}
        `,
        vals
      );
      if (!rows.length) throw new Error("Role not found");
      return rows[0];
    },

    deleteRole: async (_, { id }) => {
      const { rowCount } = await pool.query(
        `DELETE FROM roles WHERE id = $1`,
        [id]
      );
      return rowCount > 0;
    },
  },
};

module.exports = { resolvers };
