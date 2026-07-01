
-- Replace workflow update policies to include an explicit WITH CHECK that permits the target status for each role.

DROP POLICY IF EXISTS "fi update flow" ON public.fund_inflows;
CREATE POLICY "fi update flow" ON public.fund_inflows
FOR UPDATE
USING (
  ((created_by = auth.uid()) AND (status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])) AND has_role(auth.uid(), 'BUDGET_CLK'::app_role))
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND (status = 'SUBMITTED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND (status = 'OFFICER_REVIEWED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()) AND (COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(),'BUDGET_CLK'::app_role) AND created_by = auth.uid() AND status = ANY (ARRAY['DRAFT'::txn_status,'SUBMITTED'::txn_status,'CANCELLED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status,'RETURNED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status,'RETURNED'::txn_status]))
);

DROP POLICY IF EXISTS "aie update" ON public.aie_records;
CREATE POLICY "aie update" ON public.aie_records
FOR UPDATE
USING (
  ((created_by = auth.uid()) AND (status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])) AND has_role(auth.uid(), 'BUDGET_CLK'::app_role))
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND (status = 'SUBMITTED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND (status = 'OFFICER_REVIEWED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()) AND (COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(),'BUDGET_CLK'::app_role) AND created_by = auth.uid() AND status = ANY (ARRAY['DRAFT'::txn_status,'SUBMITTED'::txn_status,'CANCELLED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status,'RETURNED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status,'RETURNED'::txn_status]))
);

DROP POLICY IF EXISTS "exp update" ON public.expenditures;
CREATE POLICY "exp update" ON public.expenditures
FOR UPDATE
USING (
  ((created_by = auth.uid()) AND (status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])) AND has_role(auth.uid(), 'BUDGET_CLK'::app_role))
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND (status = 'SUBMITTED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND (status = 'OFFICER_REVIEWED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()) AND (COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(),'BUDGET_CLK'::app_role) AND created_by = auth.uid() AND status = ANY (ARRAY['DRAFT'::txn_status,'SUBMITTED'::txn_status,'CANCELLED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status,'RETURNED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status,'RETURNED'::txn_status]))
);

DROP POLICY IF EXISTS "prop update" ON public.proposals;
CREATE POLICY "prop update" ON public.proposals
FOR UPDATE
USING (
  ((created_by = auth.uid()) AND (status = ANY (ARRAY['DRAFT'::txn_status, 'RETURNED'::txn_status])) AND has_role(auth.uid(), 'BUDGET_CLK'::app_role))
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND (status = 'SUBMITTED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND (status = 'OFFICER_REVIEWED'::txn_status) AND (created_by <> auth.uid()) AND (COALESCE(submitted_by, created_by) <> auth.uid()) AND (COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid()))
)
WITH CHECK (
  (has_role(auth.uid(),'BUDGET_CLK'::app_role) AND created_by = auth.uid() AND status = ANY (ARRAY['DRAFT'::txn_status,'SUBMITTED'::txn_status,'CANCELLED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status,'RETURNED'::txn_status]))
  OR (has_role(auth.uid(),'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status,'RETURNED'::txn_status]))
);
