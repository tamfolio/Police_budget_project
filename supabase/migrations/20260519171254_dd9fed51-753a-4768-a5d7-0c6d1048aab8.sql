ALTER TABLE public.expenditures DROP COLUMN IF EXISTS line_item_code;
DROP TABLE IF EXISTS public.budget_line_items;