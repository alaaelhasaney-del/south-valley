# Image Management System - Environment Setup

## 1. Required Environment Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key

# Optional: Service role key for admin operations (use carefully)
SUPABASE_SERVICE_KEY=your-service-role-key
```

## 2. How to Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Anon public** → `SUPABASE_KEY`

## 3. Create Storage Bucket

### Option A: Via Supabase Dashboard

1. Go to **Storage** section
2. Click **New Bucket**
3. Name: `images`
4. Make it **Public** (for direct URL access)
5. Set file size limit: 5MB

### Option B: Via Supabase CLI

```bash
supabase storage create-bucket images --public
```

## 4. Install Required Dependencies

```bash
npm install multer
```

The project already has `@supabase/supabase-js` installed.

## 5. Database Migration

Run the migration SQL to add image columns:

```sql
-- Run in Supabase SQL Editor
-- File: migrations/001-add-image-url-column.sql
```

Or via command line:

```bash
psql $DATABASE_URL < migrations/001-add-image-url-column.sql
```

## 6. Verify Setup

Test the connection:

```bash
node -e "
const supabase = require('@supabase/supabase-js');
const client = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log('Supabase client initialized:', !!client);
"
```

## 7. Next Steps

1. ✓ Add environment variables
2. ✓ Create storage bucket
3. ✓ Run database migration
4. ✓ Integrate routes into server.js
5. ✓ Run photo migration script (if you have old Base64 photos)
