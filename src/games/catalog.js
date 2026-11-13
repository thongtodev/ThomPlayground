

const GAMES = [
  { id:'mines', icon:'bomb', name:'Dò mìn', en:'MINESWEEPER', desc:'Một bàn cờ đầy ô bí ẩn đang chờ bạn khám phá. Tìm hết ô an toàn và đừng chạm phải bom nhé!', level:'Tư duy', time:'3–8 phút', color:'peach' },
  { id:'mole', icon:'slipper', name:'Tặng dép', en:'DÉP TẶNG THƠM', desc:'Chú Thơm bất ngờ xuất hiện! Tặng dép thật nhanh, nhớ tránh chú Thơm mang bom nhé!', level:'Phản xạ', time:'30–60 giây', color:'yellow' },
  { id:'tic', icon:'tic', name:'Thơm X Thơm O', en:'TIC TAC TOE / CARO', desc:'X hay O đây? Đấu trí với chú Thơm hoặc rủ bạn bè cùng tranh tài trên bàn cờ nhé!', level:'Chiến thuật', time:'1–3 phút', color:'lavender' },
  { id:'reaction', icon:'zap', name:'Nhanh Tay Bắt Thơm', en:'REACTION TIME', desc:'Chú Thơm xuất hiện chớp nhoáng! Bạn có đủ nhanh tay và tinh mắt để bắt kịp không?', level:'Tốc độ', time:'30 giây', color:'mint' },
  { id:'puzzle', icon:'puzzle', name:'Ghép Thơm Đi!', en:'SLIDING PUZZLE', desc:'Bức hình của chú Thơm bị xáo trộn mất rồi! Hãy sắp xếp các ô để đưa mọi thứ về đúng chỗ nhé!', level:'Giải đố', time:'2–10 phút', color:'blue' },
  { id:'onet', icon:'link', name:'Nối Thơm Đi!', en:'ONET CONNECT', desc:'Tìm hai hình Thơm giống nhau, nối thật khéo và chinh phục đủ 20 Level trước khi hết giờ!', level:'Quan sát', time:'3–6 phút', color:'pink' },
  { id:'connect4', icon:'connect4', name:'Bốn Quân Nhà Thơm', en:'CONNECT FOUR', desc:'Một cuộc đấu trí bắt đầu! Thả quân thật khéo, nối đủ 4 quân và đừng để đối thủ vượt mặt nhé!', level:'Chiến thuật', time:'2–5 phút', color:'peach' },
  { id:'simon', icon:'brain', name:'Nhớ Lời Thơm', en:'SIMON SAYS', desc:'Chú Thơm sẽ phát tín hiệu theo một thứ tự bí mật. Bạn có nhớ và lặp lại chính xác được không?', level:'Trí nhớ', time:'1–3 phút', color:'mint' },
  { id:'jigsaw', icon:'puzzle', name:'Mảnh Ghép Nhà Thơm', en:'JIGSAW PUZZLE', desc:'Bức hình đã bị chia thành nhiều mảnh lộn xộn. Hãy xoay, kéo thả và ghép lại thật khéo nhé!', level:'Giải đố', time:'2–8 phút', color:'blue' },
  { id:'miner', icon:'slipper', name:'Đào Dép Đi!', en:'GOLD MINER', desc:'Canh móc thật khéo, kéo dép lên và né những tảng đá nặng. Chinh phục 10 Level cùng chú Thơm nhé!', level:'Khéo léo', time:'1–2 phút', color:'yellow' },
  {id:'uno',icon:'layers',name:'JGKiD Uno',en:'ONLINE CARD GAME',desc:'Rủ 2–4 người bạn vào phòng riêng, đổi màu và hô UNO cùng bộ bài Thơm!',level:'Online',time:'5–20 phút',color:'pink'},
  { id:'thom-diamond', icon:'gem', name:'Thơm Lấp Lánh', en:'THƠM LẤP LÁNH · MATCH-3', desc:'Đổi chỗ những khuôn mặt quen thuộc, ghép thành bộ ba và chinh phục 100 màn chơi cùng chú Thơm nhé!', level:'Giải đố', time:'Không giới hạn', color:'mint' },
];

export { GAMES };
