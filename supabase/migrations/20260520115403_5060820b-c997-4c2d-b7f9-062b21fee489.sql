
-- 1. signature_url on profiles
alter table public.profiles add column if not exists signature_url text;

-- 2. signatures bucket
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

-- Storage policies
do $$ begin
  create policy "signatures public read" on storage.objects
    for select using (bucket_id = 'signatures');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signatures self write" on storage.objects
    for insert with check (
      bucket_id = 'signatures'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signatures self update" on storage.objects
    for update using (
      bucket_id = 'signatures'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "signatures self delete" on storage.objects
    for delete using (
      bucket_id = 'signatures'
      and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(), 'SYSADMIN'::app_role))
    );
exception when duplicate_object then null; end $$;

-- 3. FY-closed guard
create or replace function public.assert_fy_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fy integer;
  v_status text;
begin
  if public.has_role(auth.uid(), 'SYSADMIN'::app_role) then
    return coalesce(new, old);
  end if;
  v_fy := coalesce(new.fiscal_year, old.fiscal_year);
  if v_fy is null then return coalesce(new, old); end if;
  select status into v_status from public.fiscal_years where year = v_fy;
  if v_status = 'CLOSED' then
    raise exception 'Fiscal year % is closed (read-only). Contact a system administrator to reopen.', v_fy
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['aie_records','fund_inflows','expenditures','distribution_batches','carry_over_periods','proposals']
  loop
    execute format('drop trigger if exists trg_assert_fy_open on public.%I', t);
    execute format('create trigger trg_assert_fy_open before insert or update or delete on public.%I for each row execute function public.assert_fy_open()', t);
  end loop;
end $$;
