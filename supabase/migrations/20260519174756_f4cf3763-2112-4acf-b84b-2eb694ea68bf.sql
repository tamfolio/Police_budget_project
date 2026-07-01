
-- Allow AIE records to use line items instead of a single sub_item_code
ALTER TABLE public.aie_records ALTER COLUMN sub_item_code DROP NOT NULL;

-- Line items for an AIE record
CREATE TABLE public.aie_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aie_id uuid NOT NULL REFERENCES public.aie_records(id) ON DELETE CASCADE,
  sub_item_code text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aie_lines_aie_id ON public.aie_lines(aie_id);

ALTER TABLE public.aie_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aiel read"
ON public.aie_lines FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "aiel write via parent"
ON public.aie_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.aie_records a
    WHERE a.id = aie_lines.aie_id
      AND (
        (a.created_by = auth.uid() AND a.status IN ('DRAFT','RETURNED'))
        OR public.has_role(auth.uid(), 'SYSADMIN')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.aie_records a
    WHERE a.id = aie_lines.aie_id
      AND a.created_by = auth.uid()
      AND a.status IN ('DRAFT','RETURNED')
  )
);
