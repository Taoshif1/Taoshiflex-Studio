-- Phase 1H: versioned policies, private project billing, and durable milestone history.
-- This migration is additive and must be manually reviewed before remote application.

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 80
  ),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policies(id) on delete restrict,
  version integer not null check (version >= 1),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  content text not null default '' check (char_length(content) <= 100000),
  audience text not null default 'both' check (audience in ('public','client','both')),
  is_published boolean not null default false,
  effective_date date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(policy_id, version),
  check (not is_published or (published_at is not null and effective_date is not null and char_length(btrim(content)) > 0))
);

create table public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  policy_id uuid not null references public.policies(id) on delete restrict,
  policy_version integer not null,
  acknowledged_at timestamptz not null default now(),
  unique(user_id, policy_id, policy_version),
  foreign key (policy_id, policy_version)
    references public.policy_versions(policy_id, version) on delete restrict
);

create index policies_public_order on public.policies(sort_order, created_at);
create index policy_versions_current on public.policy_versions(policy_id, is_published, version desc);
create unique index policy_versions_one_published on public.policy_versions(policy_id) where is_published;
create index policy_acknowledgements_user on public.policy_acknowledgements(user_id, acknowledged_at desc);

create trigger policies_updated_at before update on public.policies
for each row execute function public.touch_client_workspace_updated_at();
create trigger policy_versions_updated_at before update on public.policy_versions
for each row execute function public.touch_client_workspace_updated_at();

create or replace function public.guard_policy_version_history()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.published_at is not null and row(
    new.id, new.policy_id, new.version, new.title, new.summary, new.content,
    new.audience, new.effective_date, new.published_at, new.created_at
  ) is distinct from row(
    old.id, old.policy_id, old.version, old.title, old.summary, old.content,
    old.audience, old.effective_date, old.published_at, old.created_at
  ) then
    raise exception using errcode='55000', message='Published policy versions are immutable; create a new version';
  end if;
  if new.is_published and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;

create trigger policy_versions_guard_history
before update on public.policy_versions
for each row execute function public.guard_policy_version_history();

create or replace function public.guard_policy_version_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.published_at is not null or exists (
    select 1 from public.policy_acknowledgements
    where policy_id=old.policy_id and policy_version=old.version
  ) then
    raise exception using errcode='55000', message='Published or acknowledged policy history cannot be deleted';
  end if;
  if not exists (
    select 1 from public.policy_versions
    where policy_id=old.policy_id and id<>old.id
  ) then
    raise exception using errcode='55000', message='The final policy draft cannot be deleted; archive the policy instead';
  end if;
  return old;
end $$;

create trigger policy_versions_guard_delete
before delete on public.policy_versions
for each row execute function public.guard_policy_version_delete();

create or replace function public.create_policy_draft(
  policy_slug text, policy_title text, policy_summary text default '',
  policy_content text default '', policy_audience text default 'both',
  policy_effective_date date default null, policy_sort_order integer default 0
) returns uuid language plpgsql security definer set search_path=public as $$
declare created_policy uuid;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  insert into public.policies(slug,sort_order)
  values(lower(btrim(policy_slug)),policy_sort_order) returning id into created_policy;
  insert into public.policy_versions(policy_id,version,title,summary,content,audience,effective_date)
  values(created_policy,1,btrim(policy_title),coalesce(policy_summary,''),coalesce(policy_content,''),policy_audience,policy_effective_date);
  return created_policy;
end $$;

