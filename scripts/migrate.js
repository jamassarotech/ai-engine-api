const fs = require('fs');
const path = require('path');
const { pool, testConnection, closePool } = require('../src/db/connection');
const logger = require('../src/utils/logger');

async function runMigration() {
  try {
    // Test connection first
    logger.info('Testing database connection...');
    await testConnection();

    // Read migration file
    const migrationPath = path.join(__dirname, '../src/db/migrations/001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    logger.info('Running migration: 001_initial_schema.sql');

    // Execute migration
    await pool.query(migrationSQL);

    logger.info('Migration completed successfully');

    // Close pool
    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    await closePool();
    process.exit(1);
  }
}

// Run migration
runMigration();
