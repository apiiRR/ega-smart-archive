
-- Track read state per (user, disposition)
CREATE TABLE IF NOT EXISTS public.disposition_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  disposition_id uuid NOT NULL REFERENCES public.dispositions(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, disposition_id)
);

ALTER TABLE public.disposition_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads select"
  ON public.disposition_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own reads insert"
  ON public.disposition_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own reads delete"
  ON public.disposition_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RPC: hitung disposisi yang relevan untuk user namun belum dibaca
CREATE OR REPLACE FUNCTION public.count_unread_dispositions(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.dispositions d
  WHERE d.from_user_id <> _user_id
    AND (
      d.to_user_id = _user_id
      OR d.to_division_id = public.get_user_division_id(_user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.disposition_reads r
      WHERE r.disposition_id = d.id AND r.user_id = _user_id
    );
$$;
