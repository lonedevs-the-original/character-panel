create or replace function public.progress_character_api(p_token text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cfg private_progress.app_auth%rowtype; current_row public.progress_character_panels%rowtype; next_version integer; item jsonb; prog jsonb;
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
    insert into public.progress_character_panels(user_id,panel,version,assessed_at,source_reference) values(cfg.owner_id,p_payload->'panel',next_version,coalesce((p_payload->>'assessed_at')::timestamptz,now()),nullif(p_payload->>'source_reference','')) on conflict(user_id) do update set panel=excluded.panel,version=excluded.version,assessed_at=excluded.assessed_at,source_reference=excluded.source_reference,updated_at=now();
    for item in select value from jsonb_array_elements(coalesce(p_payload->'attributes','[]'::jsonb)) loop
      if (item->>'score')::numeric < 0 or coalesce((item->>'max_score')::numeric,100) <= 0 or (item->>'score')::numeric > coalesce((item->>'max_score')::numeric,100) then raise exception 'Invalid attribute score'; end if;
      update public.progress_attributes set score=(item->>'score')::numeric,max_score=coalesce((item->>'max_score')::numeric,max_score),updated_at=now() where user_id=cfg.owner_id and lower(name)=lower(item->>'name');
      if not found then raise exception 'Unknown attribute: %', item->>'name'; end if;
    end loop;
    prog := coalesce(p_payload->'progression','{}'::jsonb);
    update public.progress_profiles set level=coalesce((prog->>'level')::integer,level),xp=coalesce((prog->>'xp')::integer,xp),active_arc=coalesce(nullif(prog->>'active_arc',''),active_arc),title=coalesce(nullif(prog->>'title',''),title),updated_at=now() where user_id=cfg.owner_id;
    return jsonb_build_object('ok',true,'version',next_version,'attributes_updated',jsonb_array_length(coalesce(p_payload->'attributes','[]'::jsonb)));
  else raise exception 'Unsupported action'; end if;
end; $$;
revoke execute on function public.progress_character_api(text,text,jsonb) from public, authenticated;
grant execute on function public.progress_character_api(text,text,jsonb) to anon;
