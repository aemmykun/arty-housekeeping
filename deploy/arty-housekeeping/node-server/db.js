const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL || null;

const pool = new Pool({
  connectionString: connectionString,
  host: process.env.PGHOST,
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE
});

async function testConnection() {
  try {
    const r = await pool.query('SELECT 1 as ok');
    return r.rows[0];
  } catch (e) {
    throw e;
  }
}

module.exports = { pool, testConnection };
