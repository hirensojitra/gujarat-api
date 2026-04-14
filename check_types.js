const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_DBNAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const c = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('org_poster_templates', 'candidates', 'organization_image_sets') AND column_name IN ('organization_id')`);
  console.log(c.rows);
  pool.end();
}
check();
