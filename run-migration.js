require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./database/index');

async function run() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', 'create_election_post_details.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration script...');
    await pool.query(sql);
    console.log('Migration successfully completed! The election_post_details table now exists.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

run();
