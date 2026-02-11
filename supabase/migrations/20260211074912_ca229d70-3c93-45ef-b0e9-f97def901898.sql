
-- =============================================
-- MyEGA Database Schema - Fase 1: RBAC & Profiles
-- =============================================

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'direktur', 'general_manager', 'pegawai');

-- 2. Roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate from profiles per security requirement)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'pegawai',
  UNIQUE(user_id, role)
);

-- 4. Directorates table
CREATE TABLE public.directorates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  director_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Divisions table
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  directorate_id UUID NOT NULL REFERENCES public.directorates(id) ON DELETE CASCADE,
  gm_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  nip TEXT UNIQUE,
  division_id UUID REFERENCES public.divisions(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Menus table (for RBAC menu access)
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon TEXT,
  path TEXT NOT NULL,
  parent_id UUID REFERENCES public.menus(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- create, read, update, delete, approve, dispose
  UNIQUE(menu_id, action)
);

-- 9. Role permissions (linking roles to permissions)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  data_scope TEXT NOT NULL DEFAULT 'own_division', -- 'all', 'own_division', 'own'
  UNIQUE(role, permission_id)
);

-- 10. Audit logs (immutable)
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  old_state TEXT,
  new_state TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Security Definer Functions
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

-- Get user's division ID
CREATE OR REPLACE FUNCTION public.get_user_division_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT division_id FROM public.profiles WHERE id = _user_id
$$;

-- Check if user has permission for a menu action
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _menu_name TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.menus m ON p.menu_id = m.id
    JOIN public.user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND m.name = _menu_name
      AND p.action = _action
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  -- Default role: pegawai
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'pegawai');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_directorates_updated_at BEFORE UPDATE ON public.directorates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON public.divisions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Profiles: users can read all profiles (for lookups), update own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admin can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- User roles: only admin can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Directorates: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view directorates" ON public.directorates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage directorates" ON public.directorates FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Divisions: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view divisions" ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage divisions" ON public.divisions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Roles table: all can read, admin manages
CREATE POLICY "Authenticated can view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage roles table" ON public.roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Menus: all can read, admin manages
CREATE POLICY "Authenticated can view menus" ON public.menus FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage menus" ON public.menus FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Permissions: all can read, admin manages
CREATE POLICY "Authenticated can view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage permissions" ON public.permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Role permissions: all can read, admin manages
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage role_permissions" ON public.role_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Audit logs: admin can read, no one can modify directly
CREATE POLICY "Admin can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- Seed default menus
-- =============================================
INSERT INTO public.menus (name, label, icon, path, sort_order) VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', '/dashboard', 1),
  ('surat_masuk', 'Surat Masuk', 'Inbox', '/surat-masuk', 2),
  ('surat_keluar', 'Surat Keluar', 'Send', '/surat-keluar', 3),
  ('disposisi', 'Disposisi', 'ArrowRightLeft', '/disposisi', 4),
  ('template_surat', 'Template Surat', 'FileText', '/template-surat', 5),
  ('master_direktorat', 'Direktorat', 'Building2', '/master/direktorat', 6),
  ('master_divisi', 'Divisi', 'Users', '/master/divisi', 7),
  ('master_user', 'Pengguna', 'UserCog', '/master/user', 8),
  ('rbac', 'Role & Akses', 'Shield', '/rbac', 9),
  ('audit_log', 'Audit Trail', 'ScrollText', '/audit-log', 10);

-- Seed default roles
INSERT INTO public.roles (name, description) VALUES
  ('Super Admin', 'Akses penuh ke seluruh sistem'),
  ('Admin', 'Mengelola data master dan konfigurasi'),
  ('Direktur', 'Persetujuan dan disposisi tingkat direktorat'),
  ('General Manager', 'Mengelola surat dan disposisi divisi'),
  ('Pegawai', 'Membuat dan mengelola surat');

-- Seed permissions for all menus (all actions)
INSERT INTO public.permissions (menu_id, action)
SELECT m.id, a.action
FROM public.menus m
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete'), ('approve'), ('dispose')) AS a(action);

-- Give super_admin all permissions with 'all' scope
INSERT INTO public.role_permissions (role, permission_id, data_scope)
SELECT 'super_admin', p.id, 'all'
FROM public.permissions p;

-- Give pegawai read access to dashboard, surat_masuk, surat_keluar, disposisi
INSERT INTO public.role_permissions (role, permission_id, data_scope)
SELECT 'pegawai', p.id, 'own_division'
FROM public.permissions p
JOIN public.menus m ON p.menu_id = m.id
WHERE m.name IN ('dashboard', 'surat_masuk', 'surat_keluar', 'disposisi')
  AND p.action = 'read';
