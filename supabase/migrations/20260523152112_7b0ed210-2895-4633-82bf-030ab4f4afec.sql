
-- 1. Restrict approval_delegations read to involved parties + privileged roles
DROP POLICY IF EXISTS "delegations read signed-in" ON public.approval_delegations;
CREATE POLICY "delegations read scoped" ON public.approval_delegations
FOR SELECT TO authenticated
USING (
  delegator = auth.uid()
  OR delegate = auth.uid()
  OR has_role(auth.uid(), 'SYSADMIN'::app_role)
  OR has_role(auth.uid(), 'BUDGET_DIR'::app_role)
);

-- 2. Restrict notifications insert: recipient must be self, OR actor must hold a privileged role
DROP POLICY IF EXISTS "notif insert signed-in" ON public.notifications;
CREATE POLICY "notif insert scoped" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (actor = auth.uid() OR actor IS NULL)
  AND (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'SYSADMIN'::app_role)
    OR has_role(auth.uid(), 'BUDGET_CLK'::app_role)
    OR has_role(auth.uid(), 'BUDGET_OFF'::app_role)
    OR has_role(auth.uid(), 'BUDGET_DIR'::app_role)
  )
);

-- 3. Lock down audit_log against direct writes by users (only triggers/definer functions write)
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM anon, authenticated;
CREATE POLICY "audit_log deny direct writes" ON public.audit_log
AS RESTRICTIVE FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- 4. Enforce export_audit_log.user_email = real email of inserter
CREATE OR REPLACE FUNCTION public.enforce_export_audit_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  NEW.user_id := auth.uid();
  NEW.user_email := v_email;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_enforce_export_audit_email ON public.export_audit_log;
CREATE TRIGGER trg_enforce_export_audit_email
BEFORE INSERT ON public.export_audit_log
FOR EACH ROW EXECUTE FUNCTION public.enforce_export_audit_email();

-- 5. Ensure touch_updated_at has a fixed search_path (the only function missing it)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN new.updated_at = now(); RETURN new; END $$;
