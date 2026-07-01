
-- Dedicated audit trigger that records BOTH old and new values for updates,
-- plus the parent aie_id so each entry is linked to its AIE.
create or replace function public.log_aie_lines_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aie_id uuid;
  v_diff jsonb;
begin
  if tg_op = 'DELETE' then
    v_aie_id := old.aie_id;
    v_diff := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'INSERT' then
    v_aie_id := new.aie_id;
    v_diff := jsonb_build_object('new', to_jsonb(new));
  else
    v_aie_id := new.aie_id;
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  insert into public.audit_log(actor, table_name, row_id, action, diff)
  values (
    auth.uid(),
    'aie_lines',
    coalesce(new.id::text, old.id::text),
    tg_op,
    v_diff || jsonb_build_object('aie_id', v_aie_id)
  );

  return coalesce(new, old);
end $$;

drop trigger if exists aie_lines_audit on public.aie_lines;
create trigger aie_lines_audit
after insert or update or delete on public.aie_lines
for each row execute function public.log_aie_lines_audit();
