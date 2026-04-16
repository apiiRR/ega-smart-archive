
-- Fix surat_masuk: only creator's division + admin
DROP POLICY IF EXISTS "Users can view surat_masuk by scope" ON public.surat_masuk;
CREATE POLICY "Users can view surat_masuk by scope" ON public.surat_masuk
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid())
  );

-- Fix surat_keluar: only creator's division + admin
DROP POLICY IF EXISTS "Users can view surat_keluar by scope" ON public.surat_keluar;
CREATE POLICY "Users can view surat_keluar by scope" ON public.surat_keluar
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid())
  );

-- Fix surat_internal: only creator's division + admin (remove tujuan/tebusan containment)
DROP POLICY IF EXISTS "Users can view surat_internal by scope" ON public.surat_internal;
CREATE POLICY "Users can view surat_internal by scope" ON public.surat_internal
  FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR created_by = auth.uid()
    OR get_user_division_id(created_by) = get_user_division_id(auth.uid())
  );
