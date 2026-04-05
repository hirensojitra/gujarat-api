require('dotenv').config();
const fs = require('fs');
const pool = require('./database/index');
async function run() {
  try {
    await pool.query(fs.readFileSync('./migrations/create_election_assignments.sql', 'utf8'));
    console.log('Tables created');
  } catch (e) {
    console.error('Error', e);
  } finally {
    pool.end();
  }
}
run();
