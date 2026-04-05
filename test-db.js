require('dotenv').config();
const pool = require('./database/index');
async function run() {
  try {
    const r2 = await pool.query("SELECT id, title, data FROM election_post_details WHERE id='4q55npt7q'");
    console.log(JSON.stringify(r2.rows[0], null, 2));
  } finally {
    pool.end();
  }
}
run();
