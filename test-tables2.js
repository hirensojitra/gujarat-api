require('dotenv').config();
const pool = require('./database/index');
const fs = require('fs');
async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    fs.writeFileSync('tables.json', JSON.stringify(res.rows.map(r => r.table_name), null, 2));
  } finally {
    pool.end();
  }
}
run();
