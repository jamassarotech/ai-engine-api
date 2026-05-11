#!/bin/bash

# Alternative Database Setup - No sudo required
# This script uses PostgreSQL's peer authentication

echo "🔧 Setting up PostgreSQL for development (peer auth)..."

# Check if PostgreSQL is running
if ! pgrep -x "postgres" > /dev/null; then
  echo "⚠️  PostgreSQL is not running. Please start it first:"
  echo "   sudo service postgresql start"
  exit 1
fi

# Use peer authentication (connect as current user without password)
echo "Creating database using peer authentication..."

# Try to create database directly
psql -U postgres -h localhost -c "CREATE DATABASE ai_engine_db;" 2>/dev/null && echo "✓ Database created" || echo "Database may already exist"

# Alternative: Configure for trust authentication on localhost
echo ""
echo "If the above failed, you need to:"
echo "1. Edit PostgreSQL config to allow trust authentication:"
echo "   sudo nano /etc/postgresql/15/main/pg_hba.conf"
echo ""
echo "2. Find the line: local   all   postgres   peer"
echo "   Add below:    local   all   node       trust"
echo ""
echo "3. Restart PostgreSQL:"
echo "   sudo service postgresql restart"
echo ""
echo "Then run: npm run migrate"
