CREATE OR REPLACE FUNCTION public.get_surat_internal_read_status(_surat_id uuid)
RETURNS TABLE(
  division_id uuid,
  division_name text,
  recipient_type text,
  total_users int,
  read_users int,
  first_read_at timestamptz,
  last_read_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _surat RECORD;
BEGIN
  SELECT * INTO _surat FROM public.surat_internal WHERE id = _surat_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF _surat.created_by <> auth.uid() AND NOT is_admin(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH recipients AS (
    SELECT (jsonb_array_elements_text(_surat.tujuan))::uuid AS div_id, 'tujuan'::text AS rtype
    UNION ALL
    SELECT (jsonb_array_elements_text(_surat.tebusan))::uuid AS div_id, 'tebusan'::text AS rtype
  ),
  div_users AS (
    SELECT r.div_id, r.rtype, p.id AS uid
    FROM recipients r
    LEFT JOIN public.profiles p ON p.division_id = r.div_id
  ),
  reads AS (
    SELECT du.div_id, du.rtype, du.uid, lr.read_at
    FROM div_users du
    LEFT JOIN public.letter_reads lr
      ON lr.surat_internal_id = _surat_id
     AND lr.user_id = du.uid
     AND lr.read_type = CASE WHEN du.rtype = 'tujuan' THEN 'inbox' ELSE 'tebusan' END
  )
  SELECT
    rd.div_id,
    d.name,
    rd.rtype,
    COALESCE(SUM(CASE WHEN rd.uid IS NOT NULL THEN 1 ELSE 0 END), 0)::int,
    COALESCE(SUM(CASE WHEN rd.read_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int,
    MIN(rd.read_at),
    MAX(rd.read_at)
  FROM reads rd
  LEFT JOIN public.divisions d ON d.id = rd.div_id
  GROUP BY rd.div_id, d.name, rd.rtype
  ORDER BY rd.rtype, d.name;
END;
$$;