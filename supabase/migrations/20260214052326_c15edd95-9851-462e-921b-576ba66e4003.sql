-- Create storage bucket for dispatch media
INSERT INTO storage.buckets (id, name, public) VALUES ('dispatch-media', 'dispatch-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload dispatch media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dispatch-media' AND auth.uid() IS NOT NULL);

-- Allow public read
CREATE POLICY "Dispatch media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'dispatch-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own dispatch media"
ON storage.objects FOR DELETE
USING (bucket_id = 'dispatch-media' AND auth.uid() IS NOT NULL);