create or replace function public.create_policy_version(source_policy_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare latest public.policy_versions%rowtype; created_version uuid;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  select * into latest from public.policy_versions where policy_id=source_policy_id order by version desc limit 1;
  if not found then raise exception 'Policy not found'; end if;
  if latest.published_at is null then raise exception 'An editable draft already exists'; end if;
  insert into public.policy_versions(policy_id,version,title,summary,content,audience,effective_date)
  values(latest.policy_id,latest.version+1,latest.title,latest.summary,latest.content,latest.audience,latest.effective_date)
  returning id into created_version;
  return created_version;
end $$;

create or replace function public.set_policy_version_published(target_version_id uuid, publish boolean)
returns void language plpgsql security definer set search_path=public as $$
declare target public.policy_versions%rowtype;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  select * into target from public.policy_versions where id=target_version_id for update;
  if not found then raise exception 'Policy version not found'; end if;
  if publish then
    if target.effective_date is null or char_length(btrim(target.content))=0 then
      raise exception 'Effective date and content are required before publishing';
    end if;
    update public.policy_versions set is_published=false
      where policy_id=target.policy_id and id<>target.id and is_published;
    update public.policy_versions set is_published=true, published_at=coalesce(published_at,now()) where id=target.id;
  else
    update public.policy_versions set is_published=false where id=target.id;
  end if;
end $$;

alter table public.policies enable row level security;
alter table public.policy_versions enable row level security;
alter table public.policy_acknowledgements enable row level security;

create or replace function public.policy_family_has_published_audience(target_policy_id uuid, allowed_audiences text[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.policies p join public.policy_versions v on v.policy_id=p.id
    where p.id=target_policy_id and p.archived_at is null and v.is_published and v.audience=any(allowed_audiences)
  )
$$;
create or replace function public.policy_family_is_active(target_policy_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.policies where id=target_policy_id and archived_at is null)
$$;

create policy "public reads available policy families" on public.policies for select
using (
  public.policy_family_has_published_audience(id,array['public','both'])
  or public.is_studio_admin()
  or (
    exists(select 1 from public.client_project_members m where m.user_id=auth.uid())
    and public.policy_family_has_published_audience(id,array['client','both'])
  )
);
create policy "admins manage policy families" on public.policies for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "read permitted policy versions" on public.policy_versions for select
using (
  public.is_studio_admin()
  or (
    is_published and public.policy_family_is_active(policy_id)
    and (
      audience in ('public','both')
      or (audience in ('client','both') and exists (
        select 1 from public.client_project_members m where m.user_id=auth.uid()
      ))
    )
  )
);
create policy "admins manage policy versions" on public.policy_versions for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "users read own policy acknowledgements" on public.policy_acknowledgements for select
using (user_id=auth.uid() or public.is_studio_admin());
create policy "users acknowledge applicable policies" on public.policy_acknowledgements for insert
with check (
  user_id=auth.uid()
  and exists(select 1 from public.client_project_members m where m.user_id=auth.uid())
  and public.policy_family_is_active(policy_acknowledgements.policy_id)
  and exists (
    select 1 from public.policy_versions v
    where v.policy_id=policy_acknowledgements.policy_id
      and v.version=policy_acknowledgements.policy_version
      and v.is_published and v.audience in ('client','both')
  )
);

revoke all on public.policies, public.policy_versions, public.policy_acknowledgements from public,anon,authenticated;
grant select on public.policies, public.policy_versions to anon,authenticated;
grant insert,update,delete on public.policies, public.policy_versions to authenticated;
grant select,insert on public.policy_acknowledgements to authenticated;
revoke all on function public.policy_family_has_published_audience(uuid,text[]),public.policy_family_is_active(uuid) from public;
grant execute on function public.policy_family_has_published_audience(uuid,text[]),public.policy_family_is_active(uuid) to anon,authenticated;
revoke all on function public.guard_policy_version_history(), public.guard_policy_version_delete() from public,anon,authenticated;
revoke all on function public.create_policy_draft(text,text,text,text,text,date,integer) from public,anon;
grant execute on function public.create_policy_draft(text,text,text,text,text,date,integer) to authenticated;
revoke all on function public.create_policy_version(uuid), public.set_policy_version_published(uuid,boolean) from public,anon;
grant execute on function public.create_policy_version(uuid), public.set_policy_version_published(uuid,boolean) to authenticated;

create table public.project_billing (
  project_id uuid primary key references public.client_projects(id) on delete cascade,
  agreed_value_minor bigint not null check (agreed_value_minor between 1 and 9007199254740991),
  currency text not null default 'BDT' check (currency ~ '^[A-Z]{3}$'),
  currency_decimals smallint not null default 2 check (currency_decimals between 0 and 3),
  allowed_methods text[] not null default array['bank_transfer','bkash','nagad','other']::text[],
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allowed_methods <@ array['bank_transfer','bkash','nagad','other']::text[] and cardinality(allowed_methods) > 0)
);

create table public.project_payment_schedule (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 120),
  percentage numeric(5,2) check (percentage is null or percentage between 0.01 and 100.00),
  expected_amount_minor bigint not null check (expected_amount_minor between 1 and 9007199254740991),
  due_date date,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete restrict,
  schedule_item_id uuid references public.project_payment_schedule(id) on delete restrict,
  submitted_by uuid references auth.users(id) on delete restrict,
  origin text not null check (origin in ('client_submission','admin_manual','gateway')),
  entry_type text not null default 'payment' check (entry_type in ('payment','reversal')),
  reversal_of uuid references public.project_payments(id) on delete restrict,
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_method text not null check (payment_method in ('bank_transfer','bkash','nagad','other')),
  reference_id text not null default '' check (char_length(reference_id) <= 160),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  rejection_reason text not null default '' check (char_length(rejection_reason) <= 500),
  submitted_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  rejected_by uuid references auth.users(id) on delete restrict,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status='pending' and confirmed_by is null and confirmed_at is null and rejected_by is null and rejected_at is null)
    or (status='confirmed' and confirmed_by is not null and confirmed_at is not null and rejected_by is null and rejected_at is null)
    or (status='rejected' and rejected_by is not null and rejected_at is not null and confirmed_by is null and confirmed_at is null)
  ),
  check ((entry_type='payment' and reversal_of is null) or (entry_type='reversal' and reversal_of is not null))
);

