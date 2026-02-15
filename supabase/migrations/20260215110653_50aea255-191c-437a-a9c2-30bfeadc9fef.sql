
-- Add UPDATE policy: only creator or admin can update
CREATE POLICY "Creator or admin can update dispositions"
ON public.dispositions
FOR UPDATE
TO authenticated
USING (from_user_id = auth.uid() OR is_admin(auth.uid()));

-- Add DELETE policy: only creator or admin can delete
CREATE POLICY "Creator or admin can delete dispositions"
ON public.dispositions
FOR DELETE
TO authenticated
USING (from_user_id = auth.uid() OR is_admin(auth.uid()));
