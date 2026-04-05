require('dotenv').config();
const pool = require('./database/index');
async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log(res.rows.map(r => r.table_name));
  } finally {
    pool.end();
  }
}
run();
