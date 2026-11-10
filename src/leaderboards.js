import {randomId} from './uuid';
import {localRankings} from './gameRankings.js';
import {CLOUD, request} from './assetStore';
export {savePersonalRun,getPersonalHistory} from './personalHistory';

const NAME_KEY = 'thom-player-name-v1';
const PERSONAL_KEY = 'thom-personal-records-v1';
const LOCAL_BOARD_KEY = 'thom-local-leaderboards-v1';

export const getPlayerName = () => {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
};
export const setPlayerName = value => {
  const clean = String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24);
  try { localStorage.setItem(NAME_KEY, clean); } catch {}
  return clean;
};
const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
};
const isLowerBetter = kind => ['time', 'steps', 'reaction'].includes(kind);
const isBetter = (kind, next, current) => current == null || (isLowerBetter(kind) ? Number(next) < Number(current) : Number(next) > Number(current));

export function savePersonalBest(entry) {
  const all = readJson(PERSONAL_KEY, {});
  const layoutKey=entry.gameId==='jigsaw'&&entry.details?.layout==='board'?':board':'';
  const key = `${entry.gameId}:${entry.variant || 'default'}`+layoutKey;
  const previous = all[key];
  if (isBetter(entry.metricKind, entry.metricValue, previous?.metricValue)) {
    all[key] = {
      gameId: entry.gameId,
      variant: entry.variant || 'default',
      variantLabel: entry.variantLabel || 'Mặc định',
      metricKind: entry.metricKind,
      metricValue: Number(entry.metricValue),
      metricLabel: entry.metricLabel,
      achievedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(all)); } catch {}
  }
  return all[key] || null;
}
export function getPersonalBests(gameId) {
  const all = readJson(PERSONAL_KEY, {});
  return Object.values(all).filter(item => !gameId || item.gameId === gameId);
}


export function getPlayerId() {
  const key = 'thom-player-id-v1';
  let id = localStorage.getItem(key);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '')) {
    id = randomId();
    localStorage.setItem(key, id);
  }
  return id;
}
const rpc = (name, body) => request(`/rest/v1/rpc/${name}`, {
  method: 'POST', body: JSON.stringify(body), extraHeaders: {'Content-Type': 'application/json'},
});
export async function submitLeaderboardEntry(entry, playerName) {
  const name = setPlayerName(playerName);
  if (name.length < 2) throw new Error('Tên cần có ít nhất 2 ký tự.');
  const payload = {
    game_id: entry.gameId,
    player_id: getPlayerId(),
    variant: String(entry.variant || 'default').slice(0, 100),
    variant_label: String(entry.variantLabel || 'Mặc định').slice(0, 80),
    player_name: name,
    metric_kind: entry.metricKind,
    metric_value: Number(entry.metricValue),
    metric_label: String(entry.metricLabel || entry.metricValue).slice(0, 60),
    details: entry.details && typeof entry.details === 'object' ? entry.details : {},
  };
  if (!Number.isFinite(payload.metric_value) || payload.metric_value < 0 || payload.metric_value > 1000000000) throw new Error('Thành tích không hợp lệ.');
  if (!['score', 'time', 'steps', 'reaction', 'wins'].includes(payload.metric_kind)) throw new Error('Kiểu thành tích không hợp lệ.');
  if (CLOUD) {
    await request('/rest/v1/game_leaderboards', {
      method: 'POST',
      body: JSON.stringify(payload),
      extraHeaders: {'Content-Type': 'application/json', Prefer: 'return=minimal'},
    });
    return payload;
  }
  if (!import.meta.env.DEV) throw new Error('Bảng xếp hạng online chưa được kết nối.');
  const rows = readJson(LOCAL_BOARD_KEY, []);
  rows.push({...payload, id: randomId(), created_at: new Date().toISOString()});
  localStorage.setItem(LOCAL_BOARD_KEY, JSON.stringify(rows));
  return payload;
}

export async function loadGameRankings(gameId,album=[],viewer=getPlayerId()){
 if(CLOUD)return rpc('ranking_summary',{p_game:gameId,p_player:viewer});
 return localRankings(gameId,readJson(LOCAL_BOARD_KEY,[]),album,viewer).map(({breakdown,...summary})=>summary);
}

export async function loadRankingDetails(game,who,album=[],page=0){
 const offset=page*12;
 if(CLOUD&&game==='jigsaw')return rpc('jigsaw_detail_page',{p_who:who,p_offset:offset});
 if(CLOUD)return rpc('ranking_detail_page',{p_game:game,p_who:who,p_offset:offset});
 const records=readJson(LOCAL_BOARD_KEY,[]).filter(r=>r.game_id===game&&(r.player_id||'legacy:'+r.player_name.trim().toLowerCase())===who);
 const [player]=localRankings(game,records,album,who);
 const layouts=new Map();
 if(game==='jigsaw'){
  for(const r of records){
   if(r.metric_kind!=='steps'||!Number.isFinite(Number(r.metric_value))||r.metric_value<0)continue;
   const key=r.details?.layout==='board'?'board_best':'tray_best';
   const entry=layouts.get(r.variant)||{};
   entry[key]=Math.min(entry[key]??Infinity,Number(r.metric_value));layouts.set(r.variant,entry);
  }
 }
 const indices=new Map(album.map((img,i)=>[img.id,i]));
 const order=v=>(game==='onet'||game==='miner')?Number(v.slice(6)):indices.get(v.replace(/-(easy|hard)$/,''))??({easy:1,medium:2,hard:3,expert:4}[v]||0);
 return Object.entries(player?.breakdown||{}).sort(([a],[b])=>order(a)-order(b)||a.localeCompare(b,'vi',{numeric:true}))
  .slice(offset,offset+13).map(([variant,best])=>({variant,best,...layouts.get(variant)}));
}
