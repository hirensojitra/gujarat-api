require('dotenv').config();
const pool = require('./database/index');
async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='org_poster_templates'");
    console.log("org_poster_templates:", res.rows);
  } finally {
    pool.end();
  }
}
run();
