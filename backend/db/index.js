import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Database connections will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        auth_user_id TEXT,
        title VARCHAR(255),
        plan_text TEXT NOT NULL,
        report_text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE reports
      ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS reports_created_at_idx
      ON reports (created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS reports_user_id_idx
      ON reports (user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS reports_auth_user_id_idx
      ON reports (auth_user_id);
    `);

    console.log('Database initialized: users + reports tables ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

export { pool, initDb };
