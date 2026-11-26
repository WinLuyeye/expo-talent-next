-- Run once in Supabase SQL editor (new project). All private access goes through server routes.
create table public.event_settings(id int primary key check(id=1), data jsonb not null);
insert into public.event_settings values(1,'{"categories":["Chant et musique","Danse et chorégraphie","Slam et poésie","Théâtre et humour","Mode et mannequinat","Dessin et peinture","Photographie et audiovisuel","Informatique et programmation","Innovation technologique","Entrepreneuriat","Art oratoire","Autres talents"],"promotions":[],"filieres":[],"departements":[],"vacations":[],"open":false,"date":"","deadline":"","venue":"","auditions":"","repetitions":"","program":"","announcements":"","email":"","whatsapp":"","social":"","rules":"","privacy":"","retention":""}'::jsonb);
create table public.admin_roles(id uuid primary key references auth.users(id) on delete cascade, role text not null check(role in ('owner','reviewer')));
create table public.applications(id text primary key, matricule text unique not null, email text not null, status text not null default 'Inscription reçue' check(status in ('Inscription reçue','En cours d’examen','Candidature acceptée','Candidature refusée','Participation confirmée')), created timestamptz not null default now(), data jsonb not null, attachment text, original_name text);
create index applications_email_idx on public.applications(email);
create table public.outbox(id uuid primary key default gen_random_uuid(),app_id text not null references public.applications(id) on delete cascade,recipient text not null,subject text not null,body text not null,state text not null default 'pending' check(state in ('pending','sending','sent','failed')),error text,created timestamptz not null default now(),updated timestamptz not null default now());
create table public.tracking_challenges(ref text primary key references public.applications(id) on delete cascade,hash text not null,expires timestamptz not null,attempts int not null default 0);
create table public.rate_limits(key text primary key, expires timestamptz not null, count int not null);
create table public.gallery(id uuid primary key default gen_random_uuid(),path text not null,caption text not null,kind text not null check(kind in ('image','video')),created timestamptz not null default now());
-- No anon/authenticated direct access, even when a user knows a row ID.
alter table public.event_settings enable row level security;
alter table public.admin_roles enable row level security;
alter table public.applications enable row level security;
alter table public.outbox enable row level security;
alter table public.tracking_challenges enable row level security;
alter table public.rate_limits enable row level security;
alter table public.gallery enable row level security;
revoke all on public.event_settings,public.admin_roles,public.applications,public.outbox,public.tracking_challenges,public.rate_limits,public.gallery from anon,authenticated;
grant all on public.event_settings,public.admin_roles,public.applications,public.outbox,public.tracking_challenges,public.rate_limits,public.gallery to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('expo-private','expo-private',false,3145728,array['image/jpeg','image/png','image/webp','application/pdf']),('expo-gallery','expo-gallery',true,3145728,array['image/jpeg','image/png','image/webp']);
-- No storage write/read policies for private files; service role creates short-lived URLs after auth.
create function public.expo_limit(p_key text,p_max int,p_seconds int) returns boolean language plpgsql set search_path=public as $$
declare n int; begin
insert into rate_limits(key,expires,count) values(p_key,now()+make_interval(secs=>p_seconds),1) on conflict(key) do update set count=case when rate_limits.expires<=now() then 1 else rate_limits.count+1 end, expires=case when rate_limits.expires<=now() then excluded.expires else rate_limits.expires end returning count into n;
return n<=p_max; end $$;
create function public.expo_register(p_id text,p_data jsonb,p_attachment text,p_original text,p_subject text,p_body text) returns uuid language plpgsql set search_path=public as $$
declare s jsonb; m uuid; begin
select data into s from event_settings where id=1 for share;
if not coalesce((s->>'open')::boolean,false) or (coalesce(s->>'deadline','')<>'' and (s->>'deadline')::timestamptz<=now()) then raise exception 'REGISTRATION_CLOSED'; end if;
insert into applications(id,matricule,email,data,attachment,original_name) values(p_id,p_data->>'matricule',p_data->>'email',p_data,p_attachment,p_original);
insert into outbox(app_id,recipient,subject,body) values(p_id,p_data->>'email',p_subject,p_body) returning id into m; return m; end $$;
create function public.expo_status(p_id text,p_status text,p_subject text,p_body text) returns uuid language plpgsql set search_path=public as $$
declare a applications%rowtype; m uuid; begin
select * into a from applications where id=p_id for update;
if not found then raise exception 'NOT_FOUND'; end if;
if a.status=p_status then return null; end if;
update applications set status=p_status where id=p_id;
if p_subject<>'' then insert into outbox(app_id,recipient,subject,body) values(p_id,a.email,p_subject,p_body) returning id into m; end if;
return m; end $$;
create function public.expo_verify(p_ref text,p_hash text) returns boolean language plpgsql set search_path=public as $$
declare c tracking_challenges%rowtype; begin
select * into c from tracking_challenges where ref=p_ref for update;
if not found or c.expires<=now() or c.attempts>=5 then return false; end if;
if c.hash=p_hash then delete from tracking_challenges where ref=p_ref; return true; end if;
update tracking_challenges set attempts=attempts+1 where ref=p_ref; return false; end $$;
revoke execute on function public.expo_limit(text,int,int),public.expo_register(text,jsonb,text,text,text,text),public.expo_status(text,text,text,text),public.expo_verify(text,text) from public,anon,authenticated;
grant execute on function public.expo_limit(text,int,int),public.expo_register(text,jsonb,text,text,text,text),public.expo_status(text,text,text,text),public.expo_verify(text,text) to service_role;
