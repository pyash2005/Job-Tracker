const mysql = require('mysql2/promise');
require('dotenv').config();

// Extract environment variables
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

let pool;

/**
 * Initializes the database by:
 * 1. Connecting to the MySQL host (without specifying the DB name).
 * 2. Creating the database if it does not exist.
 * 3. Establishing a reusable connection pool.
 * 4. Creating the "jobs" table if it does not exist.
 */
async function initDB() {
  try {
    console.log(`Connecting to MySQL host at ${DB_HOST} as ${DB_USER}...`);
    
    // Create a temporary connection to ensure the database exists
    const connection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD
    });

    // Create database query
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    console.log(`Database "${DB_NAME}" checked/created.`);
    await connection.end();

    // Establish the connection pool
    pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Create the jobs table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company VARCHAR(100) NOT NULL,
        role VARCHAR(100) NOT NULL,
        status ENUM('Applied', 'Interview', 'Offer', 'Rejected') DEFAULT 'Applied',
        apply_date DATE NOT NULL,
        job_link VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    
    await pool.query(createTableQuery);
    console.log('Table "jobs" checked/created successfully.');
  } catch (error) {
    console.error('Error during database initialization:', error.message);
    throw error;
  }
}

/**
 * Helper function to execute queries using the connection pool
 */
async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  const [results] = await pool.execute(sql, params);
  return results;
}

module.exports = {
  initDB,
  query
};
