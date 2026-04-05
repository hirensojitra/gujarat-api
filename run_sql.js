require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_DBNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
});

const sqlFile = process.argv[2] || './database/org_poster_templates.sql';
const sql = fs.readFileSync(sqlFile, 'utf8');

pool.query(sql)
  .then(res => { console.log(`✅ Successfully executed: ${sqlFile}`); process.exit(0); })
  .catch(err => { console.error('❌ Error executing query', err.message); process.exit(1); });
