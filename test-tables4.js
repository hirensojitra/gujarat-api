require('dotenv').config();
const pool = require('./database/index');
const fs = require('fs');
async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='org_poster_templates'");
    fs.writeFileSync('org_poster_schema.json', JSON.stringify(res.rows, null, 2));
  } finally {
    pool.end();
  }
}
run();
