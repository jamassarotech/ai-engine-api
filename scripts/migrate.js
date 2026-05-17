const fs = require('fs');
const path = require('path');
const { pool, testConnection, closePool } = require('../src/db/connection');
const logger = require('../src/utils/logger');

async function runMigrations() {
  try {
    // Test connection first
    logger.info('Testing database connection...');
    await testConnection();

    // Get all migration files
    const migrationsDir = path.join(__dirname, '../src/db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run in order

    logger.info(`Found ${files.length} migration file(s)`);

    // Run each migration
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      logger.info(`Running migration: ${file}`);
      await pool.query(migrationSQL);
      logger.info(`✓ ${file} completed`);
    }

    logger.info('All migrations completed successfully');

    // Close pool
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    await closePool();
    process.exit(1);
  }
}

// Run migrations
runMigrations();
