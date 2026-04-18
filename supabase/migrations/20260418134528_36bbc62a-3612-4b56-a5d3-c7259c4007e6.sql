-- ============================================================================
-- MyEGA - Consolidated Schema Migration
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'direktur', 'general_manager', 'pegawai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('draft', 'confirm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. UTILITY FUNCTION: update_updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ----------------------------------------------------------------------------
-- 3. CORE TABLES (master data first, no dependencies)
-- ----------------------------------------------------------------------------

-- Directorates
CREATE TABLE IF NOT EXISTS public.directorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  director_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Divisions (depends on directorates)
CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  directorate_id uuid NOT NULL REFERENCES public.directorates(id) ON DELETE CASCADE,
  gm_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (depends on auth.users + divisions)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  username text UNIQUE,
  nip text,
  division_id uuid REFERENCES public.divisions(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'pegawai',
  UNIQUE (user_id, role)
);

-- Roles (descriptive)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Menus
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  label text NOT NULL,
  path text NOT NULL,
  icon text,
  parent_id uuid REFERENCES public.menus(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  action text NOT NULL,
  UNIQUE (menu_id, action)
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  data_scope text NOT NULL DEFAULT 'own_division',
  UNIQUE (role, permission_id)
);

-- Letter Templates
CREATE TABLE IF NOT EXISTS public.letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  dynamic_fields jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Surat Masuk
CREATE TABLE IF NOT EXISTS public.surat_masuk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_surat text NOT NULL,
  nama_surat text NOT NULL,
  asal_surat text NOT NULL,
  catatan text,
  file_url text,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Surat Keluar
CREATE TABLE IF NOT EXISTS public.surat_keluar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_surat text NOT NULL,
  nama_surat text NOT NULL,
  perihal text NOT NULL,
  tujuan text NOT NULL,
  isi_surat text,
  template_id uuid REFERENCES public.letter_templates(id) ON DELETE SET NULL,
  file_url text,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Surat Internal
CREATE TABLE IF NOT EXISTS public.surat_internal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_surat text NOT NULL,
  nama_surat text NOT NULL,
  perihal text NOT NULL,
  isi_surat text,
  template_id uuid REFERENCES public.letter_templates(id) ON DELETE SET NULL,
  tujuan jsonb NOT NULL DEFAULT '[]'::jsonb,
  tebusan jsonb NOT NULL DEFAULT '[]'::jsonb,
  file_url text,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Dispositions (depends on all surat tables + divisions)
CREATE TABLE IF NOT EXISTS public.dispositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  surat_masuk_id uuid REFERENCES public.surat_masuk(id) ON DELETE CASCADE,
  surat_keluar_id uuid REFERENCES public.surat_keluar(id) ON DELETE CASCADE,
  surat_internal_id uuid REFERENCES public.surat_internal(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.dispositions(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  catatan text NOT NULL,
  status public.document_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disposition Reads (unread tracking)
CREATE TABLE IF NOT EXISTS public.disposition_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disposition_id uuid NOT NULL REFERENCES public.dispositions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disposition_id, user_id)
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  target_table text,
  target_id uuid,
  old_state text,
  new_state text,
  ip_address text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. updated_at TRIGGERS
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['directorates','divisions','profiles','roles',
    'letter_templates','surat_masuk','surat_keluar','surat_internal']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', t, t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. SECURITY DEFINER HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin'))
$$;

CREATE OR REPLACE FUNCTION public.get_user_division_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT division_id FROM public.profiles WHERE id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _menu_name text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.menus m ON p.menu_id = m.id
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND m.name = _menu_name AND p.action = _action
  )
$$;

CREATE OR REPLACE FUNCTION public.log_audit(
  _action text, _module text, _target_table text DEFAULT NULL,
  _target_id uuid DEFAULT NULL, _old_state text DEFAULT NULL,
  _new_state text DEFAULT NULL, _details jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, module, target_table, target_id, old_state, new_state, details)
  VALUES (auth.uid(), _action, _module, _target_table, _target_id, _old_state, _new_state, _details);
END; $$;

