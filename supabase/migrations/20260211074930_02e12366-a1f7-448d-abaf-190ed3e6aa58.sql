
-- Fix: restrict audit_logs INSERT to only allow via security definer function
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a security definer function to log audit entries
CREATE OR REPLACE FUNCTION public.log_audit(
  _action TEXT,
  _module TEXT,
  _target_table TEXT DEFAULT NULL,
  _target_id UUID DEFAULT NULL,
  _old_state TEXT DEFAULT NULL,
  _new_state TEXT DEFAULT NULL,
  _details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, module, target_table, target_id, old_state, new_state, details)
  VALUES (auth.uid(), _action, _module, _target_table, _target_id, _old_state, _new_state, _details);
END;
$$;
