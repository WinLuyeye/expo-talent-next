-- Applied in Supabase production on 2026-11-26; recorded version 20261126120752.
create index if not exists outbox_app_id_idx on public.outbox(app_id);
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  created timestamptz not null default now(),
  actor_id uuid not null,
  action text not null check (action in ('application.status')),
  target_ref text not null,
  details jsonb not null default '{}'::jsonb
);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from public, anon, authenticated, service_role;
grant select, insert on public.admin_audit to service_role;
revoke all on sequence public.admin_audit_id_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.admin_audit_id_seq to service_role;
create index if not exists admin_audit_created_idx on public.admin_audit(created desc,id desc);
create or replace function public.expo_status_audited(p_actor uuid,p_id text,p_status text,p_subject text,p_body text)
returns uuid language plpgsql security invoker set search_path=public as $$
declare previous_status text; mail_id uuid;
begin
  if not exists (select 1 from public.admin_roles where id=p_actor and role in ('owner','reviewer')) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  select status into previous_status from public.applications where id=p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if previous_status=p_status then return null; end if;
  mail_id := public.expo_status(p_id,p_status,p_subject,p_body);
  insert into public.admin_audit(actor_id,action,target_ref,details)
  values(p_actor,'application.status',p_id,jsonb_build_object('before',previous_status,'after',p_status));
  return mail_id;
end $$;
revoke execute on function public.expo_status_audited(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.expo_status_audited(uuid,text,text,text,text) to service_role;
