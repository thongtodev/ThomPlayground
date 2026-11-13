# Thơm Playground 1.54.2

## Cấu trúc mã nguồn

- `src/App.jsx`: điều hướng, trạng thái toàn ứng dụng, trang chủ, thành tựu, radio và kết quả chung.
- `src/games/`: mỗi trò chơi có một component riêng: `MinesGame`, `MoleGame`, `TicGame`, `ReactionGame`, `PuzzleGame`, `OnetGame`, `ConnectFourGame`, `SimonSaysGame`, `JigsawGame`.
- Các component chỉ phục vụ một game (thẻ Level, bộ sưu tập, mảnh ghép) nằm cùng file với game đó.
- `src/games/catalog.js`: danh mục game dùng cho trang chủ và nhóm game ban đầu.
- `src/games/newGameMeta.js`: thông tin giới thiệu cho Connect Four, Simon và Jigsaw.
- `src/components/GameUI.jsx`: mascot, biểu tượng, giới thiệu và khung chơi dùng chung của các game ban đầu.
- `src/components/NewGameUI.jsx`: giới thiệu và khung chơi của nhóm game bổ sung; giữ riêng vì cấu trúc HTML khác nhóm ban đầu.
- `src/utils/gameFormatting.js`: định dạng thời gian dùng chung.
- Các engine và lớp dữ liệu hiện tại vẫn nằm trong `src/`; không đổi thuật toán, khóa lưu trữ hoặc schema Supabase.

## CSS

`src/styles.css` chỉ chứa 11 lệnh import có thứ tự. Các file trong `src/styles/` lần lượt chứa nền tảng, ảnh/Admin, thành phần chung, game ban đầu, trang chủ/Onet, album, thành tựu/bảng xếp hạng, game bổ sung, phản hồi/radio, hộp thoại, quản lý ảnh Admin.

Thứ tự này giữ nguyên cascade của bản cũ. Không đổi thứ tự import hoặc gom tất cả selector trùng tên vào một nơi khi chưa kiểm tra ảnh hưởng trên desktop/mobile. Một selector có thể xuất hiện ở nhiều file vì có quy tắc điều chỉnh cuối cùng hoặc responsive.

Đã loại bỏ 85 khai báo trùng hoàn toàn với cùng selector, property, value, mức `!important` và cùng parent CSS; giữ lần xuất hiện cuối. Đã gộp 2 cặp rule kề nhau có cùng selector. Những giá trị khác nhau, fallback, media query và mức ưu tiên vẫn được giữ nguyên. Các khai báo được trình bày từng dòng để dễ sửa.

## Chạy và triển khai

```sh
npm ci
npm run dev
npm test
npm run build
```

Dùng `.env.example` để thiết lập `.env` như bản trước. Bản refactor không yêu cầu migration Supabase mới. ZIP chứa mã nguồn, không kèm `node_modules/` hoặc `dist/`. Khi triển khai, đặt biến môi trường của dự án rồi chạy `npm run build` để tạo `dist/`.

## Thay đổi và kiểm tra

- Tách game khỏi `App.jsx` và bỏ file gom `NewGames.jsx`.
- Di chuyển `OnetGame.jsx` vào `src/games/`.
- Cập nhật các bài kiểm tra hồi quy để đọc đúng nhóm module và CSS mới.
- Bổ sung kiểm tra ranh giới component, thứ tự import CSS và prop điều khiển kết quả Onet.
- Sửa lỗi có sẵn: Onet sử dụng `postResultActionsRef` khi thắng màn nhưng thiếu prop tương ứng trong tham số component.
- Đối chiếu AST: 49 khai báo giữ nguyên logic so với nguồn cũ, ngoại trừ bổ sung prop Onet nêu trên.
- 158/158 bài kiểm tra Node chạy qua; build production thành công.

Build còn cảnh báo có sẵn về hai khóa biểu tượng trùng trong `Icon.jsx` và `gameFeatures.js` vừa được import tĩnh vừa được import động. Không đổi các phần này trong phạm vi tách component/dọn CSS.

