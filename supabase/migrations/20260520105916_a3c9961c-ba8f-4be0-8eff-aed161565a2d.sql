
-- ============ txn_comments ============
create table public.txn_comments (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('aie_records','fund_inflows','distribution_batches','expenditures','proposals','carry_over_periods')),
  record_id uuid not null,
  author uuid not null default auth.uid(),
  body text not null check (length(btrim(body)) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index txn_comments_record_idx on public.txn_comments(record_type, record_id, created_at desc);
alter table public.txn_comments enable row level security;

create policy "comments read signed-in"
  on public.txn_comments for select
  using (auth.uid() is not null);

create policy "comments insert self"
  on public.txn_comments for insert
  with check (author = auth.uid());

create policy "comments sysadmin delete"
  on public.txn_comments for delete
  using (has_role(auth.uid(), 'SYSADMIN'::app_role));

-- ============ approval_delegations ============
create table public.approval_delegations (
  id uuid primary key default gen_random_uuid(),
  delegator uuid not null default auth.uid(),
  delegate uuid not null,
  role app_role not null,
  starts_on date not null,
  ends_on date not null,
  reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (ends_on >= starts_on),
  check (delegator <> delegate)
);
create index approval_delegations_delegate_idx on public.approval_delegations(delegate, role) where revoked_at is null;
alter table public.approval_delegations enable row level security;

create policy "delegations read signed-in"
  on public.approval_delegations for select
  using (auth.uid() is not null);

create policy "delegations director insert own"
  on public.approval_delegations for insert
  with check (
    delegator = auth.uid()
    and (has_role(auth.uid(), 'BUDGET_DIR'::app_role) or has_role(auth.uid(), 'SYSADMIN'::app_role))
  );

create policy "delegations director update own"
  on public.approval_delegations for update
  using (delegator = auth.uid() or has_role(auth.uid(), 'SYSADMIN'::app_role));

create policy "delegations sysadmin delete"
  on public.approval_delegations for delete
  using (has_role(auth.uid(), 'SYSADMIN'::app_role));

-- ============ delegated_has_role helper ============
create or replace function public.delegated_has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.has_role(_user_id, _role)
    or exists (
      select 1 from public.approval_delegations d
      where d.delegate = _user_id
        and d.role = _role
        and d.revoked_at is null
        and current_date between d.starts_on and d.ends_on
    )
$$;

-- ============ v_approval_sla ============
create or replace view public.v_approval_sla as
with t as (
  select 'aie_records'::text as record_type, id, status, submitted_at, reviewed_at, approved_at, submitted_by, reviewed_by, approved_by, created_at, fiscal_year
    from public.aie_records
  union all
  select 'fund_inflows', id, status, submitted_at, reviewed_at, approved_at, submitted_by, reviewed_by, approved_by, created_at, fiscal_year
    from public.fund_inflows
  union all
  select 'distribution_batches', id, status, submitted_at, reviewed_at, approved_at, submitted_by, reviewed_by, approved_by, created_at, fiscal_year
    from public.distribution_batches
  union all
  select 'expenditures', id, status, submitted_at, reviewed_at, approved_at, submitted_by, reviewed_by, approved_by, created_at, fiscal_year
    from public.expenditures
)
select
  record_type,
  id,
  status::text as status,
  fiscal_year,
  submitted_by, reviewed_by, approved_by,
  submitted_at, reviewed_at, approved_at,
  case when reviewed_at is not null and submitted_at is not null
       then extract(epoch from (reviewed_at - submitted_at)) / 3600.0 end as hours_to_review,
  case when approved_at is not null and reviewed_at is not null
       then extract(epoch from (approved_at - reviewed_at)) / 3600.0 end as hours_to_approve,
  case when status::text = 'SUBMITTED' and submitted_at is not null
       then extract(epoch from (now() - submitted_at)) / 3600.0
       when status::text = 'OFFICER_REVIEWED' and reviewed_at is not null
       then extract(epoch from (now() - reviewed_at)) / 3600.0 end as hours_pending,
  created_at
from t;

grant select on public.v_approval_sla to authenticated;

-- ============ audit-log: capture {old,new} on UPDATE for diff view ============
create or replace function public.log_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_diff jsonb;
begin
  if tg_op = 'INSERT' then
    v_diff := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_diff := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.audit_log(actor, table_name, row_id, action, diff)
  values (auth.uid(), tg_table_name, coalesce(new.id::text, old.id::text), tg_op, v_diff);

  return coalesce(new, old);
end $$;
