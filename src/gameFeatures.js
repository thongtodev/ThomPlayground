import {migrateOnetScores,totalOnetScore} from './onetRewards.js';
import {normalizeAlbum} from './albumUtils';
import {CLOUD, request, validSession} from './assetStore';
import {recordPuzzleLevelCompletion,countCollectedPuzzleImages,recordJigsawLevelCompletion,countCollectedJigsawImages} from './puzzleProgress';

const KEY='thom-game-features-v12';
export const DEFAULT_REWARDS = [
 {id:'miner-first',title:'Mẻ dép đầu tiên',description:'Qua một Level Đào Dép Đi!',game:'miner',metric:'miner_wins',target:1,icon:'slipper',tier:'bronze'},
 {id:'miner-master',title:'Thợ đào nhà Thơm',description:'Hoàn thành Level 10 Đào Dép Đi!',game:'miner',metric:'miner_level_10',target:1,icon:'trophy',tier:'legendary'},
 {id:'miner-three-stars',title:'Móc vàng',description:'Hoàn thành một Level Đào Dép Đi! với 3 sao',game:'miner',metric:'miner_three_stars',target:1,icon:'star',tier:'gold'},

 {id:'mines-first',title:'Thoát hiểm',description:'Thắng Dò mìn lần đầu',game:'mines',metric:'mines_wins',target:1,icon:'flag',tier:'bronze'},
 {id:'mines-hard',title:'Chuyên gia dò mìn',description:'Thắng Dò mìn mức Khó hoặc Chuyên gia',game:'mines',metric:'mines_hard_wins',target:1,icon:'gem',tier:'gold'},
 {id:'mole-300',title:'Tay tặng dép siêu tốc',description:'Đạt 300 dép trong Tặng dép',game:'mole',metric:'mole_best',target:300,icon:'slipper',tier:'silver'},
 {id:'mole-500',title:'Cao thủ tặng dép',description:'Đạt 500 dép trong Tặng dép',game:'mole',metric:'mole_best',target:500,icon:'flame',tier:'gold'},
 {id:'tic-five',title:'Cao thủ Thơm X Thơm O',description:'Thắng chú Thơm 5 ván',game:'tic',metric:'tic_ai_wins',target:5,icon:'tic',tier:'silver'},
 {id:'tic-streak',title:'Bất bại',description:'Thắng chú Thơm 3 ván liên tiếp',game:'tic',metric:'tic_streak',target:3,icon:'crown',tier:'gold'},
 {id:'reaction-300',title:'Chớp mắt',description:'Phản xạ dưới 300 ms',game:'reaction',metric:'reaction_under_300',target:1,icon:'zap',tier:'silver'},
 {id:'reaction-200',title:'Tốc độ ánh sáng',description:'Phản xạ dưới 200 ms',game:'reaction',metric:'reaction_under_200',target:1,icon:'rocket',tier:'gold'},
 {id:'puzzle-3',title:'Mảnh ghép đầu tiên',description:'Hoàn thành một Level Ghép Thơm Đi! ở cấp độ Dễ',game:'puzzle',metric:'puzzle_3_wins',target:1,icon:'puzzle',tier:'bronze'},
 {id:'puzzle-4',title:'Bậc thầy ghép hình',description:'Hoàn thành một Level Ghép Thơm Đi! ở cấp độ Khó 5×5',game:'puzzle',metric:'puzzle_5_wins',target:1,icon:'trophy',tier:'gold'},
 {id:'puzzle-collector-5',title:'Nhà sưu tập Thơm',description:'Hoàn thành 5 hình khác nhau trong Ghép Thơm Đi!',game:'puzzle',metric:'puzzle_images_collected',target:5,icon:'book',tier:'gold'},
 {id:'onet-first',title:'Bắt đầu kết nối',description:'Thắng Level đầu tiên của Nối Thơm Đi!',game:'onet',metric:'onet_wins',target:1,icon:'link',tier:'bronze'},
 {id:'onet-five',title:'Chinh phục Level 5',description:'Hoàn thành Level 5 Nối Thơm Đi!',game:'onet',metric:'onet_level_5',target:1,icon:'star',tier:'silver'},
 {id:'onet-ten',title:'Vua nối hình',description:'Chinh phục Level 10 Nối Thơm Đi!',game:'onet',metric:'onet_level_10',target:1,icon:'crown',tier:'legendary'},
 {id:'onet-nohint',title:'Mắt tinh như cú',description:'Thắng một Level không dùng gợi ý',game:'onet',metric:'onet_no_hint',target:1,icon:'eye',tier:'gold'},
 {id:'onet-score',title:'Siêu sao kết nối',description:'Đạt 3.000 dép trong một Level',game:'onet',metric:'onet_best',target:3000,icon:'target',tier:'silver'},
 {id:'connect4-first',title:'Bốn quân một hàng',description:'Thắng một ván Bốn Quân Nhà Thơm',game:'connect4',metric:'connect4_wins',target:1,icon:'grid',tier:'bronze'},
 {id:'connect4-master',title:'Chiến thuật gia',description:'Thắng chú Thơm 10 ván Bốn Quân Nhà Thơm',game:'connect4',metric:'connect4_ai_wins',target:10,icon:'brain',tier:'gold'},
 {id:'simon-first',title:'Nhớ lời đầu tiên',description:'Hoàn thành thử thách Nhớ Lời Thơm mức Dễ',game:'simon',metric:'simon_easy_wins',target:1,icon:'brain',tier:'silver'},
 {id:'simon-perfect',title:'Trí nhớ siêu phàm',description:'Ghi nhớ đủ 20 tín hiệu ở mức Khó',game:'simon',metric:'simon_hard_wins',target:1,icon:'gem',tier:'legendary'},
 {id:'jigsaw-first',title:'Mảnh ghép đầu tiên',description:'Hoàn thành một Level Mảnh Ghép Nhà Thơm',game:'jigsaw',metric:'jigsaw_wins',target:1,icon:'puzzle',tier:'bronze'},
 {id:'jigsaw-hard',title:'Bậc thầy lắp ghép',description:'Hoàn thành một Level Mảnh Ghép Nhà Thơm ở cấp độ Khó 5×5',game:'jigsaw',metric:'jigsaw_hard_wins',target:1,icon:'trophy',tier:'gold'},
 {id:'puzzle-collector-15',title:'Bộ sưu tập Ghép Thơm · 15',description:'Hoàn thành 15 ảnh khác nhau trong Ghép Thơm',game:'puzzle',metric:'puzzle_images_collected',target:15,icon:'book',tier:'silver'},
 {id:'puzzle-collector-30',title:'Bộ sưu tập Ghép Thơm · 30',description:'Hoàn thành 30 ảnh khác nhau trong Ghép Thơm',game:'puzzle',metric:'puzzle_images_collected',target:30,icon:'book',tier:'gold'},
 {id:'onet-collector-10',title:'Bộ sưu tập Nối Thơm · 10',description:'Mở 10 ảnh khác nhau trong Nối Thơm',game:'onet',metric:'onet_images_collected',target:10,icon:'book',tier:'bronze'},
 {id:'onet-collector-30',title:'Bộ sưu tập Nối Thơm · 30',description:'Mở 30 ảnh khác nhau trong Nối Thơm',game:'onet',metric:'onet_images_collected',target:30,icon:'book',tier:'silver'},
 {id:'onet-collector-60',title:'Bộ sưu tập Nối Thơm · 60',description:'Mở 60 ảnh khác nhau trong Nối Thơm',game:'onet',metric:'onet_images_collected',target:60,icon:'book',tier:'gold'},
 {id:'jigsaw-collector-5',title:'Bộ sưu tập Mảnh Ghép Nhà Thơm · 5',description:'Hoàn thành 5 ảnh khác nhau trong Mảnh Ghép Nhà Thơm',game:'jigsaw',metric:'jigsaw_images_collected',target:5,icon:'book',tier:'bronze'},
 {id:'jigsaw-collector-15',title:'Bộ sưu tập Mảnh Ghép Nhà Thơm · 15',description:'Hoàn thành 15 ảnh khác nhau trong Mảnh Ghép Nhà Thơm',game:'jigsaw',metric:'jigsaw_images_collected',target:15,icon:'book',tier:'silver'},
 {id:'jigsaw-collector-30',title:'Bộ sưu tập Mảnh Ghép Nhà Thơm · 30',description:'Hoàn thành 30 ảnh khác nhau trong Mảnh Ghép Nhà Thơm',game:'jigsaw',metric:'jigsaw_images_collected',target:30,icon:'book',tier:'gold'},
 {id:'simon-medium',title:'Trí nhớ bền bỉ',description:'Hoàn thành 15 vòng ở mức Trung bình',game:'simon',metric:'simon_medium_wins',target:1,icon:'brain',tier:'gold'},
 {id:'onet-fifteen',title:'Bậc thầy đổi hướng',description:'Thắng Level 15',game:'onet',metric:'onet_level_15',target:1,icon:'star',tier:'gold'},
 {id:'onet-twenty',title:'Chinh phục 20 Level',description:'Thắng Level 20',game:'onet',metric:'onet_level_20',target:1,icon:'crown',tier:'legendary'},
 {id:'onet-total',title:'Kho dép nhà Thơm',description:'Đạt tổng 30.000 dép từ kỷ lục các Level',game:'onet',metric:'onet_total',target:30000,icon:'trophy',tier:'gold'},
 {id:'onet-eight',title:'Chinh phục Level 8',description:'Thắng Level 8 trở lên',game:'onet',metric:'onet_level_8',target:1,icon:'star',tier:'gold'},
 {id:'all-nine',title:'Fan cứng chú Thơm',description:'Hoàn thành cả 9 trò chơi',game:'all',metric:'active_games_completed',target:9,icon:'sparkles',tier:'legendary'}
];
export const METRICS = [
 ['miner_wins','Số Level Đào Dép đã thắng'],['miner_level_10','Số lần thắng Level 10 Đào Dép'],['miner_three_stars','Số màn Đào Dép đạt 3 sao'],
 ['onet_level_15','Số lần thắng Level 15'],['onet_level_20','Số lần thắng Level 20'],['onet_total','Tổng kỷ lục Nối Thơm'],
 ['active_games_completed','Số trò đang mở đã hoàn thành'],['onet_level_8','Số lần thắng Level 8 trở lên'],['connect4_ai_wins','Số lần thắng chú Thơm ở Bốn Quân'],['onet_images_collected','Số ảnh Nối Thơm đã mở'],['simon_medium_wins','Số lần hoàn thành Simon mức Trung bình'],
 ['mines_wins','Số lần thắng Dò mìn'],['mines_hard_wins','Số lần thắng Dò mìn Khó/Chuyên gia'],
 ['mole_best','Dép Tặng dép cao nhất'],['tic_ai_wins','Số lần thắng chú Thơm'],['tic_streak','Chuỗi thắng chú Thơm liên tiếp'],
 ['reaction_under_300','Số lần phản xạ dưới 300 ms'],['reaction_under_200','Số lần phản xạ dưới 200 ms'],
 ['puzzle_3_wins','Số lần hoàn thành cấp độ Dễ'],['puzzle_4_wins','Số lần giải 4×4 (thống kê cũ)'],['puzzle_5_wins','Số lần hoàn thành cấp độ Khó 5×5'],['puzzle_images_collected','Số hình Ghép Thơm Đi! đã hoàn thành'],
 ['onet_wins','Số Level Nối Thơm Đi! đã thắng'],['onet_level_5','Số lần thắng Level 5 trở lên'],['onet_level_10','Số lần thắng Level 10'],['onet_no_hint','Số Level thắng không dùng gợi ý'],['onet_best','Dép Nối Thơm Đi! cao nhất'],['connect4_wins','Số ván thắng Bốn Quân Nhà Thơm'],['simon_wins','Số lần hoàn thành Nhớ Lời Thơm'],['simon_easy_wins','Số lần hoàn thành Nhớ Lời Thơm mức Dễ'],['simon_hard_wins','Số lần hoàn thành Nhớ Lời Thơm mức Khó'],['simon_best','Số vòng Nhớ Lời Thơm cao nhất'],['jigsaw_wins','Số màn Mảnh Ghép Nhà Thơm đã hoàn thành'],['jigsaw_hard_wins','Số màn Mảnh Ghép Nhà Thơm mức Khó đã hoàn thành'],['jigsaw_images_collected','Số hình Mảnh Ghép Nhà Thơm đã mở khóa trong Collection'],['games_completed','Số game đã hoàn thành']
];
export const DEFAULT_CONFIG={rewards:DEFAULT_REWARDS,radio:{title:'Thơm Radio',youtubeUrl:'',enabled:true},puzzleAlbum:[],moleAppearance:{characterScale:125,boardWidth:680},onetAlbum:[],jigsawAlbum:[],minerAlbum:[],unoAssets:{},gameAvailability:{mines:true,mole:true,tic:true,reaction:true,puzzle:true,onet:true,connect4:true,simon:true,jigsaw:true,miner:true,uno:true}};
export const getProgress=()=>{try{const p=JSON.parse(localStorage.getItem('thom-progress-v12'))||{};const unlocked={...(p.unlocked||{})};delete unlocked['all-six'];return {...p,metrics:p.metrics||{},completed:p.completed||[],unlocked,puzzleCollection:p.puzzleCollection||{},jigsawCollection:p.jigsawCollection||{}};}catch{return {metrics:{},completed:[],unlocked:{},puzzleCollection:{},jigsawCollection:{}};}};
const saveProgress=p=>localStorage.setItem('thom-progress-v12',JSON.stringify(p));
export const mergeConfig=c=>{
 const availability={...DEFAULT_CONFIG.gameAvailability,...c?.gameAvailability};
 const active=Object.keys(DEFAULT_CONFIG.gameAvailability).filter(id=>id!=='uno'&&availability[id]!==false);
 const existing=Array.isArray(c?.rewards)?c.rewards:DEFAULT_REWARDS;
 const rewards=existing.filter(r=>r.id!=='all-five').map(r=>{const {imageId,...clean}=r;const migratedId=clean.id==='all-six'?'all-nine':clean.id;const preset=DEFAULT_REWARDS.find(x=>x.id===migratedId);return {...(preset||{}),...clean,description:String(clean.description||preset?.description||'').replace(/điểm/gi,'dép'),title:String(clean.title||preset?.title||'').replace(/điểm/gi,'dép'),id:migratedId,icon:clean.icon||preset?.icon||'medal',tier:clean.tier||preset?.tier||'bronze'};});
 // Add new-game achievements to an existing Supabase project without replacing customized rewards.
 for(const r of DEFAULT_REWARDS.filter(r=>['onet','connect4','simon','jigsaw','miner'].includes(r.game)||r.id==='all-nine'))if(!rewards.some(x=>x.id===r.id))rewards.push({...r});
 for(const r of DEFAULT_REWARDS.filter(r=>r.id.startsWith('puzzle-collector-')))if(!rewards.some(x=>x.id===r.id))rewards.push({...r});
 for(const reward of rewards){
  const preset=DEFAULT_REWARDS.find(item=>item.id===reward.id);
  if(reward.id==='all-nine')Object.assign(reward,{metric:'active_games_completed',target:active.length,description:`Hoàn thành cả ${active.length} trò chơi đang mở`});
  if(reward.id==='connect4-master'&&reward.metric==='connect4_wins')Object.assign(reward,{metric:preset.metric,description:preset.description,target:10});
  if(reward.id==='jigsaw-first'&&reward.description.includes('Dễ'))reward.description=preset.description;
  if(reward.id==='mole-500'&&reward.title==='Vua combo')reward.title=preset.title;
  if(reward.id==='onet-score'&&Number(reward.target)===4000){reward.target=preset.target;reward.description=preset.description;}
  if(reward.id==='onet-five'&&reward.title==='Nửa đường chinh phục')reward.title=preset.title;
  if(reward.id==='onet-score'&&reward.tier==='gold')reward.tier='silver';
 }
 const hardPuzzleReward=rewards.find(r=>r.id==='puzzle-4');if(hardPuzzleReward&&hardPuzzleReward.metric==='puzzle_4_wins'){hardPuzzleReward.metric='puzzle_5_wins';if(hardPuzzleReward.description==='Hoàn thành xếp hình 4×4')hardPuzzleReward.description='Hoàn thành một Level Ghép Thơm Đi! ở cấp độ Khó 5×5';}
 return {...DEFAULT_CONFIG,...c,rewards,radio:{...DEFAULT_CONFIG.radio,...c?.radio},puzzleAlbum:normalizeAlbum(c?.puzzleAlbum),onetAlbum:normalizeAlbum(c?.onetAlbum),jigsawAlbum:normalizeAlbum(c?.jigsawAlbum),minerAlbum:normalizeAlbum(c?.minerAlbum,10),moleAppearance:{...DEFAULT_CONFIG.moleAppearance,...c?.moleAppearance},gameAvailability:{...DEFAULT_CONFIG.gameAvailability,...c?.gameAvailability}};
};
export async function loadGameConfig(){
 if(CLOUD){const rows=await request('/rest/v1/game_settings?select=key,value');return mergeConfig(Object.fromEntries(rows.map(r=>[r.key,r.value])));}
 try{return mergeConfig(JSON.parse(localStorage.getItem(KEY))||{});}catch{return DEFAULT_CONFIG;}
}
export async function saveGameSetting(key,value){
 if(!['rewards','radio','puzzleAlbum','moleAppearance','gameAvailability','onetAlbum','jigsawAlbum','minerAlbum','unoAssets'].includes(key))throw new Error('Thiết lập không hợp lệ');
 if(CLOUD){const s=validSession();if(!s)throw new Error('Phiên đăng nhập hết hạn');await request('/rest/v1/game_settings?on_conflict=key',{method:'POST',token:s.access_token,body:JSON.stringify({key,value}),extraHeaders:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'}});return;}
 if(!import.meta.env.DEV)throw new Error('Cần kết nối Supabase để quản trị bản public');
 const c=await loadGameConfig();localStorage.setItem(KEY,JSON.stringify({...c,[key]:value}));
}
export function trackEvent(old,event,rewards,activeIds=Object.keys(DEFAULT_CONFIG.gameAvailability).filter(id=>id!=='uno')){
 const p={...old,metrics:{...(old.metrics||{})},completed:[...(old.completed||[])],unlocked:{...(old.unlocked||{})},puzzleCollection:{...(old.puzzleCollection||{})},jigsawCollection:{...(old.jigsawCollection||{})}};
 const increment=k=>{p.metrics[k]=(p.metrics[k]||0)+1;};
 const max=(k,v)=>{p.metrics[k]=Math.max(p.metrics[k]||0,v);};
 if(event.type==='mines_win'){increment('mines_wins');if(['hard','expert'].includes(event.level))increment('mines_hard_wins');}
 if(event.type==='mole_finish')max('mole_best',event.score);
 if(event.type==='tic_finish'){
   if(event.mode==='ai'&&event.won){increment('tic_ai_wins');max('tic_streak',(p.metrics._tic_current_streak||0)+1);p.metrics._tic_current_streak=(p.metrics._tic_current_streak||0)+1;}
   else if(event.mode==='ai')p.metrics._tic_current_streak=0;
 }
 if(event.type==='reaction_finish'&&Number.isFinite(event.best)&&event.best>0){if(event.best<300)increment('reaction_under_300');if(event.best<200)increment('reaction_under_200');}
 if(event.type==='puzzle_win'){if(event.n===3)increment('puzzle_3_wins');if(event.n===4)increment('puzzle_4_wins');}
 if(event.type==='puzzle_level_win'){
  if(event.difficulty==='easy'||event.n===3)increment('puzzle_3_wins');
  if(event.n===4)increment('puzzle_4_wins');
  if(event.difficulty==='hard'||event.n===5)increment('puzzle_5_wins');
  p.puzzleCollection=recordPuzzleLevelCompletion(p.puzzleCollection,event);
  p.metrics.puzzle_images_collected=countCollectedPuzzleImages(p.puzzleCollection);
 }
 if(event.type==='onet_win'){max('onet_images_collected',event.collected||0);increment('onet_wins');max('onet_total',event.total||0);if(event.level===15)increment('onet_level_15');if(event.level===20)increment('onet_level_20');if(event.level>=5)increment('onet_level_5');if(event.level>=8)increment('onet_level_8');if(event.level===10)increment('onet_level_10');if(event.noHint)increment('onet_no_hint');max('onet_best',event.score);}
 if(event.type==='miner_finish'&&event.won){increment('miner_wins');if(event.level===10)increment('miner_level_10');if(event.stars===3)increment('miner_three_stars');}
 if(event.type==='connect4_finish'&&event.won){increment('connect4_wins');if(event.mode==='ai')increment('connect4_ai_wins');}
 if(event.type==='simon_finish'){max('simon_best',event.score||0);if(event.won){increment('simon_wins');if(event.difficulty==='medium')increment('simon_medium_wins');if(event.difficulty==='easy')increment('simon_easy_wins');if(event.difficulty==='hard')increment('simon_hard_wins');}}
 if(event.type==='jigsaw_finish'){increment('jigsaw_wins');if(event.size===5)increment('jigsaw_hard_wins');}
 if(event.type==='jigsaw_level_win'){increment('jigsaw_wins');if(event.difficulty==='hard'||event.n===5)increment('jigsaw_hard_wins');p.jigsawCollection=recordJigsawLevelCompletion(p.jigsawCollection,event);p.metrics.jigsaw_images_collected=countCollectedJigsawImages(p.jigsawCollection);}
 if(event.completed&& !p.completed.includes(event.completed))p.completed.push(event.completed);
 p.metrics.games_completed=p.completed.length;
 p.metrics.active_games_completed=activeIds.filter(id=>p.completed.includes(id)).length;
 if(p.metrics.active_games_completed<activeIds.length||!activeIds.length)delete p.unlocked['all-nine'];
 const unlockedNow=[];
 for(const r of rewards){if(r.id==='all-nine'&&!activeIds.length)continue;if((p.metrics[r.metric]||0)>=Number(r.target)&&!p.unlocked[r.id]){p.unlocked[r.id]=new Date().toISOString();unlockedNow.push(r);}}
 saveProgress(p);return {progress:p,unlockedNow};
}
export function reconcileProgress(old,config,history){
 const p={...old,metrics:{...old.metrics},unlocked:{...old.unlocked}};
 if(!p.revisedAchievements){
  // Each old finish event counted a zero even when all taps were missed.
  const invalidRuns=history.filter(run=>run.gameId==='reaction'&&run.details?.validRounds===0&&run.details?.best===0).length;
  if(invalidRuns){
   for(const limit of [200,300]){
    const metric='reaction_under_'+limit;
    p.metrics[metric]=Math.max(0,(p.metrics[metric]||0)-invalidRuns);
    if(!p.metrics[metric])delete p.unlocked['reaction-'+limit];
   }
  }
  const aiWins=history.filter(run=>run.gameId==='connect4'&&run.eligible&&run.details?.mode==='ai');
  p.metrics.connect4_ai_wins=aiWins.length;
  if(aiWins.length<10)delete p.unlocked['connect4-master'];
  const simon=history.filter(run=>run.gameId==='simon');
  p.metrics.simon_best=Math.max(p.metrics.simon_best||0,...simon.map(run=>Number(run.metricValue)||0));
  p.metrics.simon_medium_wins=simon.filter(run=>run.details?.success&&run.details?.difficulty==='medium').length;
  for(const key of ['puzzleCollection','jigsawCollection']){
   p[key]=Object.fromEntries(Object.entries(p[key]||{}).map(([id,{name,...record}])=>[id,record]));
  }
  p.revisedAchievements=true;
 }
 p.metrics.puzzle_images_collected=countCollectedPuzzleImages(p.puzzleCollection);
 p.metrics.jigsaw_images_collected=countCollectedJigsawImages(p.jigsawCollection);
 try{
  const saved=migrateOnetScores();
  p.metrics.onet_best=Math.max(0,...Object.values(saved.best));
  p.metrics.onet_total=totalOnetScore(saved.best);
  for(const level of [5,10,15,20])if(saved.best[level])p.metrics['onet_level_'+level]=Math.max(1,p.metrics['onet_level_'+level]||0);
  if(Array.isArray(saved?.collection))p.metrics.onet_images_collected=new Set(saved.collection.filter(Boolean)).size;
  if(Object.keys(saved?.best||{}).some(level=>Number(level)>=8))p.metrics.onet_level_8=Math.max(1,p.metrics.onet_level_8||0);
 }catch{}
 const active=Object.keys(DEFAULT_CONFIG.gameAvailability).filter(id=>id!=='uno'&&config.gameAvailability[id]!==false);
 return trackEvent(p,{},config.rewards,active).progress;
}
export function youtubeEmbed(url){
 try{
  const u=new URL(url);const host=u.hostname.replace(/^www\./,'').toLowerCase();
  if(host==='youtube.com'||host==='m.youtube.com'||host==='music.youtube.com'){
   const list=u.searchParams.get('list');if(list&&/^[\w-]{10,}$/.test(list))return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`;
   const id=u.searchParams.get('v')||(u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.pathname.startsWith('/embed/')?u.pathname.split('/')[2]:'');
   if(id&&/^[\w-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if(host==='youtu.be'){const list=u.searchParams.get('list');if(list&&/^[\w-]{10,}$/.test(list))return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(list)}`;const id=u.pathname.slice(1);if(/^[\w-]{11}$/.test(id))return `https://www.youtube-nocookie.com/embed/${id}`;}
 }catch{}return '';
}
