-- 1.61.5: expose public seating order for the turn diagram.
begin;
create or replace function uno_private.snapshot(r uno_private.rooms,p text) returns jsonb language plpgsql stable set search_path='' as $$
declare s jsonb:=r.state;players jsonb;legal jsonb;
begin
 select coalesce(jsonb_agg(v||jsonb_build_object('count',coalesce(jsonb_array_length(s->'hands'->(v->>'id')),0),'online',(v->>'seen')::timestamptz>now()-interval '30 seconds')),'[]') into players from jsonb_array_elements(r.players) v;
 select coalesce(jsonb_agg(v),'[]') into legal from jsonb_array_elements_text(coalesce(s->'hands'->p,'[]')) v where uno_private.legal(s,p,v);
 return jsonb_build_object('id',r.id,'code',r.code,'host',r.host,'capacity',r.capacity,'version',r.version,'players',players,'me',p,'status',coalesce(s->>'status','lobby'),'hand',coalesce(s->'hands'->p,'[]'),'legal',legal,'turn',s->>'turn','color',s->>'color','direction',s->'direction','order',coalesce(s->'order','[]'::jsonb),'top',s->'discard'->>(jsonb_array_length(s->'discard')-1),'drawCount',coalesce(jsonb_array_length(s->'deck'),0),'drew',s->'drew','pending',case when s->'pending'<>'null'::jsonb then jsonb_build_object('actor',s->'pending'->>'actor','target',s->'pending'->>'target') else null end,'unoTarget',s->>'uno_target','winner',s->>'winner','notice',s->>'notice','effect',s->>'effect','startedAt',s->>'started_at','endedAt',s->>'ended_at');
end;$$;

commit;
