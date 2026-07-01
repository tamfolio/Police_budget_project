-- Allow any Budget Clerk to edit (update) any record, not just their own
-- AIE Records
DROP POLICY IF EXISTS "aie update" ON public.aie_records;
CREATE POLICY "aie update" ON public.aie_records FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- AIE Lines (child)
DROP POLICY IF EXISTS "aiel write via parent" ON public.aie_lines;
CREATE POLICY "aiel write via parent" ON public.aie_lines FOR ALL
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR has_role(auth.uid(), 'SYSADMIN'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
);

-- Fund Inflows
DROP POLICY IF EXISTS "fi update flow" ON public.fund_inflows;
CREATE POLICY "fi update flow" ON public.fund_inflows FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Distribution Batches
DROP POLICY IF EXISTS "dist update" ON public.distribution_batches;
CREATE POLICY "dist update" ON public.distribution_batches FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);

-- Distribution Lines (child)
DROP POLICY IF EXISTS "distl write via batch" ON public.distribution_lines;
CREATE POLICY "distl write via batch" ON public.distribution_lines FOR ALL
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR has_role(auth.uid(), 'SYSADMIN'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
);

-- Expenditures
DROP POLICY IF EXISTS "exp update" ON public.expenditures;
CREATE POLICY "exp update" ON public.expenditures FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Proposals
DROP POLICY IF EXISTS "prop update" ON public.proposals;
CREATE POLICY "prop update" ON public.proposals FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Carry Over Periods
DROP POLICY IF EXISTS "cop update" ON public.carry_over_periods;
CREATE POLICY "cop update" ON public.carry_over_periods FOR UPDATE
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Carry Over Lines (child)
DROP POLICY IF EXISTS "col write via parent" ON public.carry_over_lines;
CREATE POLICY "col write via parent" ON public.carry_over_lines FOR ALL
USING (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
  OR has_role(auth.uid(), 'SYSADMIN'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'BUDGET_CLK'::app_role)
);