Đối chiếu trình duyệt: 13 trang (trang chủ, thành tựu, bảng xếp hạng, Admin và 9 màn giới thiệu game) ở 390 px và 1.280 px, tổng 26 so sánh. Bố cục và 15 thuộc tính CSS được lấy trên từng phần tử HTML khớp bản gốc. Kiểm tra dùng dữ liệu local và chặn tài nguyên mạng ngoài; không xác nhận kết nối Supabase hoặc YouTube thực tế.

Kiểm tra thao tác: khởi chạy cả 9 game ở hai kích thước màn hình; thử mở ô Dò mìn, đánh quân caro, chọn hai mảnh Jigsaw để hoán đổi và tải lại/tiếp tục các game có trạng thái đang chơi được kiểm tra.


## 1.54.1 – Âm thanh khi tương tác

- Thay hook âm thanh cũ tạo/đóng AudioContext sau mỗi lần đánh bằng `src/hooks/useSound.js` và `src/audio/soundPlayer.js`.
- Dùng lại một AudioContext cho hiệu ứng; chỉ giải phóng oscillator/gain khi tiếng kết thúc.
- Khởi tạo/khôi phục audio trên thao tác chuột, cảm ứng hoặc bàn phím; đợi `resume()` hoàn tất trước khi hẹn phát tiếng.
- Tắt tiếng dừng hiệu ứng đang chạy và hủy hiệu ứng đang đợi khôi phục. Đóng AudioContext khi ứng dụng unmount.
- Giữ nguyên tiếng đánh trúng 720 Hz/50 ms, tiếng bom 180 Hz/150 ms và luật tính điểm của Tặng dép. Cơ chế âm thanh dùng chung cũng áp dụng cho các game khác; Thơm Radio không đổi.
- 165/165 bài kiểm tra chạy qua. Có kiểm tra 250 lượt phát liên tục, khôi phục trạng thái suspended, resume bị từ chối, tắt/bật tiếng và giải phóng tài nguyên.
- Chromium: kiểm tra Tặng dép bằng click và touch mô phỏng, ép AudioContext tạm ngưng giữa ván rồi tiếp tục; mỗi chế độ có 9 hiệu ứng được phát, một lượt đánh khi tắt tiếng không phát, chỉ dùng một AudioContext. Đo được tín hiệu âm thanh khác 0. Đây là kiểm tra luồng âm thanh trong trình duyệt, chưa xác nhận loa/Bluetooth hoặc Safari trên thiết bị thật.


## 1.54.2 – Mở hình Nối Thơm Đi! theo Level

- Thắng Level 1–5: mở 1 hình; Level 6–10: mở 2 hình. Không còn chọn ngẫu nhiên số lượng.
- Vẫn chọn ngẫu nhiên trong những hình chưa mở; không mở trùng. Nếu chỉ còn 1 hình thì chỉ mở 1, đã mở hết thì không thêm hình.
- Giữ nguyên bộ sưu tập đã lưu, luật chơi và giới hạn 24 cặp. Chơi lại một Level vẫn nhận hình nếu còn hình chưa mở, như cơ chế trước.
- Màn chọn Level hiển thị số hình được mở khi thắng.
- Kiểm tra: 167/167 test đạt, build production thành công.

## Thơm Lấp Lánh (v1.69.0)

- Player component: `src/games/ThomDiamondGame.jsx`.
- Match-3 rules and board engine: `src/thomDiamondEngine.js`.
- 100 level configs and world mappings: `src/data/thomDiamondLevels.json` (derived from the supplied v1.1 workbook).
- Admin crop panel: `src/ThomDiamondAdmin.jsx`; crop metadata is persisted as `game_settings.thomDiamondCrops` and does not modify source images.
- Original image files live under `public/thom-kim-cuong/originals/`; gameplay uses the full-frame optimized WebP files under `public/thom-kim-cuong/tiles/`.
- Guest progress and best stars/scores are stored under `thom-kim-cuong-progress-v1` in local storage.
