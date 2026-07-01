-- Supabase Storage Setup Script
-- This script sets up the necessary storage buckets and policies for image management

-- NOTE: Storage bucket creation must be done via Supabase Dashboard or Supabase CLI
-- This script assumes the "images" bucket already exists

-- ============================================
-- STORAGE BUCKET SETUP (RUN IN SUPABASE DASHBOARD)
-- ============================================
-- 
-- 1. Go to Supabase Dashboard → Storage
-- 2. Create new bucket with:
--    Name: "images"
--    Public: Yes (if you want public URLs)
--    File size limit: 5MB (5242880)
--
-- Or use Supabase CLI:
--   supabase storage create-bucket images --public
--
-- ============================================

-- Add storage policy for authenticated users (optional, if not using public bucket)
-- This allows authenticated users to upload images

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'images');

-- Create storage policy: Allow authenticated users to read
CREATE POLICY "Allow public read" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'images');

-- Create storage policy: Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'images');

-- Create storage policy: Allow authenticated users to update
CREATE POLICY "Allow authenticated update" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'images');
