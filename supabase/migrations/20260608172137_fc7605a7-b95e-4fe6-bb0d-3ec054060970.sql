
ALTER TABLE public.approval_actions
  DROP CONSTRAINT IF EXISTS approval_actions_action_check;
ALTER TABLE public.approval_actions
  ADD CONSTRAINT approval_actions_action_check
  CHECK (action IN ('SUBMIT','OFFICER_REVIEW','REVIEW','APPROVE','RETURN','CANCEL'));

DROP POLICY IF EXISTS "approvals insert self" ON public.approval_actions;
CREATE POLICY "approvals insert workflow roles"
  ON public.approval_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor = auth.uid()
    AND (
      public.has_role(auth.uid(), 'SYSADMIN'::app_role)
      OR public.has_role(auth.uid(), 'BUDGET_DIR'::app_role)
      OR public.has_role(auth.uid(), 'BUDGET_OFF'::app_role)
      OR public.has_role(auth.uid(), 'BUDGET_CLK'::app_role)
    )
  );

DROP POLICY IF EXISTS "notif insert scoped" ON public.notifications;
CREATE POLICY "notif insert self or sysadmin"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND ((actor = auth.uid()) OR (actor IS NULL))
    AND (
      user_id = auth.uid()
      OR public.has_role(auth.uid(), 'SYSADMIN'::app_role)
    )
  );

DROP POLICY IF EXISTS "bms docs update own" ON storage.objects;
CREATE POLICY "bms docs update own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bms-documents' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'bms-documents' AND owner = auth.uid());