CREATE OR REPLACE FUNCTION public.count_unread_dispositions(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.dispositions d
  WHERE d.from_user_id <> _user_id
    AND (d.to_user_id = _user_id OR d.to_division_id = public.get_user_division_id(_user_id))
    AND NOT EXISTS (SELECT 1 FROM public.disposition_reads r
      WHERE r.disposition_id = d.id AND r.user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.get_disposition_letter_details(_disposition_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _disp RECORD; _result jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO _disp FROM public.dispositions WHERE id = _disposition_id;
  IF NOT FOUND THEN RETURN _result; END IF;
  IF _disp.from_user_id != auth.uid()
    AND (_disp.to_user_id IS NULL OR _disp.to_user_id != auth.uid())
    AND NOT is_admin(auth.uid())
    AND _disp.to_division_id != get_user_division_id(auth.uid())
  THEN RETURN _result; END IF;

  IF _disp.surat_masuk_id IS NOT NULL THEN
    SELECT jsonb_build_object('type','surat_masuk','id',sm.id,'nama_surat',sm.nama_surat,
      'nomor_surat',sm.nomor_surat,'asal_surat',sm.asal_surat,'catatan',sm.catatan,
      'file_url',sm.file_url,'created_at',sm.created_at,'created_by',sm.created_by,
      'creator_division_id',get_user_division_id(sm.created_by))
    INTO _result FROM public.surat_masuk sm WHERE sm.id = _disp.surat_masuk_id;
  ELSIF _disp.surat_keluar_id IS NOT NULL THEN
    SELECT jsonb_build_object('type','surat_keluar','id',sk.id,'nama_surat',sk.nama_surat,
      'nomor_surat',sk.nomor_surat,'perihal',sk.perihal,'tujuan',sk.tujuan,
      'file_url',sk.file_url,'created_at',sk.created_at,'created_by',sk.created_by,
      'creator_division_id',get_user_division_id(sk.created_by))
    INTO _result FROM public.surat_keluar sk WHERE sk.id = _disp.surat_keluar_id;
  ELSIF _disp.surat_internal_id IS NOT NULL THEN
    SELECT jsonb_build_object('type','surat_internal','id',si.id,'nama_surat',si.nama_surat,
      'nomor_surat',si.nomor_surat,'perihal',si.perihal,'file_url',si.file_url,
      'created_at',si.created_at,'created_by',si.created_by,
      'creator_division_id',get_user_division_id(si.created_by))
    INTO _result FROM public.surat_internal si WHERE si.id = _disp.surat_internal_id;
  END IF;
  RETURN COALESCE(_result, '{}'::jsonb);
END; $$;

-- ----------------------------------------------------------------------------
-- 6. NEW USER HANDLER (auto profile + default role)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, username, nip, division_id)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nip',
    (NEW.raw_user_meta_data->>'division_id')::uuid);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'pegawai');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 7. ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.directorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disposition_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 8. RLS POLICIES
-- ----------------------------------------------------------------------------

-- Directorates
DROP POLICY IF EXISTS "Authenticated can view directorates" ON public.directorates;
CREATE POLICY "Authenticated can view directorates" ON public.directorates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage directorates" ON public.directorates;
CREATE POLICY "Admin can manage directorates" ON public.directorates FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Divisions
DROP POLICY IF EXISTS "Authenticated can view divisions" ON public.divisions;
CREATE POLICY "Authenticated can view divisions" ON public.divisions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage divisions" ON public.divisions;
CREATE POLICY "Admin can manage divisions" ON public.divisions FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "Admin can manage profiles" ON public.profiles;
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin can view all roles" ON public.user_roles;
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admin can manage user roles" ON public.user_roles;
CREATE POLICY "Admin can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Roles
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.roles;
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage roles table" ON public.roles;
CREATE POLICY "Admin can manage roles table" ON public.roles FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Menus
DROP POLICY IF EXISTS "Authenticated can view menus" ON public.menus;
CREATE POLICY "Authenticated can view menus" ON public.menus FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage menus" ON public.menus;
CREATE POLICY "Admin can manage menus" ON public.menus FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Permissions
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.permissions;
CREATE POLICY "Authenticated can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage permissions" ON public.permissions;
CREATE POLICY "Admin can manage permissions" ON public.permissions FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Role Permissions
DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin can manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admin can manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Letter Templates
DROP POLICY IF EXISTS "Authenticated can view letter_templates" ON public.letter_templates;
CREATE POLICY "Authenticated can view letter_templates" ON public.letter_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated can insert letter_templates" ON public.letter_templates;
CREATE POLICY "Authenticated can insert letter_templates" ON public.letter_templates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can manage letter_templates" ON public.letter_templates;
CREATE POLICY "Admin can manage letter_templates" ON public.letter_templates FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Surat Masuk
DROP POLICY IF EXISTS "Authenticated can create surat_masuk" ON public.surat_masuk;
CREATE POLICY "Authenticated can create surat_masuk" ON public.surat_masuk FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can view surat_masuk by scope" ON public.surat_masuk;
CREATE POLICY "Users can view surat_masuk by scope" ON public.surat_masuk FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid()));
DROP POLICY IF EXISTS "Creator or admin can update draft surat_masuk" ON public.surat_masuk;
CREATE POLICY "Creator or admin can update draft surat_masuk" ON public.surat_masuk FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));
DROP POLICY IF EXISTS "Creator or admin can delete draft surat_masuk" ON public.surat_masuk;
CREATE POLICY "Creator or admin can delete draft surat_masuk" ON public.surat_masuk FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));

