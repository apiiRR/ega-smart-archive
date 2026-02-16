
-- Create new shared document_status enum
CREATE TYPE public.document_status AS ENUM ('draft', 'confirm');

-- Update surat_masuk: change status column
ALTER TABLE public.surat_masuk 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.surat_masuk 
  ALTER COLUMN status TYPE public.document_status 
  USING 'draft'::public.document_status;

ALTER TABLE public.surat_masuk 
  ALTER COLUMN status SET DEFAULT 'draft'::public.document_status;

-- Update surat_keluar: change status column
ALTER TABLE public.surat_keluar 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.surat_keluar 
  ALTER COLUMN status TYPE public.document_status 
  USING (CASE WHEN status::text = 'draft' THEN 'draft'::public.document_status ELSE 'draft'::public.document_status END);

ALTER TABLE public.surat_keluar 
  ALTER COLUMN status SET DEFAULT 'draft'::public.document_status;

-- Drop old enums
DROP TYPE IF EXISTS public.surat_masuk_status;
DROP TYPE IF EXISTS public.surat_keluar_status;

-- Add status column to dispositions
ALTER TABLE public.dispositions 
  ADD COLUMN status public.document_status NOT NULL DEFAULT 'draft'::public.document_status;

-- Update RLS: surat_masuk UPDATE only when draft
DROP POLICY IF EXISTS "Creator or admin can update surat_masuk" ON public.surat_masuk;
CREATE POLICY "Creator or admin can update draft surat_masuk"
ON public.surat_masuk
FOR UPDATE
TO authenticated
USING (
  status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid()))
);

-- Update RLS: surat_masuk DELETE only when draft
DROP POLICY IF EXISTS "Admin can delete surat_masuk" ON public.surat_masuk;
CREATE POLICY "Creator or admin can delete draft surat_masuk"
ON public.surat_masuk
FOR DELETE
TO authenticated
USING (
  status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid()))
);

-- Update RLS: surat_keluar UPDATE only when draft
DROP POLICY IF EXISTS "Creator or admin can update surat_keluar" ON public.surat_keluar;
CREATE POLICY "Creator or admin can update draft surat_keluar"
ON public.surat_keluar
FOR UPDATE
TO authenticated
USING (
  status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid()))
);

-- Update RLS: surat_keluar DELETE only when draft
DROP POLICY IF EXISTS "Admin can delete surat_keluar" ON public.surat_keluar;
CREATE POLICY "Creator or admin can delete draft surat_keluar"
ON public.surat_keluar
FOR DELETE
TO authenticated
USING (
  status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid()))
);

-- Update RLS: dispositions UPDATE only when draft
DROP POLICY IF EXISTS "Creator or admin can update dispositions" ON public.dispositions;
CREATE POLICY "Creator can update draft dispositions"
ON public.dispositions
FOR UPDATE
TO authenticated
USING (
  status = 'draft' AND (from_user_id = auth.uid() OR is_admin(auth.uid()))
);

-- Update RLS: dispositions DELETE only when draft
DROP POLICY IF EXISTS "Creator or admin can delete dispositions" ON public.dispositions;
CREATE POLICY "Creator can delete draft dispositions"
ON public.dispositions
FOR DELETE
TO authenticated
USING (
  status = 'draft' AND (from_user_id = auth.uid() OR is_admin(auth.uid()))
);
