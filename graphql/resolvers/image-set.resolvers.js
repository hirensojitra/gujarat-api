const path = require('path');
const fs = require('fs');
const pool = require('../../database/index');

const checkAuth = (user) => {
  if (!user || !user.role ||
    (user.role.toUpperCase() !== 'ADMINISTRATOR' && user.role.toUpperCase() !== 'OWNER')) {
    throw new Error('Unauthorized');
  }
};

const imageSetResolvers = {
  // ─── Field Resolvers ────────────────────────────────────────────────────────
  OrganizationImageSet: {
    candidate_usage_count: async (parent) => {
      const result = await pool.query(
        `SELECT COUNT(*) as cnt FROM candidate_image_sets
         WHERE org_image_set_id = $1
           AND (img_front IS NOT NULL OR img_left IS NOT NULL OR img_right IS NOT NULL)`,
        [parent.id]
      );
      return parseInt(result.rows[0].cnt);
    },
    total_candidate_count: async (parent) => {
      const result = await pool.query(
        `SELECT COUNT(*) as cnt FROM candidates WHERE organization_id = $1`,
        [parent.organization_id]
      );
      return parseInt(result.rows[0].cnt);
    },
    complete_candidate_count: async (parent) => {
      const result = await pool.query(
        `SELECT COUNT(*) as cnt FROM candidate_image_sets
         WHERE org_image_set_id = $1
           AND img_front IS NOT NULL AND img_left IS NOT NULL AND img_right IS NOT NULL`,
        [parent.id]
      );
      return parseInt(result.rows[0].cnt);
    },
  },

  CandidateImageSet: {
    org_image_set: async (parent) => {
      const result = await pool.query(
        'SELECT * FROM organization_image_sets WHERE id = $1',
        [parent.org_image_set_id]
      );
      return result.rows[0] || null;
    },
  },

  // ─── Queries ────────────────────────────────────────────────────────────────
  Query: {
    checkSetDeletion: async (_, { set_id }, { user }) => {
      // 1. Candidate image usage (with avatar URL for modal)
      const candidateResult = await pool.query(`
        SELECT c.id as candidate_id, c.full_name,
               cis.img_front as img_front_url,
               cis.img_front IS NOT NULL as img_front,
               cis.img_left IS NOT NULL as img_left,
               cis.img_right IS NOT NULL as img_right
        FROM candidate_image_sets cis
        JOIN candidates c ON c.id = cis.candidate_id
        WHERE cis.org_image_set_id = $1
          AND (cis.img_front IS NOT NULL OR cis.img_left IS NOT NULL OR cis.img_right IS NOT NULL)
        ORDER BY c.full_name
      `, [set_id]);

      // 2. Template dependency
      const tplResult = await pool.query(`
        SELECT id as template_id, label, post_id, role
        FROM org_poster_templates
        WHERE required_image_set_id = $1
      `, [set_id]);

      return {
        can_delete: candidateResult.rows.length === 0 && tplResult.rows.length === 0,
        usage_count: candidateResult.rows.length,
        candidates: candidateResult.rows,
        dependent_template_count: tplResult.rows.length,
        dependent_templates: tplResult.rows,
      };
    },
  },

  // ─── Mutations ──────────────────────────────────────────────────────────────
  Mutation: {
    addOrganizationImageSet: async (_, { organization_id, label, max_file_size_kb, aspect_ratio, allowed_formats }, { user }) => {
      checkAuth(user);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get next set_index
        const maxIdx = await client.query(
          'SELECT COALESCE(MAX(set_index), 0) as max_idx FROM organization_image_sets WHERE organization_id = $1 AND is_deleted = false',
          [organization_id]
        );
        const nextIndex = parseInt(maxIdx.rows[0].max_idx) + 1;

        // Create org set
        const setResult = await client.query(
          `INSERT INTO organization_image_sets (organization_id, set_index, label, max_file_size_kb, aspect_ratio, allowed_formats)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [organization_id, nextIndex, label, max_file_size_kb || 2048, aspect_ratio || '3:4', allowed_formats || 'png']
        );
        const newSet = setResult.rows[0];

        // AUTO-PROVISION: Create empty candidate_image_sets for ALL candidates in this org
        await client.query(
          `INSERT INTO candidate_image_sets (candidate_id, org_image_set_id)
           SELECT id, $1 FROM candidates WHERE organization_id = $2
           ON CONFLICT DO NOTHING`,
          [newSet.id, organization_id]
        );

        await client.query('COMMIT');
        return newSet;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },

    updateOrganizationImageSet: async (_, { id, label, max_file_size_kb, aspect_ratio, allowed_formats }, { user }) => {
      checkAuth(user);
      const fields = [];
      const values = [];
      let count = 1;

      if (label !== undefined) { fields.push(`label = $${count++}`); values.push(label); }
      if (max_file_size_kb !== undefined) { fields.push(`max_file_size_kb = $${count++}`); values.push(max_file_size_kb); }
      if (aspect_ratio !== undefined) { fields.push(`aspect_ratio = $${count++}`); values.push(aspect_ratio); }
      if (allowed_formats !== undefined) { fields.push(`allowed_formats = $${count++}`); values.push(allowed_formats); }

      if (fields.length === 0) throw new Error('Nothing to update');

      values.push(id);
      const result = await pool.query(
        `UPDATE organization_image_sets SET ${fields.join(', ')} WHERE id = $${count} AND is_deleted = false RETURNING *`,
        values
      );
      if (!result.rows[0]) throw new Error('Image set not found or deleted');
      return result.rows[0];
    },

    deleteOrganizationImageSet: async (_, { id }, { user }) => {
      checkAuth(user);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // CHECK 1: Template dependency
        const tplUsage = await client.query(
          'SELECT id, label, role FROM org_poster_templates WHERE required_image_set_id = $1',
          [id]
        );
        if (tplUsage.rows.length > 0) {
          const names = tplUsage.rows.map(t => `"${t.label}" (${t.role})`).join(', ');
          throw new Error(
            `Cannot delete: ${tplUsage.rows.length} poster template(s) depend on this set: ${names}. ` +
            `Reassign them to another set first.`
          );
        }

        // CHECK 2: Candidate image usage
        const usage = await client.query(`
          SELECT COUNT(*) as cnt FROM candidate_image_sets
          WHERE org_image_set_id = $1
            AND (img_front IS NOT NULL OR img_left IS NOT NULL OR img_right IS NOT NULL)
        `, [id]);
        if (parseInt(usage.rows[0].cnt) > 0) {
          throw new Error(`Cannot delete: ${usage.rows[0].cnt} candidate(s) have images in this set.`);
        }

        // Safe — Soft delete
        const deleted = await client.query(
          'UPDATE organization_image_sets SET is_deleted = true WHERE id = $1 RETURNING organization_id',
          [id]
        );
        if (!deleted.rows[0]) throw new Error('Image set not found');
        const { organization_id } = deleted.rows[0];

        // Re-index remaining active sets to fill gap
        await client.query(`
          WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY set_index) as new_idx
            FROM organization_image_sets
            WHERE organization_id = $1 AND is_deleted = false
          )
          UPDATE organization_image_sets ois
          SET set_index = ranked.new_idx
          FROM ranked
          WHERE ois.id = ranked.id
        `, [organization_id]);

        await client.query('COMMIT');
        return true;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },

    restoreOrganizationImageSet: async (_, { id }, { user }) => {
      checkAuth(user);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get set info
        const setInfo = await client.query(
          'SELECT * FROM organization_image_sets WHERE id = $1 AND is_deleted = true',
          [id]
        );
        if (!setInfo.rows[0]) throw new Error('Set not found or not deleted');
        const orgId = setInfo.rows[0].organization_id;

        // Get next available index
        const maxIdx = await client.query(
          'SELECT COALESCE(MAX(set_index), 0) as max_idx FROM organization_image_sets WHERE organization_id = $1 AND is_deleted = false',
          [orgId]
        );
        const nextIndex = parseInt(maxIdx.rows[0].max_idx) + 1;

        // Restore
        const result = await client.query(
          'UPDATE organization_image_sets SET is_deleted = false, set_index = $1 WHERE id = $2 RETURNING *',
          [nextIndex, id]
        );

        // Re-provision empty candidate_image_sets rows
        await client.query(
          `INSERT INTO candidate_image_sets (candidate_id, org_image_set_id)
           SELECT id, $1 FROM candidates WHERE organization_id = $2
           ON CONFLICT DO NOTHING`,
          [id, orgId]
        );

        await client.query('COMMIT');
        return result.rows[0];
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },

    purgeOrganizationImageSet: async (_, { id }, { user }) => {
      checkAuth(user);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Only allow purging soft-deleted sets
        const setInfo = await client.query(
          'SELECT * FROM organization_image_sets WHERE id = $1 AND is_deleted = true',
          [id]
        );
        if (!setInfo.rows[0]) throw new Error('Set not found or not soft-deleted. Only soft-deleted sets can be purged.');

        // Get all image files to clean up
        const images = await client.query(
          `SELECT img_front, img_left, img_right FROM candidate_image_sets WHERE org_image_set_id = $1`,
          [id]
        );

        // Delete DB rows (cascade from organization_image_sets will remove candidate_image_sets)
        await client.query('DELETE FROM organization_image_sets WHERE id = $1', [id]);

        // Cleanup physical files
        const uploadDir = path.join(__dirname, '..', '..');
        for (const row of images.rows) {
          for (const col of ['img_front', 'img_left', 'img_right']) {
            if (row[col]) {
              try {
                const filePath = path.join(uploadDir, row[col].replace(/^\//, ''));
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
              } catch (e) {
                console.warn(`Could not delete file: ${e.message}`);
              }
            }
          }
        }

        await client.query('COMMIT');
        return true;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },

    uploadCandidateSetImage: async (_, { candidate_id, org_image_set_id, angle, image }, { user }) => {
      checkAuth(user);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Map angle enum to column
        const columnMap = { FRONT: 'img_front', LEFT: 'img_left', RIGHT: 'img_right' };
        const column = columnMap[angle];
        if (!column) throw new Error('Invalid angle');

        // 2. Load set's validation rules
        const setRules = await client.query(`
          SELECT ois.max_file_size_kb, ois.aspect_ratio, ois.allowed_formats, ois.organization_id
          FROM organization_image_sets ois WHERE ois.id = $1 AND ois.is_deleted = false
        `, [org_image_set_id]);
        if (!setRules.rows[0]) throw new Error('Image set not found or deleted');
        const rules = setRules.rows[0];

        // 3. Cross-org validation
        const candOrg = await client.query('SELECT organization_id FROM candidates WHERE id = $1', [candidate_id]);
        if (!candOrg.rows[0]) throw new Error('Candidate not found');
        if (String(candOrg.rows[0].organization_id) !== String(rules.organization_id)) {
          throw new Error("Candidate does not belong to this set's organization");
        }

        // 4. Resolve file upload
        const resolvedImage = await image;
        const { createReadStream, mimetype } = resolvedImage;

        // 5. Format validation
        const allowedFormats = rules.allowed_formats.split(',').map(f => f.trim().toLowerCase());
        const formatMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
        const fileFormat = formatMap[mimetype];
        if (!fileFormat || !allowedFormats.includes(fileFormat)) {
          throw new Error(`Invalid format "${mimetype}". Allowed: ${rules.allowed_formats}`);
        }

        // 6. Stream to buffer for size check
        const chunks = [];
        const stream = createReadStream();
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);

        // 7. File size validation
        const fileSizeKb = buffer.length / 1024;
        if (fileSizeKb > rules.max_file_size_kb) {
          throw new Error(`File too large (${Math.round(fileSizeKb)}KB). Max: ${rules.max_file_size_kb}KB`);
        }

        // 8. Get old file path for cleanup
        const existing = await client.query(
          `SELECT ${column} FROM candidate_image_sets WHERE candidate_id = $1 AND org_image_set_id = $2`,
          [candidate_id, org_image_set_id]
        );
        const oldPath = existing.rows[0]?.[column];

        // 9. Save file
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'candidates');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `cis_${candidate_id}_${org_image_set_id}_${angle.toLowerCase()}_${Date.now()}.${fileFormat}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, buffer);
        const imageUrl = `/uploads/candidates/${fileName}`;

        // 10. Upsert candidate_image_sets row
        const upsertResult = await client.query(`
          INSERT INTO candidate_image_sets (candidate_id, org_image_set_id, ${column})
          VALUES ($1, $2, $3)
          ON CONFLICT (candidate_id, org_image_set_id)
          DO UPDATE SET ${column} = $3, updated_at = NOW()
          RETURNING *
        `, [candidate_id, org_image_set_id, imageUrl]);

        // 11. Cleanup old file
        if (oldPath) {
          try {
            const oldAbsPath = path.join(__dirname, '..', '..', oldPath.replace(/^\//, ''));
            if (fs.existsSync(oldAbsPath)) {
              fs.unlinkSync(oldAbsPath);
              console.log(`🗑️  Deleted old set image: ${oldAbsPath}`);
            }
          } catch (deleteErr) {
            console.warn(`⚠️  Could not delete old image: ${deleteErr.message}`);
          }
        }

        await client.query('COMMIT');
        return upsertResult.rows[0];
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
  },
};

module.exports = { resolvers: imageSetResolvers };
