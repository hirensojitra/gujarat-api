/**
 * Migration runner — executes create_candidate_image_sets.sql
 * Usage: node migrations/run_migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DBNAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const sqlFile = path.join(__dirname, 'create_candidate_image_sets.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  const client = await pool.connect();
  try {
    console.log('🚀 Running migration...');
    console.log('─────────────────────────────────────────');

    // Split by semicolons but preserve BEGIN/COMMIT blocks and $$ functions
    // Instead, just execute the whole file — pg handles multi-statement
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('─────────────────────────────────────────');

    // Verify tables exist
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organization_image_sets', 'candidate_image_sets')
      ORDER BY table_name
    `);
    console.log('📋 Tables verified:', tables.rows.map(r => r.table_name).join(', '));

    // Check data migration
    const setCount = await client.query('SELECT COUNT(*) as cnt FROM organization_image_sets');
    const cisCount = await client.query('SELECT COUNT(*) as cnt FROM candidate_image_sets');
    console.log(`📊 Organization image sets: ${setCount.rows[0].cnt}`);
    console.log(`📊 Candidate image sets: ${cisCount.rows[0].cnt}`);

    // Check trigger
    const trigger = await client.query(`
      SELECT trigger_name FROM information_schema.triggers 
      WHERE trigger_name = 'trg_candidate_image_set_org_check'
    `);
    console.log(`🔒 Safety trigger: ${trigger.rows.length > 0 ? 'Active ✓' : 'Missing ✗'}`);

    // Check column on org_poster_templates
    const col = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'org_poster_templates' AND column_name = 'required_image_set_id'
    `);
    console.log(`🔗 required_image_set_id column: ${col.rows.length > 0 ? 'Added ✓' : 'Missing ✗'}`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.position) {
      const lines = sql.substring(0, parseInt(err.position)).split('\n');
      console.error(`   Near line ${lines.length} in SQL file`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
