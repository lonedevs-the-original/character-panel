create schema if not exists private_progress;
revoke all on schema private_progress from public, anon, authenticated;

create table if not exists private_progress.app_auth (
  id boolean primary key default true check (id),
  owner_id uuid not null references auth.users(id),
  email text not null,
  password_hash text not null,
  token_hash text,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
revoke all on private_progress.app_auth from public, anon, authenticated;

create or replace function public.progress_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg private_progress.app_auth%rowtype;
  raw_token text;
begin
  select * into cfg from private_progress.app_auth where id = true;
  if cfg.email is null or lower(cfg.email) <> lower(trim(p_email)) or cfg.password_hash <> extensions.crypt(p_password, cfg.password_hash) then
    perform pg_sleep(0.35);
    raise exception 'Invalid email or password';
  end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  update private_progress.app_auth set token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex'), token_expires_at = now() + interval '10 years', updated_at = now() where id = true;
  return jsonb_build_object('token', raw_token, 'expires_at', now() + interval '10 years');
end;
$$;

create or replace function public.progress_api(p_token text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg private_progress.app_auth%rowtype;
  entry jsonb;
  updated_row jsonb;
begin
  select * into cfg from private_progress.app_auth where id = true;
  if cfg.token_hash is null or cfg.token_expires_at < now() or cfg.token_hash <> encode(extensions.digest(coalesce(p_token,''), 'sha256'), 'hex') then
    raise exception 'Invalid or expired session';
  end if;

  if p_action = 'bootstrap' then
    return jsonb_build_object(
      'profile', (select to_jsonb(x) from (select user_id, display_name, level, xp, active_arc, title from public.progress_profiles where user_id = cfg.owner_id) x),
      'attributes', coalesce((select jsonb_agg(to_jsonb(x) order by sort_order) from (select id, name, domain, score, max_score, accent, sort_order from public.progress_attributes where user_id = cfg.owner_id) x), '[]'::jsonb),
      'quests', coalesce((select jsonb_agg(to_jsonb(x) order by created_at) from (select id, title, domain, progress, target, unit, status, due_date, created_at from public.progress_quests where user_id = cfg.owner_id and status <> 'archived') x), '[]'::jsonb),
      'entries', coalesce((select jsonb_agg(to_jsonb(x) order by occurred_at desc) from (select id, kind, domain, metric, numeric_value, unit, summary, confidence, occurred_at, tags, status, source_reference, suggested_effects from public.progress_entries where user_id = cfg.owner_id order by occurred_at desc limit 24) x), '[]'::jsonb)
    );
  elsif p_action = 'update_quest' then
    update public.progress_quests set progress = greatest(0, least(target, (p_payload->>'progress')::numeric)), status = case when (p_payload->>'progress')::numeric >= target then 'completed' else 'active' end, completed_at = case when (p_payload->>'progress')::numeric >= target then now() else null end, updated_at = now() where id = (p_payload->>'id')::uuid and user_id = cfg.owner_id returning to_jsonb(progress_quests.*) into updated_row;
    return coalesce(updated_row, '{}'::jsonb);
  elsif p_action = 'add_evidence' then
    insert into public.progress_entries(user_id, domain, kind, summary, metric, numeric_value, unit, confidence, occurred_at, tags, status, source_reference, suggested_effects)
    values(cfg.owner_id, p_payload->>'domain', p_payload->>'kind', p_payload->>'summary', nullif(p_payload->>'metric',''), nullif(p_payload->>'value','')::numeric, nullif(p_payload->>'unit',''), 1, now(), '{}', 'approved', 'direct entry', '[]');
    return jsonb_build_object('ok', true);
  elsif p_action = 'import_envelope' then
    for entry in select value from jsonb_array_elements(p_payload->'entries') loop
      insert into public.progress_entries(user_id, domain, kind, summary, metric, numeric_value, unit, confidence, occurred_at, tags, sensitive, status, source_reference, suggested_effects)
      values(cfg.owner_id, entry->>'domain', entry->>'kind', entry->>'summary', entry->>'metric', (entry->>'value')::numeric, entry->>'unit', coalesce((entry->>'confidence')::numeric,1), coalesce((entry->>'occurred_at')::timestamptz,now()), coalesce((select array_agg(value::text) from jsonb_array_elements_text(entry->'tags')),'{}'), coalesce((entry->>'sensitive')::boolean,false), 'pending', coalesce(p_payload#>>'{source,reference}','conversation import'), coalesce(p_payload->'suggested_effects','[]'));
    end loop;
    return jsonb_build_object('ok', true);
  elsif p_action = 'review_entry' then
    update public.progress_entries set status = p_payload->>'status', reviewed_at = now(), updated_at = now() where id = (p_payload->>'id')::uuid and user_id = cfg.owner_id;
    return jsonb_build_object('ok', true);
  else
    raise exception 'Unsupported action';
  end if;
end;
$$;

revoke all on function public.progress_login(text,text) from public;
revoke all on function public.progress_api(text,text,jsonb) from public;
grant execute on function public.progress_login(text,text) to anon;
grant execute on function public.progress_api(text,text,jsonb) to anon;
