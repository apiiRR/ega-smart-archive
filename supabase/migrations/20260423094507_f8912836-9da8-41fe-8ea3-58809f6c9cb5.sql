
CREATE TABLE IF NOT EXISTS public.letter_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  surat_internal_id uuid REFERENCES public.surat_internal(id) ON DELETE CASCADE,
  read_type text NOT NULL CHECK (read_type IN ('inbox','tebusan')),
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, surat_internal_id, read_type)
);

ALTER TABLE public.letter_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own letter reads select"
  ON public.letter_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users manage own letter reads insert"
  ON public.letter_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own letter reads delete"
  ON public.letter_reads FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_letter_reads_user ON public.letter_reads(user_id, read_type);
