const pool = require("../../database/index");

const checkAuth = (user) => {
  if (!user || (user.role.toUpperCase() !== "ADMINISTRATOR" && user.role.toUpperCase() !== "OWNER")) {
    throw new Error("Unauthorized");
  }
};

const resolvers = {
  Organization: {
    district: async (parent) => {
      if (!parent.district_id) return null;
      const res = await pool.query("SELECT * FROM districts WHERE id = $1", [parent.district_id]);
      return res.rows[0];
    },
    taluka: async (parent) => {
      if (!parent.taluka_id) return null;
      const res = await pool.query("SELECT * FROM talukas WHERE id = $1", [parent.taluka_id]);
      return res.rows[0];
    },
    village: async (parent) => {
      if (!parent.village_id) return null;
      const res = await pool.query("SELECT * FROM villages WHERE id = $1", [parent.village_id]);
      return res.rows[0];
    },
    city: async (parent) => {
      if (!parent.city_id) return null;
      const res = await pool.query("SELECT * FROM cities WHERE id = $1", [parent.city_id]);
      return res.rows[0];
    },
    candidates: async (parent) => {
      const res = await pool.query(
        'SELECT * FROM candidates WHERE organization_id = $1 AND is_active = true ORDER BY full_name',
        [parent.id]
      );
      return res.rows;
    }
  },
  Query: {
    getOrganizations: async (_, { is_active }, { user }) => {
      checkAuth(user);
      const conditions = ['is_deleted = false'];
      const params = [];
      if (is_active !== undefined && is_active !== null) {
        params.push(is_active);
        conditions.push(`is_active = $${params.length}`);
      }
      const query = `SELECT * FROM organizations WHERE ${conditions.join(' AND ')} ORDER BY type, name`;
      const result = await pool.query(query, params);
      return result.rows;
    },
    getOrganizationById: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "SELECT * FROM organizations WHERE id = $1 AND is_deleted = false";
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) throw new Error("Organization not found");
      return result.rows[0];
    }
  },
  Mutation: {
    createOrganization: async (_, { input }, { user }) => {
      checkAuth(user);
      const { name, type, district_id, taluka_id, village_id, city_id } = input;
      const query = `
        INSERT INTO organizations (name, type, district_id, taluka_id, village_id, city_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `;
      const result = await pool.query(query, [name, type, district_id, taluka_id, village_id, city_id]);
      return result.rows[0];
    },
    updateOrganization: async (_, { input }, { user }) => {
      checkAuth(user);
      const { id, name, type, district_id, taluka_id, village_id, city_id, is_active } = input;
      
      let query = "UPDATE organizations SET ";
      let fields = [];
      let values = [];
      let count = 1;

      if (name !== undefined)       { fields.push(`name = $${count++}`);       values.push(name); }
      if (type !== undefined)       { fields.push(`type = $${count++}`);       values.push(type); }
      if (district_id !== undefined){ fields.push(`district_id = $${count++}`);values.push(district_id); }
      if (taluka_id !== undefined)  { fields.push(`taluka_id = $${count++}`);  values.push(taluka_id); }
      if (village_id !== undefined) { fields.push(`village_id = $${count++}`); values.push(village_id); }
      if (city_id !== undefined)    { fields.push(`city_id = $${count++}`);    values.push(city_id); }
      if (is_active !== undefined)  { fields.push(`is_active = $${count++}`);  values.push(is_active); }

      if (fields.length === 0) return null;
      fields.push(`updated_at = NOW()`);
      
      values.push(id);
      query += fields.join(", ") + ` WHERE id = $${count} RETURNING *`;
      const result = await pool.query(query, values);
      return result.rows[0];
    },
    deleteOrganization: async (_, { id }, { user }) => {
      checkAuth(user);
      const query = "UPDATE organizations SET is_deleted = true WHERE id = $1 RETURNING id";
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    }
  }
};

module.exports = { resolvers };
