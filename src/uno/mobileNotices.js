// Short, glanceable gameplay announcements for the fast mobile table.
// The game engine remains the source of truth; this module only formats its state.
const SHORT_NOTICES = {
  'Đã chia 7 lá. Bắt đầu!': 'Bắt đầu ván! 🎉',
  'Bắt UNO thành công: rút 2 lá.': 'Bắt UNO! +2 lá',
  'Thách thức đúng! Người đánh +4 rút 4 lá; bạn được đi.': 'Thách thức thành công! Đối thủ +4',
  'Thách thức sai: rút 6 lá, mất lượt.': 'Thách thức sai! +6 và mất lượt',
  'Đã rút 4 lá, mất lượt.': 'Nhận +4 lá · Mất lượt',
  'Đã rút bài. Chỉ được đánh lá vừa rút hoặc chuyển lượt.': 'Đã rút bài · Đánh lá mới hoặc qua lượt',
  'Lá này chưa hợp rồi, nhường chim cá kế bên nhé!': 'Không đánh được · Qua lượt',
  '+4: chấp nhận hoặc thách thức.': '+4! Chọn nhận hoặc thách thức',
  'Đối thủ rút 2 lá và mất lượt.': '+2 lá · Đối thủ mất lượt',
  'Một người chơi đã bỏ cuộc.': 'Có người rời bàn',
};

// Routine actions already have clear card/turn animations, so they never
// occupy the gameplay notice banner on any screen size.
const SUPPRESSED_NOTICES = new Set([
  'Đã đánh bài',
  'Đã chuyển lượt',
  'Chim cá rút được lá đánh được rồi, ra bài nào',
]);

export function isRoutineUnoNotice(value) {
  return SUPPRESSED_NOTICES.has(String(value || '').trim().replace(/[.!…]+$/u, ''));
}

const colorNames = { red: 'Đỏ', green: 'Xanh lá', blue: 'Xanh dương', yellow: 'Vàng' };

export function getMobileNotice({ room, unoEffect, tableFx }) {
  if (!room) return null;
  if (unoEffect) {
    return {
      text: unoEffect.kind === 'uno' ? 'UNO! Còn một lá!' : 'Bắt UNO! +2 lá',
      important: true,
      tone: 'highlight',
    };
  }
  // A pending +4 demands a decision; never let the Wild color flourish
  // replace that higher-priority instruction on the mobile screen.
  if (room.pending) {
    const isLocalTarget = room.pending.target === room.me;
    return {
      text: isLocalTarget ? '+4! Nhận bài hay thách thức?' : 'Đối thủ đang xử lý +4',
      important: true,
      tone: 'highlight',
    };
  }
  if (tableFx?.message && !tableFx.winner) {
    const { title, detail } = tableFx.message;
    return {
      text: [title, colorNames[detail] || detail].filter(Boolean).join(' · '),
      important: true,
      tone: 'highlight',
    };
  }
  if (tableFx?.turn && !room.pending) {
    return { text: 'Đến lượt bạn!', important: true, tone: 'turn' };
  }
  const original = (room.notice || '').trim();
  if (!original || isRoutineUnoNotice(original)) return null;
  const important = !!room.pending || /UNO|\+2|\+4|\+6|Thách thức|mất lượt|bỏ cuộc|Bắt đầu/i.test(original);
  return {
    text: SHORT_NOTICES[original] || original,
    important,
    tone: important ? 'highlight' : 'normal',
  };
}
