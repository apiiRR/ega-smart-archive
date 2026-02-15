
-- Update surat_masuk SELECT policy: admin sees all, others see own division's letters or letters disposed to their division
DROP POLICY IF EXISTS "Authenticated can view surat_masuk" ON public.surat_masuk;

CREATE POLICY "Users can view surat_masuk by scope"
ON public.surat_masuk
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    -- created by someone in same division
    get_user_division_id(created_by) = get_user_division_id(auth.uid())
  )
  OR (
    -- has disposition to user's division
    EXISTS (
      SELECT 1 FROM public.dispositions d
      WHERE d.surat_masuk_id = surat_masuk.id
        AND d.to_division_id = get_user_division_id(auth.uid())
    )
  )
);

-- Update surat_keluar SELECT policy
DROP POLICY IF EXISTS "Authenticated can view surat_keluar" ON public.surat_keluar;

CREATE POLICY "Users can view surat_keluar by scope"
ON public.surat_keluar
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    get_user_division_id(created_by) = get_user_division_id(auth.uid())
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.dispositions d
      WHERE d.surat_keluar_id = surat_keluar.id
        AND d.to_division_id = get_user_division_id(auth.uid())
    )
  )
);
