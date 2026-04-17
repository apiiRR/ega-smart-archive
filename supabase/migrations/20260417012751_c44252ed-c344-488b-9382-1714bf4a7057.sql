CREATE OR REPLACE FUNCTION public.get_disposition_letter_details(_disposition_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _disp RECORD;
  _result jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO _disp FROM public.dispositions WHERE id = _disposition_id;
  IF NOT FOUND THEN RETURN _result; END IF;

  IF _disp.from_user_id != auth.uid()
    AND (_disp.to_user_id IS NULL OR _disp.to_user_id != auth.uid())
    AND NOT is_admin(auth.uid())
    AND _disp.to_division_id != get_user_division_id(auth.uid())
  THEN
    RETURN _result;
  END IF;

  IF _disp.surat_masuk_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'surat_masuk', 'id', sm.id, 'nama_surat', sm.nama_surat,
      'nomor_surat', sm.nomor_surat, 'asal_surat', sm.asal_surat,
      'catatan', sm.catatan, 'file_url', sm.file_url, 'created_at', sm.created_at,
      'created_by', sm.created_by, 'creator_division_id', get_user_division_id(sm.created_by)
    ) INTO _result FROM public.surat_masuk sm WHERE sm.id = _disp.surat_masuk_id;
  ELSIF _disp.surat_keluar_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'surat_keluar', 'id', sk.id, 'nama_surat', sk.nama_surat,
      'nomor_surat', sk.nomor_surat, 'perihal', sk.perihal, 'tujuan', sk.tujuan,
      'file_url', sk.file_url, 'created_at', sk.created_at,
      'created_by', sk.created_by, 'creator_division_id', get_user_division_id(sk.created_by)
    ) INTO _result FROM public.surat_keluar sk WHERE sk.id = _disp.surat_keluar_id;
  ELSIF _disp.surat_internal_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'surat_internal', 'id', si.id, 'nama_surat', si.nama_surat,
      'nomor_surat', si.nomor_surat, 'perihal', si.perihal,
      'file_url', si.file_url, 'created_at', si.created_at,
      'created_by', si.created_by, 'creator_division_id', get_user_division_id(si.created_by)
    ) INTO _result FROM public.surat_internal si WHERE si.id = _disp.surat_internal_id;
  END IF;

  RETURN COALESCE(_result, '{}'::jsonb);
END;
$$;