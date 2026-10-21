import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './database.js';

const migrationPath = resolve(import.meta.dirname, '../../database/migrations/001_initial_schema.sql');
const sql = await readFile(migrationPath, 'utf8');

try {
  await pool.query(sql);
  console.log('Migração PostgreSQL aplicada com sucesso.');
} finally {
  await pool.end();
}
