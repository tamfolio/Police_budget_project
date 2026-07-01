create table public.export_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  user_email text,
  exported_at timestamptz not null default now(),
  report_type text not null,
  format text not null check (format in ('PDF','CSV')),
  fiscal_year integer not null,
  mismatch_count integer not null default 0,
  tolerance_kobo integer not null default 0,
  forced boolean not null default false
);

create index export_audit_log_exported_at_idx on public.export_audit_log (exported_at desc);
create index export_audit_log_user_idx on public.export_audit_log (user_id);

alter table public.export_audit_log enable row level security;

create policy "export_audit insert self"
  on public.export_audit_log
  for insert
  with check (user_id = auth.uid());

create policy "export_audit read auditor+sysadmin+director"
  on public.export_audit_log
  for select
  using (
    has_role(auth.uid(), 'AUDITOR'::app_role)
    or has_role(auth.uid(), 'SYSADMIN'::app_role)
    or has_role(auth.uid(), 'BUDGET_DIR'::app_role)
  );

create policy "export_audit read own"
  on public.export_audit_log
  for select
  using (user_id = auth.uid());