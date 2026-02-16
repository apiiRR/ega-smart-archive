
-- 1. Drop category from letter_templates
ALTER TABLE public.letter_templates DROP COLUMN IF EXISTS category;

-- 2. Create surat_internal table
CREATE TABLE public.surat_internal (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor_surat text NOT NULL,
  nama_surat text NOT NULL,
  perihal text NOT NULL,
  isi_surat text,
  template_id uuid REFERENCES public.letter_templates(id),
  tujuan jsonb NOT NULL DEFAULT '[]'::jsonb,
  tebusan jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_url text,
  created_by uuid NOT NULL,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at
CREATE TRIGGER update_surat_internal_updated_at
  BEFORE UPDATE ON public.surat_internal
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.surat_internal ENABLE ROW LEVEL SECURITY;

-- SELECT: admin sees all, others see if creator, same division, in tujuan, or in tebusan
CREATE POLICY "Users can view surat_internal by scope"
  ON public.surat_internal FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid())
    OR tujuan @> to_jsonb(get_user_division_id(auth.uid())::text)
    OR tebusan @> to_jsonb(get_user_division_id(auth.uid())::text)
  );

-- INSERT
CREATE POLICY "Authenticated can create surat_internal"
  ON public.surat_internal FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE: only draft, creator or admin
CREATE POLICY "Creator or admin can update draft surat_internal"
  ON public.surat_internal FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));

-- DELETE: only draft, creator or admin
CREATE POLICY "Creator or admin can delete draft surat_internal"
  ON public.surat_internal FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));

-- 3. Add surat_internal_id to dispositions
ALTER TABLE public.dispositions ADD COLUMN surat_internal_id uuid REFERENCES public.surat_internal(id);

-- 4. Update menus: reorganize sort orders
UPDATE public.menus SET sort_order = 1 WHERE name = 'dashboard';
UPDATE public.menus SET sort_order = 2 WHERE name = 'surat_masuk';
UPDATE public.menus SET sort_order = 3 WHERE name = 'surat_keluar';
-- template_surat stays
UPDATE public.menus SET sort_order = 10 WHERE name = 'template_surat';
-- disposisi moves to inbox group
UPDATE public.menus SET sort_order = 8 WHERE name = 'disposisi';
-- master data
UPDATE public.menus SET sort_order = 11 WHERE name = 'master_direktorat';
UPDATE public.menus SET sort_order = 12 WHERE name = 'master_divisi';
UPDATE public.menus SET sort_order = 13 WHERE name = 'master_user';
-- settings
UPDATE public.menus SET sort_order = 14 WHERE name = 'rbac';
UPDATE public.menus SET sort_order = 15 WHERE name = 'audit_log';

-- Insert new menus
INSERT INTO public.menus (name, label, path, icon, sort_order) VALUES
  ('surat_internal', 'Surat Internal', '/surat-internal', 'FileText', 4),
  ('inbox_internal', 'Surat Masuk Internal', '/inbox/internal', 'Inbox', 6),
  ('inbox_tebusan', 'Tebusan Surat', '/inbox/tebusan', 'ArrowRightLeft', 7);

-- 5. Add permissions for new menus (read, create, update, delete)
INSERT INTO public.permissions (menu_id, action)
SELECT m.id, a.action
FROM public.menus m
CROSS JOIN (VALUES ('read'), ('create'), ('update'), ('delete')) AS a(action)
WHERE m.name IN ('surat_internal', 'inbox_internal', 'inbox_tebusan');

-- 6. Grant all new permissions to super_admin
INSERT INTO public.role_permissions (role, permission_id, data_scope)
SELECT 'super_admin', p.id, 'all'
FROM public.permissions p
JOIN public.menus m ON p.menu_id = m.id
WHERE m.name IN ('surat_internal', 'inbox_internal', 'inbox_tebusan');
