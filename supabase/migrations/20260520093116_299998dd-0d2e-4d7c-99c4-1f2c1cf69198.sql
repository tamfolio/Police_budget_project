
create table public.carry_over_periods (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null,
  period_month integer not null check (period_month between 1 and 12),
  opening_balance numeric not null default 0,
  total_inflows numeric not null default 0,
  total_expended numeric not null default 0,
  residual numeric not null default 0,
  percent_utilized numeric not null default 0,
  notes text,
  status txn_status not null default 'DRAFT',
  return_remarks text,
  created_by uuid not null default auth.uid(),
  submitted_by uuid,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fiscal_year, period_month)
);

alter table public.carry_over_periods enable row level security;

create policy "cop read" on public.carry_over_periods for select using (auth.uid() is not null);
create policy "cop insert" on public.carry_over_periods for insert with check (has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "cop update" on public.carry_over_periods for update using (
  ((created_by = auth.uid()) and (status = any(array['DRAFT'::txn_status,'RETURNED'::txn_status])) and has_role(auth.uid(),'BUDGET_CLK'))
  or (has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by, created_by) <> auth.uid())
  or (has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by, created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
) with check (
  (has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid() and status = any(array['DRAFT'::txn_status,'SUBMITTED'::txn_status,'CANCELLED'::txn_status]))
  or (has_role(auth.uid(),'BUDGET_OFF') and status = any(array['OFFICER_REVIEWED'::txn_status,'RETURNED'::txn_status]))
  or (has_role(auth.uid(),'BUDGET_DIR') and status = any(array['APPROVED'::txn_status,'RETURNED'::txn_status]))
);
create policy "cop delete own draft" on public.carry_over_periods for delete using (created_by = auth.uid() and status = 'DRAFT');
create policy "cop delete sysadmin" on public.carry_over_periods for delete using (has_role(auth.uid(),'SYSADMIN'));

create trigger trg_cop_touch before update on public.carry_over_periods
  for each row execute function public.touch_updated_at();
create trigger trg_cop_audit after insert or update or delete on public.carry_over_periods
  for each row execute function public.log_audit();

create table public.carry_over_lines (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.carry_over_periods(id) on delete cascade,
  sub_item_code text not null,
  opening_balance numeric not null default 0,
  inflows numeric not null default 0,
  expended numeric not null default 0,
  residual numeric not null default 0,
  percent_utilized numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.carry_over_lines enable row level security;

create policy "col read" on public.carry_over_lines for select using (auth.uid() is not null);
create policy "col write via parent" on public.carry_over_lines for all using (
  exists (select 1 from public.carry_over_periods p
    where p.id = carry_over_lines.period_id
      and ((p.created_by = auth.uid() and p.status = any(array['DRAFT'::txn_status,'RETURNED'::txn_status])) or has_role(auth.uid(),'SYSADMIN')))
) with check (
  exists (select 1 from public.carry_over_periods p
    where p.id = carry_over_lines.period_id and p.created_by = auth.uid() and p.status = any(array['DRAFT'::txn_status,'RETURNED'::txn_status]))
);
create policy "col delete sysadmin" on public.carry_over_lines for delete using (has_role(auth.uid(),'SYSADMIN'));

create index idx_col_period on public.carry_over_lines(period_id);
create index idx_cop_year_month on public.carry_over_periods(fiscal_year, period_month);