create unique index project_payments_one_reversal
  on public.project_payments(reversal_of) where reversal_of is not null and status='confirmed';
create index project_payment_schedule_order on public.project_payment_schedule(project_id, archived_at, sort_order, created_at);
create index project_payments_history on public.project_payments(project_id, submitted_at desc, id desc);
create index project_payments_pending on public.project_payments(project_id, submitted_at) where status='pending';

create trigger project_billing_updated_at before update on public.project_billing
for each row execute function public.touch_client_workspace_updated_at();
create trigger project_payment_schedule_updated_at before update on public.project_payment_schedule
for each row execute function public.touch_client_workspace_updated_at();

create or replace function public.validate_project_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  billing public.project_billing%rowtype;
  target_schedule public.project_payment_schedule%rowtype;
  original_payment public.project_payments%rowtype;
  confirmed_net bigint;
begin
  select * into billing from public.project_billing where project_id=new.project_id;
  if not found then raise exception 'Project billing is not configured'; end if;
  if new.schedule_item_id is not null then
    select * into target_schedule from public.project_payment_schedule where id=new.schedule_item_id;
    if not found or target_schedule.project_id<>new.project_id then
      raise exception 'Payment schedule item is not available for this project';
    end if;
  end if;
  if new.entry_type='reversal' then
    select * into original_payment from public.project_payments where id=new.reversal_of;
    if new.origin<>'admin_manual' or not found
      or original_payment.project_id<>new.project_id
      or original_payment.status<>'confirmed'
      or original_payment.entry_type<>'payment'
      or original_payment.schedule_item_id is distinct from new.schedule_item_id
      or original_payment.amount_minor<>new.amount_minor
      or original_payment.currency<>new.currency
      or original_payment.payment_method<>new.payment_method then
      raise exception 'A reversal must exactly reference a confirmed project payment from the same project';
    end if;
  else
    if new.currency<>billing.currency then raise exception 'Payment currency must match project billing currency'; end if;
    if not (new.payment_method=any(billing.allowed_methods)) then raise exception 'Payment method is not available for this project'; end if;
    if new.schedule_item_id is not null and target_schedule.archived_at is not null then
      raise exception 'New payments may only reference an active payment schedule item';
    end if;
    select coalesce(sum(case when entry_type='payment' then amount_minor else -amount_minor end),0)::bigint
      into confirmed_net from public.project_payments
      where project_id=new.project_id and status='confirmed';
    if confirmed_net+new.amount_minor>billing.agreed_value_minor then
      raise exception 'Payment amount exceeds the remaining project balance';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_project_payment_history()
returns trigger language plpgsql set search_path=public as $$
begin
  if row(new.id,new.project_id,new.schedule_item_id,new.submitted_by,new.origin,new.entry_type,
    new.reversal_of,new.amount_minor,new.currency,new.payment_method,new.reference_id,new.note,
    new.submitted_at,new.created_at)
    is distinct from row(old.id,old.project_id,old.schedule_item_id,old.submitted_by,old.origin,old.entry_type,
    old.reversal_of,old.amount_minor,old.currency,old.payment_method,old.reference_id,old.note,
    old.submitted_at,old.created_at) then
    raise exception using errcode='55000', message='Payment submissions and history are immutable';
  end if;
  if old.status<>'pending' then
    raise exception using errcode='55000', message='Confirmed or rejected payments cannot be rewritten';
  end if;
  if new.status not in ('confirmed','rejected') or new.status=old.status then
    raise exception using errcode='23514', message='Pending payments may only be confirmed or rejected';
  end if;
  return new;
