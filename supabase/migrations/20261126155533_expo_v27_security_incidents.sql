create table if not exists public.security_events (
 bucket timestamptz not null,
 kind text not null check(kind in ('login_failure','login_blocked','server_error','file_rejected')),
 account_tag text not null check(account_tag='-' or account_tag~'^[0-9a-f]{64}$'),
 source_tag text not null check(source_tag='-' or source_tag~'^[0-9a-f]{64}$'),
 hits integer not null default 1 check(hits between 1 and 1000000),
 primary key(bucket,kind,account_tag,source_tag)
);
create table if not exists public.security_incidents (
 bucket timestamptz not null,
 kind text not null check(kind in ('distributed_login','repeated_login','server_errors','rejected_files')),
 target_tag text not null check(target_tag='-' or target_tag~'^[0-9a-f]{64}$'),
 hits integer not null,
 sources integer not null,
 created timestamptz not null default now(),
 primary key(bucket,kind,target_tag)
);
alter table public.security_events enable row level security;
alter table public.security_incidents enable row level security;
revoke all on public.security_events,public.security_incidents from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.security_events to service_role;
grant select,insert,update,delete on public.security_incidents to service_role;
create or replace function public.expo_security_record(p_kind text,p_account text,p_source text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare b timestamptz:=date_bin('15 minutes',now(),'2000-01-01 00:00:00+00'::timestamptz); n integer; s integer; incident text; target text:='-'; created_count integer;
begin
 if p_kind not in ('login_failure','login_blocked','server_error','file_rejected') or p_kind is null or p_account is null or p_source is null then raise exception 'INVALID_EVENT'; end if;
 insert into public.security_events(bucket,kind,account_tag,source_tag) values(b,p_kind,p_account,p_source)
 on conflict(bucket,kind,account_tag,source_tag) do update set hits=least(security_events.hits+1,1000000);
 if p_kind in ('login_failure','login_blocked') then
   select coalesce(sum(hits),0)::integer,count(distinct source_tag) filter(where source_tag<>'-')::integer into n,s from public.security_events where bucket=b and kind in ('login_failure','login_blocked') and account_tag=p_account;
   if p_account<>'-' and n>=10 and s>=3 then incident:='distributed_login';target:=p_account;
   else
     select coalesce(sum(hits),0)::integer,count(distinct source_tag) filter(where source_tag<>'-')::integer into n,s from public.security_events where bucket=b and kind in ('login_failure','login_blocked') and source_tag=p_source;
     if p_source<>'-' and n>=10 then incident:='repeated_login';target:=p_source;end if;
   end if;
 else
   select coalesce(sum(hits),0)::integer,count(distinct source_tag) filter(where source_tag<>'-')::integer into n,s from public.security_events where bucket=b and kind=p_kind;
   if p_kind='server_error' and n>=5 then incident:='server_errors'; elsif p_kind='file_rejected' and n>=3 then incident:='rejected_files';end if;
 end if;
 delete from public.security_events where bucket < now()-interval '14 days';
 delete from public.security_incidents where bucket < now()-interval '30 days';
 if incident is null then return null;end if;
 insert into public.security_incidents(bucket,kind,target_tag,hits,sources) values(b,incident,target,n,s)
 on conflict(bucket,kind,target_tag) do nothing;
 get diagnostics created_count=row_count;
 if created_count=0 then return null; end if;
 return jsonb_build_object('kind',incident,'hits',n,'sources',s,'bucket',b);
end $$;
revoke execute on function public.expo_security_record(text,text,text) from public,anon,authenticated;
grant execute on function public.expo_security_record(text,text,text) to service_role;
