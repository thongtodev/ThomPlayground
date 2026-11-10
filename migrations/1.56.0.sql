BEGIN;
-- One-time cleanup of the exact retired-image runs in the 2026-11-06 snapshot.
WITH retired(id,game_id,variant) AS (VALUES
 (5, 'puzzle', '17d4fe55-9e6d-49a1-ac70-ea239665d71e-easy'),
 (11, 'puzzle', '7295b8b8-c722-4eed-b002-0acee679da74-easy'),
 (22, 'puzzle', '7295b8b8-c722-4eed-b002-0acee679da74-easy'),
 (24, 'jigsaw', '681cb479-4dfd-433d-94ec-a22374229362-easy'),
 (31, 'puzzle', '65d8505d-55c7-4819-8b4c-b7e5fd83b826-easy'),
 (52, 'puzzle', 'a36c691c-5455-483e-b908-a280d8618c33-easy'),
 (56, 'puzzle', '7295b8b8-c722-4eed-b002-0acee679da74-easy'),
 (60, 'jigsaw', '681cb479-4dfd-433d-94ec-a22374229362-easy'),
 (65, 'jigsaw', '681cb479-4dfd-433d-94ec-a22374229362-hard'),
 (71, 'puzzle', 'f6e362d5-84d3-46fe-bcc9-6ca890860390-easy'),
 (72, 'puzzle', '246e7eba-3585-46ed-8611-5656289988a8-easy'),
 (73, 'jigsaw', '681cb479-4dfd-433d-94ec-a22374229362-easy'),
 (83, 'jigsaw', '363191d7-ac1c-44de-a1f4-44e8d7249736-easy')
)
DELETE FROM public.game_leaderboards AS r
USING retired AS old, public.game_settings AS album
WHERE (r.id,r.game_id,r.variant)=(old.id,old.game_id,old.variant)
  AND album.key=r.game_id||'Album'
  AND jsonb_typeof(album.value)='array'
  AND NOT EXISTS (
    SELECT FROM jsonb_array_elements(album.value) e(item)
    WHERE coalesce(e.item->>'id',e.item#>>'{}')=regexp_replace(r.variant,'-(easy|hard)$','')
  );
-- Replace legacy photo captions without changing players, ranking keys or results.
WITH entries AS (
 SELECT replace(s.key,'Album','') AS game_id,
        coalesce(e.item->>'id',e.item#>>'{}') AS image_id, min(e.ord) AS ord
 FROM public.game_settings s
 CROSS JOIN LATERAL jsonb_array_elements(s.value) WITH ORDINALITY AS e(item,ord)
 JOIN public.game_images i ON i.id::text=coalesce(e.item->>'id',e.item#>>'{}')
 WHERE s.key IN ('puzzleAlbum','jigsawAlbum')
 GROUP BY 1,2
), levels AS (
 SELECT *,row_number() OVER(PARTITION BY game_id ORDER BY ord) AS num FROM entries
), labels AS (
 SELECT r.id,
 CASE WHEN l.num IS NOT NULL THEN 'Level '||lpad(l.num::text,greatest(2,length(l.num::text)),'0')
      WHEN r.variant LIKE 'default-thom-%' THEN CASE WHEN EXISTS (SELECT 1 FROM levels WHERE game_id=r.game_id) THEN 'Level mặc định' ELSE 'Level 01' END
      WHEN r.variant ~* '^[0-9a-f-]{36}-(easy|hard)$' THEN 'Level cũ #'||upper(right(regexp_replace(r.variant,'-(easy|hard)$',''),6))
      ELSE 'Level cũ' END ||
 CASE WHEN r.variant LIKE '%-hard' THEN ' · Khó' WHEN r.variant LIKE '%-easy' THEN ' · Dễ' ELSE '' END AS label
 FROM public.game_leaderboards r LEFT JOIN levels l
 ON l.game_id=r.game_id AND l.image_id=regexp_replace(r.variant,'-(easy|hard)$','')
 WHERE r.game_id IN ('puzzle','jigsaw')
)
UPDATE public.game_leaderboards r SET variant_label=labels.label,details=r.details-'imageName'
FROM labels WHERE r.id=labels.id AND (r.variant_label IS DISTINCT FROM labels.label OR r.details ? 'imageName');

COMMIT;