end $$;

create or replace function public.guard_client_payment_insert()
returns trigger language plpgsql set search_path=public as $$
begin
  if public.is_studio_admin() then return new; end if;
  if auth.uid() is null or not public.is_client_project_member(new.project_id) then
    raise exception 'Client Project membership required';
  end if;
  new.submitted_by:=auth.uid(); new.origin:='client_submission'; new.entry_type:='payment';
  new.reversal_of:=null; new.status:='pending'; new.rejection_reason:='';
  new.confirmed_by:=null; new.confirmed_at:=null; new.rejected_by:=null; new.rejected_at:=null;
  new.submitted_at:=now(); new.created_at:=now();
  return new;
end $$;

create trigger project_payments_guard_client_insert before insert on public.project_payments
for each row execute function public.guard_client_payment_insert();
create trigger project_payments_validate before insert on public.project_payments
for each row execute function public.validate_project_payment();
create trigger project_payments_guard_history before update on public.project_payments
for each row execute function public.guard_project_payment_history();

create or replace function public.guard_payment_schedule_history()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.project_payments where schedule_item_id=old.id and status='confirmed')
    and row(new.project_id,new.label,new.percentage,new.expected_amount_minor,new.due_date)
      is distinct from row(old.project_id,old.label,old.percentage,old.expected_amount_minor,old.due_date) then
    raise exception using errcode='55000', message='Schedule items with confirmed payments cannot be rewritten';
  end if;
  return new;
end $$;

create or replace function public.guard_payment_schedule_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.project_payments where schedule_item_id=old.id) then
    raise exception using errcode='55000', message='Schedule items with payment history cannot be deleted; archive them instead';
  end if;
  return old;
end $$;

create trigger project_payment_schedule_guard_history before update on public.project_payment_schedule
for each row execute function public.guard_payment_schedule_history();
create trigger project_payment_schedule_guard_delete before delete on public.project_payment_schedule
for each row execute function public.guard_payment_schedule_delete();

create or replace function public.validate_payment_schedule_totals()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_project uuid; project_value bigint; amount_total numeric; percentage_total numeric;
begin
  target_project:=case when tg_op='DELETE' then old.project_id else new.project_id end;
  select agreed_value_minor into project_value from public.project_billing where project_id=target_project;
  select coalesce(sum(expected_amount_minor),0),coalesce(sum(percentage),0)
    into amount_total,percentage_total from public.project_payment_schedule
    where project_id=target_project and archived_at is null;
  if amount_total>project_value then raise exception 'Active installment amounts cannot exceed the agreed project value'; end if;
  if percentage_total>100 then raise exception 'Active installment percentages cannot exceed 100'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;

create constraint trigger project_payment_schedule_validate_totals
after insert or update or delete on public.project_payment_schedule
deferrable initially immediate for each row execute function public.validate_payment_schedule_totals();

create or replace function public.guard_project_billing_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (new.currency is distinct from old.currency or new.currency_decimals is distinct from old.currency_decimals)
    and (exists(select 1 from public.project_payment_schedule where project_id=old.project_id)
      or exists(select 1 from public.project_payments where project_id=old.project_id)) then
    raise exception using errcode='55000', message='Currency settings cannot change after a schedule or payment exists';
  end if;
  if exists(select 1 from public.project_payment_schedule where project_id=old.project_id and archived_at is null
    group by project_id having sum(expected_amount_minor)>new.agreed_value_minor) then
    raise exception 'Project value cannot be lower than the active payment schedule';
  end if;
  if exists(
    select 1 from public.project_payments where project_id=old.project_id and status='confirmed'
    group by project_id having sum(case when entry_type='payment' then amount_minor else -amount_minor end)>new.agreed_value_minor
  ) then
    raise exception 'Project value cannot be lower than confirmed net payments';
  end if;
  return new;
end $$;
create trigger project_billing_guard_history before update on public.project_billing
for each row execute function public.guard_project_billing_history();

