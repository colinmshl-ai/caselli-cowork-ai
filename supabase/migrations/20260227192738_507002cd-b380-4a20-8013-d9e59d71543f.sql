-- Create storage bucket for user files
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can upload to their own folder
CREATE POLICY "Users can upload own files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can update their own files (for upsert)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);