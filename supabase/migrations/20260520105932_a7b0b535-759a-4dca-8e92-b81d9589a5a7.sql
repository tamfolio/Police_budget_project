
alter view public.v_approval_sla set (security_invoker = true);

-- Pin search_path on the helper added in the previous migration.
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
