
create table if not exists public.budget_line_items (
  code text primary key,
  sub_item_code text not null,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_bli_sub_item on public.budget_line_items(sub_item_code);

alter table public.budget_line_items enable row level security;

create policy "bli read" on public.budget_line_items
  for select using (auth.uid() is not null);

create policy "bli sysadmin manage" on public.budget_line_items
  for all using (has_role(auth.uid(), 'SYSADMIN'::app_role))
  with check (has_role(auth.uid(), 'SYSADMIN'::app_role));

alter table public.expenditures
  add column if not exists line_item_code text;