create or replace function public.initialize_project_billing(
  target_project_id uuid, project_value_minor bigint, project_currency text default 'BDT',
  decimal_places smallint default 2, deposit_percentage numeric default 30.00
) returns void language plpgsql security definer set search_path=public as $$
declare deposit_minor bigint;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  if project_value_minor<=0 or deposit_percentage<=0 or deposit_percentage>=100 then raise exception 'Invalid billing defaults'; end if;
  if exists(select 1 from public.project_billing where project_id=target_project_id) then raise exception 'Project billing already exists'; end if;
  deposit_minor:=round(project_value_minor*deposit_percentage/100.0);
  insert into public.project_billing(project_id,agreed_value_minor,currency,currency_decimals)
    values(target_project_id,project_value_minor,upper(project_currency),decimal_places);
  insert into public.project_payment_schedule(project_id,label,percentage,expected_amount_minor,sort_order)
    values(target_project_id,'Initial deposit',deposit_percentage,deposit_minor,0),
      (target_project_id,'Final payment',100-deposit_percentage,project_value_minor-deposit_minor,1);
end $$;

create or replace function public.decide_project_payment(target_payment_id uuid, decision text, reason text default '')
returns void language plpgsql security definer set search_path=public as $$
declare
  target public.project_payments%rowtype;
  billing public.project_billing%rowtype;
  confirmed_net bigint;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  if decision not in ('confirmed','rejected') then raise exception 'Invalid payment decision'; end if;
  select * into target from public.project_payments where id=target_payment_id and status='pending' for update;
  if not found then raise exception 'Pending payment not found'; end if;
  if decision='confirmed' then
    select * into billing from public.project_billing where project_id=target.project_id for update;
    if not found then raise exception 'Project billing is not configured'; end if;
    select coalesce(sum(case when entry_type='payment' then amount_minor else -amount_minor end),0)::bigint
      into confirmed_net from public.project_payments
      where project_id=target.project_id and status='confirmed';
    if confirmed_net+target.amount_minor>billing.agreed_value_minor then
      raise exception 'Confirming this payment would exceed the agreed project value';
    end if;
    update public.project_payments set status='confirmed',confirmed_by=auth.uid(),confirmed_at=now(),rejection_reason=''
    where id=target.id;
  else
    update public.project_payments set status='rejected',rejected_by=auth.uid(),rejected_at=now(),rejection_reason=left(coalesce(reason,''),500)
    where id=target.id;
  end if;
end $$;

