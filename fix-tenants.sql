-- Fix missing tenants table/data for student creation
-- Run this in Supabase SQL Editor

-- Create tenants table if missing (from schema.sql)
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tenant if no tenants exist
INSERT INTO tenants (subdomain, name, contact_email, is_active)
SELECT 'default', 'Academy Management System', 'admin@example.com', true
WHERE NOT EXISTS (SELECT 1 FROM tenants);

-- Verify
SELECT * FROM tenants LIMIT 5;

-- Update existing students to have tenant_id=1 (if any exist)
UPDATE students SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Verify students table structure
SELECT column_name, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'tenant_id';
