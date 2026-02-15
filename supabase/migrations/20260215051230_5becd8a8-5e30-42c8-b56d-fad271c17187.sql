
-- Make the letter-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'letter-attachments';

-- Add storage RLS policies for authenticated users
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'letter-attachments');

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'letter-attachments');

CREATE POLICY "Admin can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'letter-attachments' AND public.is_admin(auth.uid()));
