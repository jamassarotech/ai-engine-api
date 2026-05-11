#!/usr/bin/env node
/**
 * Simple Database Query Tool
 * Usage: node scripts/db-query.js "SELECT * FROM queries LIMIT 5"
 */

const { pool } = require('../src/db/connection');

const query = process.argv[2] || 'SELECT current_database(), current_user;';

async function runQuery() {
  try {
    console.log('\n📊 Running query:', query);
    console.log('─'.repeat(60));
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No results.');
    } else {
      console.table(result.rows);
      console.log(`\n✓ ${result.rows.length} rows returned`);
    }
    
  } catch (error) {
    console.error('❌ Query error:', error.message);
  } finally {
    await pool.end();
  }
}

runQuery();
