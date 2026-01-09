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
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        auth_user_id TEXT NOT NULL,
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
      CREATE TABLE IF NOT EXISTS user_vector_stores (
        auth_user_id TEXT PRIMARY KEY,
        vector_store_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS report_vector_files (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        auth_user_id TEXT NOT NULL,
        vector_store_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        vector_store_file_id TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS reports_created_at_idx
      ON reports (created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS reports_auth_user_id_idx
      ON reports (auth_user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS user_vector_stores_vector_store_id_idx
      ON user_vector_stores (vector_store_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS report_vector_files_report_id_idx
      ON report_vector_files (report_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS report_vector_files_auth_user_id_idx
      ON report_vector_files (auth_user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS report_vector_files_file_id_idx
      ON report_vector_files (file_id);
    `);

    console.log('Database initialized: reports + vector tables ready.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    if (client) {
      client.release();
    }
  }
};

export { pool, initDb };
