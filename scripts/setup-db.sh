#!/bin/bash

# Database Setup Script for Development

echo "🔧 Setting up PostgreSQL for development..."

# Check if PostgreSQL is running
if ! sudo service postgresql status > /dev/null 2>&1; then
  echo "Starting PostgreSQL..."
  sudo service postgresql start
fi

# Create database user if not exists
echo "Setting up database user..."
sudo -u postgres psql -c "CREATE USER node WITH PASSWORD 'dev_password';" 2>/dev/null || echo "User 'node' already exists"

# Grant privileges
sudo -u postgres psql -c "ALTER USER node WITH SUPERUSER;" 2>/dev/null

# Create database
echo "Creating database..."
sudo -u postgres psql -c "CREATE DATABASE ai_engine_db OWNER node;" 2>/dev/null || echo "Database already exists"

# Grant all privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ai_engine_db TO node;" 2>/dev/null

echo "✅ Database setup complete!"
echo ""
echo "Database credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: ai_engine_db"
echo "  User: node"
echo "  Password: dev_password"
echo ""
echo "⚠️  Update your .env file with these credentials!"
