-- Database initialization for HoloCollab EduMeet
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create database if it doesn't exist (handled by environment variables)
-- The database is created by the POSTGRES_DB environment variable

-- Grant permissions (handled by POSTGRES_USER environment variable)
-- The user is created by the POSTGRES_USER environment variable

-- Create indexes for better performance
-- These will be created by the application when tables are created with AUTO_CREATE_TABLES=True