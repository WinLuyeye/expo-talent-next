alter table public.admin_audit drop constraint admin_audit_action_check;
alter table public.admin_audit add constraint admin_audit_action_check check(action in ('application.status','settings.update','session.login','session.logout','export.request','attachment.request','notification.request','gallery.request','account.request'));
create or replace function public.expo_save_settings_audited(p_actor uuid,p_data jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare previous jsonb; changed jsonb;
begin
 if not exists(select 1 from public.admin_roles where id=p_actor and role='owner') then raise exception 'ADMIN_REQUIRED'; end if;
 select data into previous from public.event_settings where id=1 for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select coalesce(jsonb_agg(k order by k),'[]'::jsonb) into changed from (select jsonb_object_keys(previous||p_data) k) q where previous->k is distinct from p_data->k;
 update public.event_settings set data=p_data where id=1;
 if changed<>'[]'::jsonb then insert into public.admin_audit(actor_id,action,target_ref,details) values(p_actor,'settings.update','event',jsonb_build_object('fields',changed)); end if;
end $$;
create or replace function public.expo_bulk_status(p_actor uuid,p_status text,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; previous_status text; mail_id uuid; changed_count integer:=0; queued integer:=0; total integer;
begin
 if not exists(select 1 from public.admin_roles where id=p_actor and role='owner') then raise exception 'ADMIN_REQUIRED'; end if;
 if p_status not in ('En cours d’examen','Candidature acceptée','Candidature refusée') or p_status is null then raise exception 'INVALID_STATUS'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_ITEMS'; end if;
 total:=jsonb_array_length(p_items);
 if total<1 or total>20 or (select count(distinct x->>'id') from jsonb_array_elements(p_items) x)<>total then raise exception 'INVALID_ITEMS'; end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
   select status into previous_status from public.applications where id=item->>'id' and coalesce(data->>'synthetic','false')<>'true' for update;
   if not found then raise exception 'NOT_FOUND_OR_DEMO'; end if;
   if previous_status is distinct from item->>'expected' then raise exception 'STALE_STATUS'; end if;
   if previous_status=p_status then continue; end if;
   if previous_status='Participation confirmée' then raise exception 'CONFIRMED_PROTECTED'; end if;
   mail_id:=public.expo_status_audited(p_actor,item->>'id',p_status,coalesce(item->>'subject',''),coalesce(item->>'body',''));
   changed_count:=changed_count+1;
   if mail_id is not null then queued:=queued+1; end if;
 end loop;
 return jsonb_build_object('changed',changed_count,'queued',queued);
end $$;
create or replace function public.expo_register(p_id text,p_data jsonb,p_attachment text,p_original text,p_subject text,p_body text) returns uuid language plpgsql security invoker set search_path=public as $$
declare s jsonb; m uuid; begin
select data into s from event_settings where id=1 for share;
if not coalesce((s->>'open')::boolean,false) or coalesce((s->>'maintenance')::boolean,false) or (coalesce(s->>'deadline','')<>'' and (s->>'deadline')::timestamptz<=now()) then raise exception 'REGISTRATION_CLOSED'; end if;
insert into applications(id,matricule,email,data,attachment,original_name) values(p_id,p_data->>'matricule',p_data->>'email',p_data,p_attachment,p_original);
insert into outbox(app_id,recipient,subject,body) values(p_id,p_data->>'email',p_subject,p_body) returning id into m; return m; end $$;
revoke execute on function public.expo_save_settings_audited(uuid,jsonb),public.expo_bulk_status(uuid,text,jsonb),public.expo_register(text,jsonb,text,text,text,text) from public,anon,authenticated;
grant execute on function public.expo_save_settings_audited(uuid,jsonb),public.expo_bulk_status(uuid,text,jsonb),public.expo_register(text,jsonb,text,text,text,text) to service_role;
