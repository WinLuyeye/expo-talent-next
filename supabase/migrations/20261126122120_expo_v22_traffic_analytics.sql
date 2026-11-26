create table if not exists public.site_traffic_daily (
  day date not null,
  device text not null check (device in ('mobile','tablet','desktop','unknown')),
  channel text not null check (channel in ('direct','search','social','messaging','referral')),
  pageviews bigint not null default 0 check (pageviews >= 0),
  sessions bigint not null default 0 check (sessions >= 0 and sessions <= pageviews),
  primary key(day,device,channel)
);
create table if not exists public.site_traffic_sessions (
  day date not null,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  primary key(day,token_hash)
);
alter table public.site_traffic_daily enable row level security;
alter table public.site_traffic_sessions enable row level security;
revoke all on public.site_traffic_daily,public.site_traffic_sessions from public,anon,authenticated,service_role;
grant select,insert,update on public.site_traffic_daily to service_role;
grant select,insert,delete on public.site_traffic_sessions to service_role;
create or replace function public.expo_record_traffic(p_day date,p_token text,p_device text,p_channel text)
returns void language plpgsql security invoker set search_path=public as $$
declare fresh integer;
begin
  if p_day is null or p_day<>(now() at time zone 'Africa/Kinshasa')::date then raise exception 'INVALID_DAY'; end if;
  insert into public.site_traffic_sessions(day,token_hash) values(p_day,p_token) on conflict do nothing;
  get diagnostics fresh = row_count;
  insert into public.site_traffic_daily(day,device,channel,pageviews,sessions) values(p_day,p_device,p_channel,1,fresh)
  on conflict(day,device,channel) do update set pageviews=site_traffic_daily.pageviews+1,sessions=site_traffic_daily.sessions+fresh;
  delete from public.site_traffic_sessions where day<p_day;
end $$;
create or replace function public.expo_traffic_report(p_days integer)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare last_day date := (now() at time zone 'Africa/Kinshasa')::date; first_day date;
begin
  if p_days is null or p_days not in (7,30,90) then raise exception 'INVALID_PERIOD'; end if;
  first_day := last_day-(p_days-1);
  return jsonb_build_object('start',first_day,'end',last_day,'rows',
    coalesce((select jsonb_agg(to_jsonb(t) order by day,device,channel) from public.site_traffic_daily t where day between first_day and last_day),'[]'::jsonb),
    'registrations',coalesce((select jsonb_agg(to_jsonb(r) order by day) from (
      select (created at time zone 'Africa/Kinshasa')::date as day,count(*) as total
      from public.applications where created >= (first_day::timestamp at time zone 'Africa/Kinshasa')
      and created < ((last_day+1)::timestamp at time zone 'Africa/Kinshasa')
      and coalesce(data->>'synthetic','false')<>'true' group by 1
    ) r),'[]'::jsonb));
end $$;
revoke execute on function public.expo_record_traffic(date,text,text,text), public.expo_traffic_report(integer) from public,anon,authenticated;
grant execute on function public.expo_record_traffic(date,text,text,text), public.expo_traffic_report(integer) to service_role;
