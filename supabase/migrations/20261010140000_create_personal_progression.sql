-- Owner-locked personal progression schema.
create table if not exists public.progress_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Javohir',
  level integer not null default 1 check (level > 0),
  xp integer not null default 0 check (xp >= 0),
  active_arc text not null default 'Foundation',
  title text not null default 'The Observer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_attributes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text not null check (domain in ('physical','mental','intellectual','discipline','social','life')),
  score numeric not null default 0 check (score >= 0),
  max_score numeric not null default 100 check (max_score > 0),
  accent text not null default '#c9ff4a',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.progress_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  domain text not null check (domain in ('physical','mental','intellectual','discipline','social','life')),
  progress numeric not null default 0 check (progress >= 0),
  target numeric not null default 1 check (target > 0),
  unit text not null default 'times',
  status text not null default 'active' check (status in ('active','completed','archived')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('measurement','activity','milestone','habit_check','reflection','correction')),
  domain text not null check (domain in ('physical','mental','intellectual','discipline','social','life')),
  metric text,
  numeric_value numeric,
  unit text,
  summary text not null,
  confidence numeric not null default 1 check (confidence between 0 and 1),
  occurred_at timestamptz not null default now(),
  tags text[] not null default '{}',
  sensitive boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  source_reference text,
  suggested_effects jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists progress_entries_user_status_idx on public.progress_entries(user_id, status, occurred_at desc);
create index if not exists progress_quests_user_status_idx on public.progress_quests(user_id, status);

alter table public.progress_profiles enable row level security;
alter table public.progress_attributes enable row level security;
alter table public.progress_quests enable row level security;
alter table public.progress_entries enable row level security;

grant select, insert, update, delete on public.progress_profiles to authenticated;
grant select, insert, update, delete on public.progress_attributes to authenticated;
grant select, insert, update, delete on public.progress_quests to authenticated;
grant select, insert, update, delete on public.progress_entries to authenticated;

create policy "owner_full_access_profiles" on public.progress_profiles for all to authenticated
using ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid)
with check ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid);
create policy "owner_full_access_attributes" on public.progress_attributes for all to authenticated
using ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid)
with check ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid);
create policy "owner_full_access_quests" on public.progress_quests for all to authenticated
using ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid)
with check ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid);
create policy "owner_full_access_entries" on public.progress_entries for all to authenticated
using ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid)
with check ((select auth.uid()) = user_id and (select auth.uid()) = '3099b2b0-3ef4-484e-a4ac-d55fba1b6687'::uuid);

insert into public.progress_profiles (user_id, display_name, level, xp, active_arc, title)
values ('3099b2b0-3ef4-484e-a4ac-d55fba1b6687', 'Javohir', 1, 0, 'Foundation', 'The Observer')
on conflict (user_id) do nothing;

insert into public.progress_attributes (user_id, name, domain, score, accent, sort_order) values
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Strength','physical',10,'#c9ff4a',1),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Endurance','physical',10,'#6ee7ff',2),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Recovery','physical',10,'#ffca66',3),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Focus','mental',10,'#b7a1ff',4),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Knowledge','intellectual',10,'#7ce3b0',5),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Discipline','discipline',10,'#ff8fa3',6),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Communication','social',10,'#8fb7ff',7),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Stability','life',10,'#e0d49a',8)
on conflict (user_id, name) do nothing;

insert into public.progress_quests (user_id, title, domain, progress, target, unit) values
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Complete four training sessions','physical',0,4,'sessions'),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Record seven daily check-ins','discipline',0,7,'days'),
('3099b2b0-3ef4-484e-a4ac-d55fba1b6687','Finish one focused learning block','intellectual',0,1,'block');
