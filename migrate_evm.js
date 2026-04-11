const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_DBNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Connecting to Add EVM Index...");
        await pool.query('ALTER TABLE candidates ADD COLUMN IF NOT EXISTS evm_index INTEGER;');
        console.log("Migration successful: evm_index column added.");
    } catch (err) {
        console.error("Migration error:", err.message);
    } finally {
        pool.end();
    }
}
run();