create or replace function public.record_manual_project_payment(
  target_project_id uuid, target_schedule_item_id uuid, payment_amount_minor bigint,
  method text, transaction_reference text default '', payment_note text default ''
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  created_id uuid;
  billing public.project_billing%rowtype;
  confirmed_net bigint;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  select * into billing from public.project_billing where project_id=target_project_id for update;
  if not found then raise exception 'Project billing is not configured'; end if;
  select coalesce(sum(case when entry_type='payment' then amount_minor else -amount_minor end),0)::bigint
    into confirmed_net from public.project_payments
    where project_id=target_project_id and status='confirmed';
  if confirmed_net+payment_amount_minor>billing.agreed_value_minor then
    raise exception 'Recording this payment would exceed the agreed project value';
  end if;
  insert into public.project_payments(project_id,schedule_item_id,submitted_by,origin,entry_type,amount_minor,
    currency,payment_method,reference_id,note,status,confirmed_by,confirmed_at)
  values(target_project_id,target_schedule_item_id,auth.uid(),'admin_manual','payment',payment_amount_minor,
    billing.currency,method,coalesce(transaction_reference,''),coalesce(payment_note,''),'confirmed',auth.uid(),now())
  returning id into created_id;
  return created_id;
end $$;

create or replace function public.reverse_project_payment(target_payment_id uuid, reversal_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare original public.project_payments%rowtype; created_id uuid;
begin
  if not public.is_studio_admin() then raise exception 'Studio Admin authorization required'; end if;
  select * into original from public.project_payments where id=target_payment_id for update;
  if not found or original.status<>'confirmed' or original.entry_type<>'payment' then raise exception 'Confirmed payment not found'; end if;
  if char_length(btrim(coalesce(reversal_note,'')))<3 then raise exception 'A reversal reason is required'; end if;
  insert into public.project_payments(project_id,schedule_item_id,submitted_by,origin,entry_type,reversal_of,
    amount_minor,currency,payment_method,reference_id,note,status,confirmed_by,confirmed_at)
  values(original.project_id,original.schedule_item_id,auth.uid(),'admin_manual','reversal',original.id,
    original.amount_minor,original.currency,original.payment_method,original.reference_id,reversal_note,'confirmed',auth.uid(),now())
  returning id into created_id;
  return created_id;
end $$;

create view public.project_billing_summaries with (security_invoker=true) as
select b.project_id,b.agreed_value_minor,b.currency,b.currency_decimals,
  coalesce(sum(case when p.status='confirmed' and p.entry_type='payment' then p.amount_minor
                    when p.status='confirmed' and p.entry_type='reversal' then -p.amount_minor else 0 end),0)::bigint as paid_minor,
  greatest(b.agreed_value_minor-coalesce(sum(case when p.status='confirmed' and p.entry_type='payment' then p.amount_minor
                    when p.status='confirmed' and p.entry_type='reversal' then -p.amount_minor else 0 end),0),0)::bigint as remaining_minor
from public.project_billing b left join public.project_payments p on p.project_id=b.project_id
group by b.project_id,b.agreed_value_minor,b.currency,b.currency_decimals;

alter table public.project_billing enable row level security;
alter table public.project_payment_schedule enable row level security;
alter table public.project_payments enable row level security;
create policy "members read authorized project billing" on public.project_billing for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "admins manage project billing" on public.project_billing for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read authorized payment schedules" on public.project_payment_schedule for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "admins manage payment schedules" on public.project_payment_schedule for all
using (public.is_studio_admin()) with check (public.is_studio_admin());
create policy "members read authorized payment history" on public.project_payments for select
using (public.is_studio_admin() or public.is_client_project_member(project_id));
create policy "clients submit authorized project payments" on public.project_payments for insert
with check (submitted_by=auth.uid() and public.is_client_project_member(project_id));

revoke all on public.project_billing,public.project_payment_schedule,public.project_payments from public,anon,authenticated;
grant select on public.project_billing,public.project_payment_schedule,public.project_payments to authenticated;
grant insert on public.project_payments to authenticated;
grant insert,update,delete on public.project_billing,public.project_payment_schedule to authenticated;
revoke all on public.project_billing_summaries from public,anon,authenticated;
grant select on public.project_billing_summaries to authenticated;
revoke all on function public.validate_project_payment(),public.guard_project_payment_history(),
  public.guard_client_payment_insert(),public.guard_payment_schedule_history(),public.guard_payment_schedule_delete(),
  public.validate_payment_schedule_totals(),public.guard_project_billing_history() from public,anon,authenticated;
revoke all on function public.initialize_project_billing(uuid,bigint,text,smallint,numeric),
  public.decide_project_payment(uuid,text,text),public.record_manual_project_payment(uuid,uuid,bigint,text,text,text),
  public.reverse_project_payment(uuid,text) from public,anon;
grant execute on function public.initialize_project_billing(uuid,bigint,text,smallint,numeric),
  public.decide_project_payment(uuid,text,text),public.record_manual_project_payment(uuid,uuid,bigint,text,text,text),
  public.reverse_project_payment(uuid,text) to authenticated;

alter table public.project_milestones
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete restrict;

create index project_milestones_active_order on public.project_milestones(project_id,sort_order,created_at)
  where archived_at is null and status<>'completed';

create or replace function public.guard_milestone_history()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status='completed' then
    if row(new.project_id,new.title,new.description,new.status,new.due_date,new.completed_at,new.created_at)
      is distinct from row(old.project_id,old.title,old.description,old.status,old.due_date,old.completed_at,old.created_at) then
      raise exception using errcode='55000', message='Completed milestone history is immutable';
    end if;
  elsif new.status='completed' then
    new.completed_at:=coalesce(old.completed_at,now());
  else
    new.completed_at:=old.completed_at;
  end if;
  if new.archived_at is distinct from old.archived_at then
    if new.archived_at is null then new.archived_by:=null;
    else new.archived_at:=now(); new.archived_by:=auth.uid(); end if;
  end if;
  return new;
end $$;

create or replace function public.guard_milestone_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status<>'pending' or old.archived_at is not null or old.completed_at is not null
    or exists(select 1 from public.project_feedback where target_type='milestone' and target_id=old.id) then
    raise exception using errcode='55000', message='Only unused pending milestone drafts may be permanently deleted';
  end if;
  return old;
end $$;

create trigger milestone_history_guard before update on public.project_milestones
for each row execute function public.guard_milestone_history();
create trigger milestone_delete_guard before delete on public.project_milestones
for each row execute function public.guard_milestone_delete();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'project_update','milestone_status','deliverable_review','studio_feedback_response','feedback_resolved',
  'client_feedback','client_changes_requested','new_inquiry','payment_submitted','payment_confirmed','payment_rejected'
)) not valid;
alter table public.notifications validate constraint notifications_type_check;
alter table public.notifications drop constraint if exists notifications_source_type_check;
alter table public.notifications add constraint notifications_source_type_check check (source_type in (
  'project_update','project_milestone','project_deliverable','project_feedback','inquiry','project_payment'
)) not valid;
alter table public.notifications validate constraint notifications_source_type_check;

