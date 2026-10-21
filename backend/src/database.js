import { getConnectionString } from '@netlify/database';
import pg from 'pg';
import { config } from './config.js';

const connectionString = process.env.NETLIFY_DB_URL || config.databaseUrl || getConnectionString();

if (!connectionString) {
  throw new Error('DATABASE_URL não configurado ou inválido.');
}

const useSsl = config.nodeEnv === 'production' && !connectionString.includes('localhost');

export const pool = new pg.Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
