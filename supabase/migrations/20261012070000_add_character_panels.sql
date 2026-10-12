create table if not exists public.progress_character_panels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  panel jsonb not null default '{}'::jsonb check (jsonb_typeof(panel) = 'object'),
  version integer not null default 1,
  assessed_at timestamptz,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress_character_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  panel jsonb not null check (jsonb_typeof(panel) = 'object'),
  source_reference text,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

alter table public.progress_character_panels enable row level security;
alter table public.progress_character_history enable row level security;
revoke all on public.progress_character_panels, public.progress_character_history from public, anon, authenticated;

create or replace function public.progress_character_api(p_token text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cfg private_progress.app_auth%rowtype; current_row public.progress_character_panels%rowtype; next_version integer;
begin
  select * into cfg from private_progress.app_auth where id = true;
  if cfg.token_hash is null or cfg.token_expires_at < now() or cfg.token_hash <> encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex') then raise exception 'Invalid or expired session'; end if;
  if p_action = 'read' then
    return coalesce((select panel || jsonb_build_object('_version', version, '_assessed_at', assessed_at, '_source_reference', source_reference) from public.progress_character_panels where user_id = cfg.owner_id), '{}'::jsonb);
  elsif p_action = 'upsert' then
    if jsonb_typeof(p_payload->'panel') <> 'object' then raise exception 'panel must be an object'; end if;
    select * into current_row from public.progress_character_panels where user_id = cfg.owner_id for update;
    next_version := coalesce(current_row.version, 0) + 1;
    if current_row.user_id is not null then insert into public.progress_character_history(user_id, version, panel, source_reference) values(cfg.owner_id, current_row.version, current_row.panel, current_row.source_reference) on conflict do nothing; end if;
    insert into public.progress_character_panels(user_id, panel, version, assessed_at, source_reference) values(cfg.owner_id, p_payload->'panel', next_version, coalesce((p_payload->>'assessed_at')::timestamptz, now()), nullif(p_payload->>'source_reference',''))
    on conflict(user_id) do update set panel=excluded.panel, version=excluded.version, assessed_at=excluded.assessed_at, source_reference=excluded.source_reference, updated_at=now();
    return jsonb_build_object('ok', true, 'version', next_version);
  else raise exception 'Unsupported action'; end if;
end; $$;

revoke execute on function public.progress_character_api(text,text,jsonb) from public, authenticated;
grant execute on function public.progress_character_api(text,text,jsonb) to anon;
