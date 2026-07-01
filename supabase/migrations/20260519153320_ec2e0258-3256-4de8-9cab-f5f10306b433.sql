
-- =========================================================
-- ROLES
-- =========================================================
create type public.app_role as enum ('SYSADMIN','BUDGET_DIR','BUDGET_OFF','BUDGET_CLK','AUDITOR','REPORT_VIEWER');

create type public.txn_status as enum ('DRAFT','SUBMITTED','OFFICER_REVIEWED','APPROVED','RETURNED','CANCELLED');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references auth.users(id),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role and confirmed_at is not null)
$$;

create or replace function public.current_user_roles()
returns setof public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid() and confirmed_at is not null
$$;

-- Bootstrap: first ever sign-in becomes SYSADMIN. Idempotent.
create or replace function public.bootstrap_profile()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count int;
begin
  if v_uid is null then return; end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.profiles (user_id, email)
    values (v_uid, v_email)
    on conflict (user_id) do update set email = excluded.email;
  select count(*) into v_count from public.user_roles;
  if v_count = 0 then
    insert into public.user_roles (user_id, role, assigned_by, confirmed_by, confirmed_at)
      values (v_uid, 'SYSADMIN', v_uid, v_uid, now())
      on conflict do nothing;
  end if;
end $$;

-- profiles policies
create policy "profiles self read" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles all signed-in read" on public.profiles for select using (auth.uid() is not null);
create policy "profiles self update" on public.profiles for update using (auth.uid() = user_id);
create policy "profiles sysadmin manage" on public.profiles for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

-- user_roles policies
create policy "roles read signed-in" on public.user_roles for select using (auth.uid() is not null);
create policy "roles sysadmin insert" on public.user_roles for insert with check (public.has_role(auth.uid(),'SYSADMIN'));
create policy "roles sysadmin update" on public.user_roles for update using (public.has_role(auth.uid(),'SYSADMIN'));
create policy "roles sysadmin delete" on public.user_roles for delete using (public.has_role(auth.uid(),'SYSADMIN'));

-- =========================================================
-- REFERENCE: categories, sub-items, formations, fiscal years, settings
-- =========================================================
create table public.budget_categories (
  code text primary key,
  name text not null,
  sort int not null default 0
);
alter table public.budget_categories enable row level security;
create policy "cats read" on public.budget_categories for select using (auth.uid() is not null);
create policy "cats sysadmin manage" on public.budget_categories for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

create table public.budget_sub_items (
  code text primary key,
  category_code text not null references public.budget_categories(code),
  name text not null,
  sort int not null default 0
);
alter table public.budget_sub_items enable row level security;
create policy "subs read" on public.budget_sub_items for select using (auth.uid() is not null);
create policy "subs sysadmin manage" on public.budget_sub_items for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

create table public.fiscal_years (
  year int primary key,
  appropriation_act_amount numeric(18,2) not null default 0,
  revised_amount numeric(18,2) not null default 0,
  status text not null default 'OPEN'
);
alter table public.fiscal_years enable row level security;
create policy "fy read" on public.fiscal_years for select using (auth.uid() is not null);
create policy "fy sysadmin manage" on public.fiscal_years for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

create table public.formations (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  name text not null,
  type text not null default 'STATE_COMMAND',
  created_at timestamptz not null default now()
);
alter table public.formations enable row level security;
create policy "form read" on public.formations for select using (auth.uid() is not null);
create policy "form sysadmin manage" on public.formations for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "settings read" on public.app_settings for select using (auth.uid() is not null);
create policy "settings sysadmin write" on public.app_settings for all using (public.has_role(auth.uid(),'SYSADMIN')) with check (public.has_role(auth.uid(),'SYSADMIN'));

insert into public.app_settings(key,value) values
  ('aie_expiry_days','90'::jsonb),
  ('current_fiscal_year','2026'::jsonb);

