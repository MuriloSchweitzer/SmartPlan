import app from './app.js';
import { config } from './config.js';
import { pool } from './database.js';

await pool.query('SELECT 1');
app.listen(config.port, () => {
  console.log(`SmartPlan API disponível em http://localhost:${config.port}`);
});
