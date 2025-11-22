import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Run migrations in order (001, 002, etc.)

    console.log(`Found ${files.length} migration(s) to run...`);

    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      const migrationSQL = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      await pool.query(migrationSQL);
      console.log(`✓ ${file} completed`);
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

