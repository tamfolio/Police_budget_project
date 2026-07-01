-- AIE
DROP POLICY IF EXISTS "aie delete own draft" ON public.aie_records;
CREATE POLICY "aie delete own draft" ON public.aie_records FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);

-- Fund Inflows
DROP POLICY IF EXISTS "fi delete own draft" ON public.fund_inflows;
CREATE POLICY "fi delete own draft" ON public.fund_inflows FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);

-- Distribution Batches
DROP POLICY IF EXISTS "dist delete own draft" ON public.distribution_batches;
CREATE POLICY "dist delete own draft" ON public.distribution_batches FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);

-- Expenditures
DROP POLICY IF EXISTS "exp delete own draft" ON public.expenditures;
CREATE POLICY "exp delete own draft" ON public.expenditures FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);

-- Proposals
DROP POLICY IF EXISTS "prop delete own draft" ON public.proposals;
CREATE POLICY "prop delete own draft" ON public.proposals FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);

-- Carry Over Periods
DROP POLICY IF EXISTS "cop delete own draft" ON public.carry_over_periods;
CREATE POLICY "cop delete own draft" ON public.carry_over_periods FOR DELETE
USING (has_role(auth.uid(), 'BUDGET_CLK'::app_role) AND status = 'DRAFT'::txn_status);