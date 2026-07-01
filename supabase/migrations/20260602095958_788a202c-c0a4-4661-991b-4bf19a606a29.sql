UPDATE public.aie_records SET status = 'APPROVED'::txn_status WHERE status = 'DRAFT'::txn_status;
ALTER TABLE public.aie_records ALTER COLUMN status SET DEFAULT 'APPROVED'::txn_status;