-- Seed categories
insert into public.budget_categories(code,name,sort) values
 ('220201','Travels and Transport – General',1),
 ('220202','Utilities – General',2),
 ('220203','Materials and Supplies – General',3),
 ('220204','Maintenance Services – General',4),
 ('220205','Training – General',5),
 ('220206','Other Services – General',6),
 ('220207','Consulting and Professional Services – General',7),
 ('220208','Fuel and Lubricants – General',8),
 ('220209','Financial Charges – General',9),
 ('220210','Miscellaneous',10),
 ('220402','Foreign Grants and Contributions',11);

-- Seed sub-items
insert into public.budget_sub_items(code,category_code,name,sort) values
('22020101','220201','Local Travels and Transport – Training',1),
('22020102','220201','Local Travels and Transport – Others',2),
('22020103','220201','International Travels and Transport – Training',3),
('22020104','220201','International Travels and Transport – Others',4),
('22020201','220202','Electricity Charges',1),
('22020202','220202','Telephone Charges',2),
('22020203','220202','Internet Access Charges',3),
('22020204','220202','Satellite Broadcasting Access Charges',4),
('22020205','220202','Water Rates',5),
('22020206','220202','Sewerage Charges',6),
('22020207','220202','Leased Communication Line(s)',7),
('22020301(a)','220203','Stationery – Commands and Formations',1),
('22020301(b)','220203','Office and General',2),
('22020301(c)','220203','Foreign Peacekeeping Office',3),
('22020301(d)','220203','Force Computer Material and Supplies – DICT FHQ',4),
('22020301(e)','220203','Computer Material and Supplies – PAB',5),
('22020301(f)','220203','Computer Material and Supplies – PCIT',6),
('22020301(g)','220203','Central Motor Registry (CMR)',7),
('22020301(h)','220203','Audit Queries',8),
('22020301(i)','220203','Budget and Tenders Board Supplies',9),
('22020302(a)','220203','Books',10),
('22020302(b)','220203','Library Services – Police Staff College Jos',11),
('22020302(c)','220203','Library Services – Police Academy Kano',12),
('22020302(d)','220203','Library Services – IGP''s Office',13),
('22020302(e)','220203','Library Services – Police Colleges and PDCE',14),
('22020302(f)','220203','Development of Libraries',15),
('22020302(g)','220203','Library Services – Force PRO',16),
('22020302(h)','220203','Library Services – Forensic Science',17),
('22020302(i)','220203','Library Services – Legal Section FHQ Abuja',18),
('22020303','220203','Newspapers',19),
('22020304','220203','Magazines and Periodicals',20),
('22020305','220203','Printing of Non-Security Documents',21),
('22020306','220203','Printing of Security Documents',22),
('22020307(a)','220203','Drugs and Medical Supplies (NPMS)',23),
('22020307(b)','220203','Force Veterinary Services',24),
('22020308(a)','220203','Field and Camping Materials Supplies',25),
('22020308(b)','220203','Cobbler Equipment and Saddleries for Mounted Troop',26),
('22020309','220203','Uniforms and Other Clothing',27),
('22020310(a)','220203','Teaching Aids to Police Colleges',28),
('22020310(b)','220203','Teaching Aids to Police Primary/Secondary Schools',29),
('22020310(c)','220203','Dogs Training Equipment (K9)',30),
('22020310(d)','220203','Veterinary Centres',31),
('22020311(a)','220203','Emergency Ration',32),
('22020311(b)','220203','Feeding of Detainees (in Police Custody Nationwide)',33),
('22020311(c)','220203','Feeding of Patients',34),
('22020311(d)','220203','Feeding of FHQ Abuja Guards',35),
('22020401','220204','Maintenance of Motor Vehicles and Transport Equipment',1),
('22020402','220204','Maintenance of Office Furniture',2),
('22020403','220204','Maintenance of Office Buildings and Residential Quarters',3),
('22020404(a)','220204','Maintenance of Office Equipment',4),
('22020404(b)','220204','Maintenance of IT Equipment',5),
('22020405','220204','Maintenance of Plants and Generators',6),
('22020406(a)','220204','Maintenance of Communication Equipment',7),
('22020406(b)','220204','Maintenance of Bomb Disposal Equipment and Demolition Stores',8),
('22020406(c)','220204','Maintenance of Electrical Appliances, Refrigerators and Air Conditioners',9),
('22020406(d)','220204','Maintenance of Police Printing Press',10),
('22020406(e)','220204','Maintenance of Police Band and Musical Equipment',11),
('22020406(f)','220204','Maintenance of Mechanical Workshop Equipment',12),
('22020406(g)','220204','Maintenance of Marine Workshop Equipment',13),
('22020406(h)','220204','Maintenance of Forensic Lab Equipment',14),
('22020406(i)','220204','Maintenance of Force CID Lab Equipment (CCR)',15),
('22020406(j)','220204','Maintenance of Horses',16),
('22020406(k)','220204','Maintenance of Dogs',17),
('22020406(l)','220204','Maintenance of Arms, Ammunition and Riot Control Equipment',18),
('22020406(m)','220204','Maintenance of Armoury and Ranges',19),
('22020406(n)','220204','Maintenance of Hospital Equipment',20),
('22020406(o)','220204','Maintenance of Sewing Machines and Tools',21),
('22020406(p)','220204','Maintenance of FIB Surveillance Equipment',22),
('22020406(q)','220204','Maintenance of FIB (COMMINT LI) Equipment',23),
('22020406(r)','220204','Maintenance of Police Hall of Fame and Museum',24),
('22020406(s)','220204','Other Maintenance Services',25),
('22020407','220204','Maintenance of Aircraft',26),
('22020408','220204','Maintenance of Sea Boats',27),
('22020501(a)','220205','Local Training',1),
('22020501(b)','220205','Conferences and Workshops',2),
('22020501(c)','220205','Grant to Police Secondary Schools',3),
('22020501(d)','220205','Local Training / Instructors'' Allowances',4),
('22020502','220205','International Training',5),
('22020601','220206','Security Services',1),
('22020603','220206','Office Rent',2),
('22020605','220206','Security Vote (Including Operations)',3),
('22020606(a)','220206','Cleaning and Gardening Equipment – Provost FHQ Abuja',4),
('22020606(b)','220206','Cleaning and Gardening Equipment – Provost FHQ Annex Lagos',5),
('22020701','220207','Financial Consulting',1),
('22020702','220207','Information Technology Consulting',2),
('22020703','220207','Legal Services',3),
('22020704','220207','Engineering Services',4),
('22020705','220207','Architectural Services',5),
('22020706','220207','Surveying Services',6),
('22020801','220208','Motor Vehicle Fuel Cost',1),
('22020803','220208','Plant and Generator Fuel Cost',2),
('22020804','220208','Aircraft Fuel Cost',3),
('22020805','220208','Sea Boat Fuel Cost',4),
('22020901','220209','Bank Charges (Other than Interest)',1),
('22020902(a)','220209','Group Personal Accident Cover',2),
('22020902(b)','220209','Insurance of Nigeria Police Airfleet',3),
('22020902(c)','220209','Insurance of Police Buildings and HQS',4),
('22020902(d)','220209','Insurance of Police Marine Boats',5),
('22020902(e)','220209','Insurance of Police Animals',6),
('22021001','220210','Refreshment and Meals',1),
('22021002','220210','Honourarium and Sitting Allowances',2),
('22021003(a)','220210','Public Enlightenment Through Audio Visuals',3),
('22021003(b)','220210','Force and Media',4),
('22021003(c)','220210','Public Information and Publicity',5),
('22021004','220210','Medical Expenditure',6),
('22021006','220210','Postages and Courier Services',7),
('22021007','220210','Welfare Packages (Burial Expenses)',8),
('22021009','220210','Sporting Activities',9),
('22021014','220210','Annual Budget Expenses and Administration',10),
('22021020','220210','Election – Logistics Support',11),
('22040201','220402','Foreign Grants and Contributions',1);

