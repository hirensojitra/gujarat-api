require('dotenv').config();
const pool = require('./database/index');
const fs = require('fs');
async function run() {
  try {
    const resOrg = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='organizations'");
    const resCand = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='candidates'");
    fs.writeFileSync('org_cand_schema.json', JSON.stringify({organizations: resOrg.rows, candidates: resCand.rows}, null, 2));
  } finally {
    pool.end();
  }
}
run();