create or replace function public.notify_payment_insert()
returns trigger language plpgsql security definer set search_path=public as $$
declare recipient record; project_name text;
begin
  select name into project_name from public.client_projects where id=new.project_id;
  if new.status='pending' and new.origin='client_submission' then
    for recipient in select user_id from public.admin_users loop
      perform public.emit_notification(recipient.user_id,'studio',new.project_id,'payment_submitted','attention',
        'project_payment',new.id,'Payment needs verification',
        coalesce(project_name,'Client Project') || ' received a payment submission.',
        '/studio-admin/client-projects/' || new.project_id::text || '#billing');
    end loop;
  elsif new.status='confirmed' and new.origin='admin_manual' and new.entry_type='payment' then
    for recipient in select user_id from public.client_project_members where project_id=new.project_id and role='client' loop
      perform public.emit_notification(recipient.user_id,'client',new.project_id,'payment_confirmed','normal',
        'project_payment',new.id,'Payment recorded',
        'A payment was confirmed for ' || coalesce(project_name,'your project') || '.',
        '/client/projects/' || new.project_id::text || '#billing');
    end loop;
  end if;
  return new;
end $$;

create or replace function public.notify_payment_decision()
returns trigger language plpgsql security definer set search_path=public as $$
declare project_name text;
begin
  if old.status='pending' and new.status in ('confirmed','rejected') and new.submitted_by is not null then
    select name into project_name from public.client_projects where id=new.project_id;
    perform public.emit_notification(new.submitted_by,'client',new.project_id,
      case when new.status='confirmed' then 'payment_confirmed' else 'payment_rejected' end,
      case when new.status='confirmed' then 'normal' else 'attention' end,
      'project_payment',new.id,
      case when new.status='confirmed' then 'Payment confirmed' else 'Payment needs attention' end,
      case when new.status='confirmed' then 'Your payment for ' || coalesce(project_name,'your project') || ' was confirmed.'
           else 'Your payment for ' || coalesce(project_name,'your project') || ' was not confirmed. Review the billing note.' end,
      '/client/projects/' || new.project_id::text || '#billing');
  end if;
  return new;
end $$;

create trigger project_payments_notify_insert after insert on public.project_payments
for each row execute function public.notify_payment_insert();
create trigger project_payments_notify_decision after update of status on public.project_payments
for each row when (old.status is distinct from new.status) execute function public.notify_payment_decision();

revoke all on function public.guard_milestone_history(),public.guard_milestone_delete(),
  public.notify_payment_insert(),public.notify_payment_decision() from public,anon,authenticated;

comment on table public.policy_versions is 'Immutable once-published policy versions; unpublished drafts remain editable.';
comment on table public.policy_acknowledgements is 'Future-ready immutable policy/version acknowledgements; Phase 1H does not require login-time acceptance.';
comment on table public.project_billing is 'Private agreed project value and Client-visible payment instructions. Public package pricing is unrelated.';
comment on table public.project_payments is 'Append-oriented payment ledger. Confirmed corrections use reversal entries instead of silent edits.';
comment on column public.project_billing.agreed_value_minor is 'Exact monetary amount in the currency minor unit; never a floating-point value.';
comment on column public.project_payment_schedule.expected_amount_minor is 'Authoritative expected installment amount in the project currency minor unit.';
comment on column public.project_payment_schedule.percentage is 'Descriptive planning metadata; expected_amount_minor remains authoritative and may reflect agreed rounding.';
comment on column public.project_milestones.archived_at is 'Removes a planning item from the active list without deleting its Client-visible history.';
