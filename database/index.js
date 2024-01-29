// const mysql = require('mysql2')

// const pool = mysql.createPool({
//     host: process.env.DB_HOST, 
//     user: process.env.DB_USERNAME, 
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DBNAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// pool.getConnection((err, conn) => {
//     if(err) console.log(err)
//     console.log("Connected successfully")
// })

// module.exports = pool.promise()

const { Pool } = require('pg');

// Create a new Pool instance with connection details
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_DBNAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT, // Provide your PostgreSQL port
    ssl: {
        rejectUnauthorized: false, // Disable SSL certificate verification if using self-signed certificates
    },
});

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected successfully');
    // release(); // Release the client back to the pool
});

module.exports = pool;
