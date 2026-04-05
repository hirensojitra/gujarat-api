require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./database/index');

async function runSQL() {
  try {
    const sqlCommands = fs.readFileSync(path.join(__dirname, 'database', 'candidate_tables.sql')).toString();
    await pool.query(sqlCommands);
    console.log("SQL executed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error executing SQL:", err);
    process.exit(1);
  }
}

runSQL();
