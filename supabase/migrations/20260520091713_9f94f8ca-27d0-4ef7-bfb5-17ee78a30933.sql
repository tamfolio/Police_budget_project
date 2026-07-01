
-- Allow SYSADMIN to delete any fund inflow, AIE record, or distribution batch.
-- Child line tables (aie_lines, distribution_lines) already allow SYSADMIN
-- through their existing "via parent" ALL policy.

CREATE POLICY "fi delete sysadmin"
ON public.fund_inflows
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));

CREATE POLICY "aie delete sysadmin"
ON public.aie_records
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));

CREATE POLICY "dist delete sysadmin"
ON public.distribution_batches
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));

-- Make sure SYSADMIN can also clean up child lines directly if a parent is gone
CREATE POLICY "aiel delete sysadmin"
ON public.aie_lines
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));

CREATE POLICY "distl delete sysadmin"
ON public.distribution_lines
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));

-- Allow SYSADMIN to delete profile rows (used when admin deletes a user)
CREATE POLICY "profiles sysadmin delete"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'SYSADMIN'));
