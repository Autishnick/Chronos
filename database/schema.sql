-- Enable UUID OSSP extension if it isn't already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create capsules table
CREATE TABLE IF NOT EXISTS public.capsules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content_url TEXT NOT NULL,
    location_text TEXT,
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'open')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can insert their own capsules
CREATE POLICY "Users can insert their own capsules"
ON public.capsules FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can read their own capsules
CREATE POLICY "Users can read their own capsules"
ON public.capsules FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 3: Users can update their own capsules
CREATE POLICY "Users can update their own capsules"
ON public.capsules FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own capsules
CREATE POLICY "Users can delete their own capsules"
ON public.capsules FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- =================================================================================
-- STORAGE BUCKET CONFIGURATION
-- =================================================================================

-- 1. Create the bucket (Skip this if you already created it via the Dashboard UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('capsule-media', 'capsule-media', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload files if they own them.
-- Files should be uploaded with a path like: {capsule_id}/filename.ext
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'capsule-media'
    AND auth.uid() = owner
);

-- 3. Allow everyone (or just authenticated) to read files IF the capsule is unlocked.
CREATE POLICY "Allow reading unlocked files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'capsule-media'
    AND (
        EXISTS (
            SELECT 1 FROM public.capsules
            WHERE capsules.id::text = (storage.foldername(name))[1]
            AND timezone('utc'::text, now()) >= capsules.unlock_date
        )
        -- Optional: allow owner to read their own files EVEN if locked?
        -- Uncomment the line below if owners can see their own media anytime:
        -- OR auth.uid() = owner
    )
);

-- 4. Allow users to update/delete their own files
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'capsule-media'
    AND auth.uid() = owner
);

CREATE POLICY "Allow users to update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'capsule-media'
    AND auth.uid() = owner
);