insert into public.fiscal_years(year,status) values (2026,'OPEN');

-- Seed formations (1 per state/FCT as State Command HQ)
insert into public.formations(state,name,type)
select s, s || ' State Command HQ', 'STATE_COMMAND' from (values
 ('Abia'),('Adamawa'),('Akwa Ibom'),('Anambra'),('Bauchi'),('Bayelsa'),('Benue'),('Borno'),
 ('Cross River'),('Delta'),('Ebonyi'),('Edo'),('Ekiti'),('Enugu'),('FCT Abuja'),('Gombe'),
 ('Imo'),('Jigawa'),('Kaduna'),('Kano'),('Katsina'),('Kebbi'),('Kogi'),('Kwara'),('Lagos'),
 ('Nasarawa'),('Niger'),('Ogun'),('Ondo'),('Osun'),('Oyo'),('Plateau'),('Rivers'),
 ('Sokoto'),('Taraba'),('Yobe'),('Zamfara')
) as v(s);
insert into public.formations(state,name,type) values ('FCT Abuja','Force Headquarters (FHQ)','FHQ');

-- =========================================================
-- TIMESTAMP TRIGGER
-- =========================================================
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- =========================================================
-- TRANSACTION TABLES (maker-checker fields common)
-- =========================================================

-- Fund inflows
create table public.fund_inflows (
  id uuid primary key default gen_random_uuid(),
  fiscal_year int not null references public.fiscal_years(year),
  inflow_date date not null,
  source text not null,                 -- FAAC | SPECIAL
  reference_no text not null,
  amount numeric(18,2) not null check (amount > 0),
  notes text,
  status public.txn_status not null default 'DRAFT',
  created_by uuid not null default auth.uid() references auth.users(id),
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  return_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.fund_inflows enable row level security;
create trigger fund_inflows_touch before update on public.fund_inflows for each row execute function public.touch_updated_at();

-- AIE records
create table public.aie_records (
  id uuid primary key default gen_random_uuid(),
  fiscal_year int not null references public.fiscal_years(year),
  aie_no text not null,
  issue_date date not null,
  sub_item_code text not null references public.budget_sub_items(code),
  amount numeric(18,2) not null check (amount > 0),
  recipient_unit text not null,
  proposal_id uuid,
  inflow_id uuid references public.fund_inflows(id),
  expires_at date,
  retirement_status text not null default 'NONE', -- NONE | PARTIAL | FULL
  status public.txn_status not null default 'DRAFT',
  created_by uuid not null default auth.uid() references auth.users(id),
  submitted_by uuid references auth.users(id), submitted_at timestamptz,
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  approved_by uuid references auth.users(id), approved_at timestamptz,
  return_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.aie_records enable row level security;
create trigger aie_records_touch before update on public.aie_records for each row execute function public.touch_updated_at();

-- Distribution batches + lines
create table public.distribution_batches (
  id uuid primary key default gen_random_uuid(),
  fiscal_year int not null references public.fiscal_years(year),
  period_month int not null check (period_month between 1 and 12),
  total_inflow numeric(18,2) not null default 0,
  hq_retention numeric(18,2) not null default 0,
  distributed_total numeric(18,2) not null default 0,
  status public.txn_status not null default 'DRAFT',
  created_by uuid not null default auth.uid() references auth.users(id),
  submitted_by uuid references auth.users(id), submitted_at timestamptz,
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  approved_by uuid references auth.users(id), approved_at timestamptz,
  return_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.distribution_batches enable row level security;
create trigger dist_touch before update on public.distribution_batches for each row execute function public.touch_updated_at();

create table public.distribution_lines (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.distribution_batches(id) on delete cascade,
  formation_id uuid not null references public.formations(id),
  sub_item_code text not null references public.budget_sub_items(code),
  amount numeric(18,2) not null check (amount >= 0)
);
alter table public.distribution_lines enable row level security;

-- Expenditures
create table public.expenditures (
  id uuid primary key default gen_random_uuid(),
  fiscal_year int not null references public.fiscal_years(year),
  expense_date date not null,
  voucher_no text not null,
  payee text not null,
  sub_item_code text not null references public.budget_sub_items(code),
  aie_id uuid references public.aie_records(id),
  gross_amount numeric(18,2) not null check (gross_amount > 0),
  wht_amount numeric(18,2) not null default 0,
  net_amount numeric(18,2) generated always as (gross_amount - coalesce(wht_amount,0)) stored,
  description text,
  status public.txn_status not null default 'DRAFT',
  created_by uuid not null default auth.uid() references auth.users(id),
  submitted_by uuid references auth.users(id), submitted_at timestamptz,
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  approved_by uuid references auth.users(id), approved_at timestamptz,
  return_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.expenditures enable row level security;
create trigger exp_touch before update on public.expenditures for each row execute function public.touch_updated_at();

-- Proposals
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  fiscal_year int not null references public.fiscal_years(year),
  department text not null,
  sub_item_code text not null references public.budget_sub_items(code),
  amount numeric(18,2) not null check (amount > 0),
  justification text,
  status public.txn_status not null default 'DRAFT',
  created_by uuid not null default auth.uid() references auth.users(id),
  submitted_by uuid references auth.users(id), submitted_at timestamptz,
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  approved_by uuid references auth.users(id), approved_at timestamptz,
  return_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.proposals enable row level security;
create trigger prop_touch before update on public.proposals for each row execute function public.touch_updated_at();

-- Approval actions audit
create table public.approval_actions (
  id uuid primary key default gen_random_uuid(),
  record_type text not null,
  record_id uuid not null,
  actor uuid not null default auth.uid() references auth.users(id),
  action text not null, -- SUBMIT|REVIEW|APPROVE|RETURN|CANCEL
  remarks text,
  created_at timestamptz not null default now()
);
alter table public.approval_actions enable row level security;
create policy "approvals read" on public.approval_actions for select using (auth.uid() is not null);
create policy "approvals insert self" on public.approval_actions for insert with check (actor = auth.uid());

-- Audit log
create table public.audit_log (
  id bigserial primary key,
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null,
  diff jsonb,
  at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "audit read auditor+sysadmin+director" on public.audit_log for select using (
  public.has_role(auth.uid(),'AUDITOR') or public.has_role(auth.uid(),'SYSADMIN') or public.has_role(auth.uid(),'BUDGET_DIR')
);

create or replace function public.log_audit() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_log(actor,table_name,row_id,action,diff)
  values(auth.uid(), tg_table_name,
         coalesce(new.id::text, old.id::text),
         tg_op,
         case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;

create trigger audit_fund_inflows after insert or update or delete on public.fund_inflows for each row execute function public.log_audit();
create trigger audit_aie after insert or update or delete on public.aie_records for each row execute function public.log_audit();
create trigger audit_dist after insert or update or delete on public.distribution_batches for each row execute function public.log_audit();
create trigger audit_dist_lines after insert or update or delete on public.distribution_lines for each row execute function public.log_audit();
create trigger audit_exp after insert or update or delete on public.expenditures for each row execute function public.log_audit();
create trigger audit_prop after insert or update or delete on public.proposals for each row execute function public.log_audit();
create trigger audit_roles after insert or update or delete on public.user_roles for each row execute function public.log_audit();

-- Documents registry
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  bucket_path text not null,
  mime_type text,
  size_bytes int,
  linked_table text,
  linked_id uuid,
  uploaded_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "docs read signed-in" on public.documents for select using (auth.uid() is not null);
create policy "docs insert self" on public.documents for insert with check (uploaded_by = auth.uid());
create policy "docs delete unlinked or sysadmin" on public.documents for delete using (
  uploaded_by = auth.uid() and linked_id is null
  or public.has_role(auth.uid(),'SYSADMIN')
);

-- =========================================================
-- TXN RLS POLICIES (apply consistently)
-- =========================================================
-- Helper: who can read transactions = any signed-in BMS user
-- Maker (CLK) can insert / update DRAFT they own
-- Officer reviews when SUBMITTED, cannot be creator/submitter
-- Director approves when OFFICER_REVIEWED, cannot be creator/submitter/reviewer

-- Generic read
create policy "fi read" on public.fund_inflows for select using (auth.uid() is not null);
create policy "fi insert clk" on public.fund_inflows for insert with check (public.has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "fi update flow" on public.fund_inflows for update using (
  -- maker can edit own drafts/returned
  (created_by = auth.uid() and status in ('DRAFT','RETURNED') and public.has_role(auth.uid(),'BUDGET_CLK'))
  or (public.has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid())
  or (public.has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);
create policy "fi delete own draft" on public.fund_inflows for delete using (created_by = auth.uid() and status = 'DRAFT');

create policy "aie read" on public.aie_records for select using (auth.uid() is not null);
create policy "aie insert" on public.aie_records for insert with check (public.has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "aie update" on public.aie_records for update using (
  (created_by = auth.uid() and status in ('DRAFT','RETURNED') and public.has_role(auth.uid(),'BUDGET_CLK'))
  or (public.has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid())
  or (public.has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);
create policy "aie delete own draft" on public.aie_records for delete using (created_by = auth.uid() and status = 'DRAFT');

create policy "dist read" on public.distribution_batches for select using (auth.uid() is not null);
create policy "dist insert" on public.distribution_batches for insert with check (public.has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "dist update" on public.distribution_batches for update using (
  (created_by = auth.uid() and status in ('DRAFT','RETURNED') and public.has_role(auth.uid(),'BUDGET_CLK'))
  or (public.has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid())
  or (public.has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);
create policy "dist delete own draft" on public.distribution_batches for delete using (created_by = auth.uid() and status = 'DRAFT');

create policy "distl read" on public.distribution_lines for select using (auth.uid() is not null);
create policy "distl write via batch" on public.distribution_lines for all using (
  exists (select 1 from public.distribution_batches b where b.id = batch_id and (
    (b.created_by = auth.uid() and b.status in ('DRAFT','RETURNED'))
    or public.has_role(auth.uid(),'SYSADMIN')
  ))
) with check (
  exists (select 1 from public.distribution_batches b where b.id = batch_id and b.created_by = auth.uid() and b.status in ('DRAFT','RETURNED'))
);

create policy "exp read" on public.expenditures for select using (auth.uid() is not null);
create policy "exp insert" on public.expenditures for insert with check (public.has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "exp update" on public.expenditures for update using (
  (created_by = auth.uid() and status in ('DRAFT','RETURNED') and public.has_role(auth.uid(),'BUDGET_CLK'))
  or (public.has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid())
  or (public.has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);
create policy "exp delete own draft" on public.expenditures for delete using (created_by = auth.uid() and status = 'DRAFT');

create policy "prop read" on public.proposals for select using (auth.uid() is not null);
create policy "prop insert" on public.proposals for insert with check (public.has_role(auth.uid(),'BUDGET_CLK') and created_by = auth.uid());
create policy "prop update" on public.proposals for update using (
  (created_by = auth.uid() and status in ('DRAFT','RETURNED') and public.has_role(auth.uid(),'BUDGET_CLK'))
  or (public.has_role(auth.uid(),'BUDGET_OFF') and status = 'SUBMITTED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid())
  or (public.has_role(auth.uid(),'BUDGET_DIR') and status = 'OFFICER_REVIEWED' and created_by <> auth.uid() and coalesce(submitted_by,created_by) <> auth.uid() and coalesce(reviewed_by,'00000000-0000-0000-0000-000000000000'::uuid) <> auth.uid())
);
create policy "prop delete own draft" on public.proposals for delete using (created_by = auth.uid() and status = 'DRAFT');

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
insert into storage.buckets(id,name,public) values ('bms-documents','bms-documents',false);

create policy "bms docs read signed-in" on storage.objects for select using (bucket_id = 'bms-documents' and auth.uid() is not null);
create policy "bms docs upload signed-in" on storage.objects for insert with check (bucket_id = 'bms-documents' and auth.uid() is not null);
create policy "bms docs delete own" on storage.objects for delete using (bucket_id = 'bms-documents' and owner = auth.uid());