-- Surat Keluar
DROP POLICY IF EXISTS "Authenticated can create surat_keluar" ON public.surat_keluar;
CREATE POLICY "Authenticated can create surat_keluar" ON public.surat_keluar FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can view surat_keluar by scope" ON public.surat_keluar;
CREATE POLICY "Users can view surat_keluar by scope" ON public.surat_keluar FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid()));
DROP POLICY IF EXISTS "Creator or admin can update draft surat_keluar" ON public.surat_keluar;
CREATE POLICY "Creator or admin can update draft surat_keluar" ON public.surat_keluar FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));
DROP POLICY IF EXISTS "Creator or admin can delete draft surat_keluar" ON public.surat_keluar;
CREATE POLICY "Creator or admin can delete draft surat_keluar" ON public.surat_keluar FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));

-- Surat Internal
DROP POLICY IF EXISTS "Authenticated can create surat_internal" ON public.surat_internal;
CREATE POLICY "Authenticated can create surat_internal" ON public.surat_internal FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Users can view surat_internal by scope" ON public.surat_internal;
CREATE POLICY "Users can view surat_internal by scope" ON public.surat_internal FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid()));
DROP POLICY IF EXISTS "Creator or admin can update draft surat_internal" ON public.surat_internal;
CREATE POLICY "Creator or admin can update draft surat_internal" ON public.surat_internal FOR UPDATE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));
DROP POLICY IF EXISTS "Creator or admin can delete draft surat_internal" ON public.surat_internal;
CREATE POLICY "Creator or admin can delete draft surat_internal" ON public.surat_internal FOR DELETE TO authenticated
  USING (status = 'draft' AND (created_by = auth.uid() OR is_admin(auth.uid())));

-- Dispositions
DROP POLICY IF EXISTS "Users can view relevant dispositions" ON public.dispositions;
CREATE POLICY "Users can view relevant dispositions" ON public.dispositions FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR is_admin(auth.uid())
    OR to_division_id IN (SELECT division_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Authenticated can create dispositions" ON public.dispositions;
CREATE POLICY "Authenticated can create dispositions" ON public.dispositions FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user_id);
DROP POLICY IF EXISTS "Creator can update draft dispositions" ON public.dispositions;
CREATE POLICY "Creator can update draft dispositions" ON public.dispositions FOR UPDATE TO authenticated
  USING (status = 'draft' AND (from_user_id = auth.uid() OR is_admin(auth.uid())));
DROP POLICY IF EXISTS "Creator can delete draft dispositions" ON public.dispositions;
CREATE POLICY "Creator can delete draft dispositions" ON public.dispositions FOR DELETE TO authenticated
  USING (status = 'draft' AND (from_user_id = auth.uid() OR is_admin(auth.uid())));

-- Disposition Reads
DROP POLICY IF EXISTS "Users manage own reads select" ON public.disposition_reads;
CREATE POLICY "Users manage own reads select" ON public.disposition_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users manage own reads insert" ON public.disposition_reads;
CREATE POLICY "Users manage own reads insert" ON public.disposition_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users manage own reads delete" ON public.disposition_reads;
CREATE POLICY "Users manage own reads delete" ON public.disposition_reads FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Audit Logs
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 9. STORAGE BUCKET + POLICIES
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('letter-attachments', 'letter-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can upload letter attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload letter attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'letter-attachments');

DROP POLICY IF EXISTS "Authenticated can read letter attachments" ON storage.objects;
CREATE POLICY "Authenticated can read letter attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'letter-attachments');

DROP POLICY IF EXISTS "Authenticated can update letter attachments" ON storage.objects;
CREATE POLICY "Authenticated can update letter attachments" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'letter-attachments');

DROP POLICY IF EXISTS "Authenticated can delete letter attachments" ON storage.objects;
CREATE POLICY "Authenticated can delete letter attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'letter-attachments');

-- ----------------------------------------------------------------------------
-- 10. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_division ON public.profiles(division_id);
CREATE INDEX IF NOT EXISTS idx_divisions_directorate ON public.divisions(directorate_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_to_division ON public.dispositions(to_division_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_to_user ON public.dispositions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_from_user ON public.dispositions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_parent ON public.dispositions(parent_id);
CREATE INDEX IF NOT EXISTS idx_disposition_reads_user ON public.disposition_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_surat_masuk_created_by ON public.surat_masuk(created_by);
CREATE INDEX IF NOT EXISTS idx_surat_keluar_created_by ON public.surat_keluar(created_by);
CREATE INDEX IF NOT EXISTS idx_surat_internal_created_by ON public.surat_internal(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);