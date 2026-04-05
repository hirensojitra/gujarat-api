const pool = require('../../database/index');

const checkAuth = (user) => {
  if (!user || !user.role ||
    (user.role.toUpperCase() !== 'ADMINISTRATOR' && user.role.toUpperCase() !== 'OWNER')) {
    throw new Error('Unauthorized');
  }
};

const orgPosterTemplateResolvers = {
  Query: {
    getOrgPosterTemplates: async (_, { organization_id }, { user }) => {
      checkAuth(user);
      try {
        const result = await pool.query(
          `SELECT * FROM org_poster_templates
           WHERE organization_id = $1
           ORDER BY role, sort_order, created_at`,
          [organization_id]
        );
        return result.rows;
      } catch (err) {
        throw new Error(`Failed to fetch poster templates: ${err.message}`);
      }
    },
  },
  Mutation: {
    addOrgPosterTemplate: async (_, { organization_id, post_id, role, label, sort_order }, { user }) => {
      checkAuth(user);
      try {
        const result = await pool.query(
          `INSERT INTO org_poster_templates (organization_id, post_id, role, label, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [organization_id, post_id, role, label || null, sort_order || 0]
        );
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to add poster template: ${err.message}`);
      }
    },

    updateOrgPosterTemplate: async (_, { id, label, sort_order, is_active }, { user }) => {
      checkAuth(user);
      try {
        const fields = [];
        const values = [];
        if (label !== undefined)      { values.push(label);      fields.push(`label = $${values.length}`); }
        if (sort_order !== undefined) { values.push(sort_order); fields.push(`sort_order = $${values.length}`); }
        if (is_active !== undefined)  { values.push(is_active);  fields.push(`is_active = $${values.length}`); }
        if (!fields.length) throw new Error('Nothing to update');
        fields.push(`updated_at = NOW()`);
        values.push(id);
        const result = await pool.query(
          `UPDATE org_poster_templates SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
          values
        );
        return result.rows[0];
      } catch (err) {
        throw new Error(`Failed to update poster template: ${err.message}`);
      }
    },

    removeOrgPosterTemplate: async (_, { id }, { user }) => {
      checkAuth(user);
      try {
        const result = await pool.query(
          'DELETE FROM org_poster_templates WHERE id = $1',
          [id]
        );
        return result.rowCount > 0;
      } catch (err) {
        throw new Error(`Failed to remove poster template: ${err.message}`);
      }
    },
  },
};

module.exports = { resolvers: orgPosterTemplateResolvers };
