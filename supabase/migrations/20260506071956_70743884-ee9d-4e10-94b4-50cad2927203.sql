
-- Master Jenis Surat
CREATE TABLE public.letter_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.letter_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view letter_types"
  ON public.letter_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage letter_types"
  ON public.letter_types FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_letter_types_updated_at
  BEFORE UPDATE ON public.letter_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add jenis_surat_id to surat_internal (nullable to not break existing rows; required enforced by app)
ALTER TABLE public.surat_internal
  ADD COLUMN jenis_surat_id uuid REFERENCES public.letter_types(id) ON DELETE SET NULL;

-- Rename "Surat Keluar" menu label to "Arsip Surat"
UPDATE public.menus SET label = 'Arsip Surat' WHERE name = 'surat_keluar';

-- Add menu entry for Master Jenis Surat
INSERT INTO public.menus (name, label, path, icon, sort_order)
VALUES ('master_jenis_surat', 'Jenis Surat', '/master/letter-types', 'FileType', 13);

-- Add permissions for the new menu (CRUD)
WITH m AS (SELECT id FROM public.menus WHERE name = 'master_jenis_surat')
INSERT INTO public.permissions (menu_id, action)
SELECT m.id, a FROM m, unnest(ARRAY['read','create','update','delete']) a;

-- Grant super_admin all
INSERT INTO public.role_permissions (role, permission_id, data_scope)
SELECT 'super_admin'::app_role, p.id, 'all'
FROM public.permissions p
JOIN public.menus m ON m.id = p.menu_id
WHERE m.name = 'master_jenis_surat';
