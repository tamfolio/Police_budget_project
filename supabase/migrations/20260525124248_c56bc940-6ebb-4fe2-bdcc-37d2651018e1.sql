
-- Allow BUDGET_CLK to edit their own records regardless of status (override).
-- Other role branches (BUDGET_OFF review, BUDGET_DIR approve) remain unchanged.

-- AIE Records
DROP POLICY IF EXISTS "aie update" ON public.aie_records;
CREATE POLICY "aie update" ON public.aie_records FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- AIE Lines: allow clerk owner to edit lines regardless of parent status
DROP POLICY IF EXISTS "aiel write via parent" ON public.aie_lines;
CREATE POLICY "aiel write via parent" ON public.aie_lines FOR ALL
USING (EXISTS (
  SELECT 1 FROM aie_records a
  WHERE a.id = aie_lines.aie_id
    AND ((a.created_by = auth.uid() AND has_role(auth.uid(),'BUDGET_CLK'::app_role)) OR has_role(auth.uid(),'SYSADMIN'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM aie_records a
  WHERE a.id = aie_lines.aie_id
    AND a.created_by = auth.uid()
    AND has_role(auth.uid(),'BUDGET_CLK'::app_role)
));

-- Fund Inflows
DROP POLICY IF EXISTS "fi update flow" ON public.fund_inflows;
CREATE POLICY "fi update flow" ON public.fund_inflows FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Distribution Batches
DROP POLICY IF EXISTS "dist update" ON public.distribution_batches;
CREATE POLICY "dist update" ON public.distribution_batches FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);

DROP POLICY IF EXISTS "distl write via batch" ON public.distribution_lines;
CREATE POLICY "distl write via batch" ON public.distribution_lines FOR ALL
USING (EXISTS (
  SELECT 1 FROM distribution_batches b
  WHERE b.id = distribution_lines.batch_id
    AND ((b.created_by = auth.uid() AND has_role(auth.uid(),'BUDGET_CLK'::app_role)) OR has_role(auth.uid(),'SYSADMIN'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM distribution_batches b
  WHERE b.id = distribution_lines.batch_id
    AND b.created_by = auth.uid()
    AND has_role(auth.uid(),'BUDGET_CLK'::app_role)
));

-- Expenditures
DROP POLICY IF EXISTS "exp update" ON public.expenditures;
CREATE POLICY "exp update" ON public.expenditures FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Proposals
DROP POLICY IF EXISTS "prop update" ON public.proposals;
CREATE POLICY "prop update" ON public.proposals FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Carry-over Periods
DROP POLICY IF EXISTS "cop update" ON public.carry_over_periods;
CREATE POLICY "cop update" ON public.carry_over_periods FOR UPDATE
USING (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = 'SUBMITTED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = 'OFFICER_REVIEWED'::txn_status AND created_by <> auth.uid() AND COALESCE(submitted_by, created_by) <> auth.uid() AND COALESCE(reviewed_by, '00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND created_by = auth.uid())
  OR (has_role(auth.uid(), 'BUDGET_OFF'::app_role) AND status = ANY (ARRAY['OFFICER_REVIEWED'::txn_status, 'RETURNED'::txn_status]))
  OR (has_role(auth.uid(), 'BUDGET_DIR'::app_role) AND status = ANY (ARRAY['APPROVED'::txn_status, 'RETURNED'::txn_status]))
);

-- Carry-over Lines
DROP POLICY IF EXISTS "col write via parent" ON public.carry_over_lines;
CREATE POLICY "col write via parent" ON public.carry_over_lines FOR ALL
USING (EXISTS (
  SELECT 1 FROM carry_over_periods p
  WHERE p.id = carry_over_lines.period_id
    AND ((p.created_by = auth.uid() AND has_role(auth.uid(),'BUDGET_CLK'::app_role)) OR has_role(auth.uid(),'SYSADMIN'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM carry_over_periods p
  WHERE p.id = carry_over_lines.period_id
    AND p.created_by = auth.uid()
    AND has_role(auth.uid(),'BUDGET_CLK'::app_role)
));
