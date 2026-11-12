import test from 'node:test';
import assert from 'node:assert/strict';
import { getMobileNotice, isRoutineUnoNotice } from '../src/uno/mobileNotices.js';

const room = (notice, additional = {}) => ({ id:'room-1', version:7, notice, pending:null, ...additional });

test('routine action announcements are hidden, including variants without final punctuation', () => {
  for (const source of [
    'Đã đánh bài.', 'Đã đánh bài',
    'Đã chuyển lượt.', 'Đã chuyển lượt',
    'Chim cá rút được lá đánh được rồi, ra bài nào!',
  ]) {
    assert.equal(isRoutineUnoNotice(source), true);
    assert.equal(getMobileNotice({ room:room(source) }), null);
  }
  assert.equal(isRoutineUnoNotice('Thách thức sai: rút 6 lá, mất lượt.'), false);
});

test('important penalties and +4 decision are immediately identifiable', () => {
  const penalty=getMobileNotice({ room:room('Thách thức sai: rút 6 lá, mất lượt.') });
  assert.equal(penalty.text,'Thách thức sai! +6 và mất lượt');
  assert.equal(penalty.important,true);
  const challenge=getMobileNotice({ room:room('+4: chấp nhận hoặc thách thức.',{me:'me',pending:{target:'me'}}) });
  assert.equal(challenge.text,'+4! Nhận bài hay thách thức?');
  assert.equal(challenge.important,true);
});

test('UNO and color changes take priority over a stale room notice', () => {
  assert.equal(getMobileNotice({room:room('Đã đánh bài.'),unoEffect:{kind:'catch'}}).text,'Bắt UNO! +2 lá');
  const change=getMobileNotice({room:room('Đã đánh bài.'),tableFx:{message:{title:'Đổi màu nè!',detail:'red'}}});
  assert.equal(change.text,'Đổi màu nè! · Đỏ');
  assert.equal(change.important,true);
});

test('local turn transitions are announced, but pending +4 takes precedence', () => {
  assert.deepEqual(getMobileNotice({room:room('Đã đánh bài.'),tableFx:{turn:true}}),{
    text:'Đến lượt bạn!',important:true,tone:'turn',
  });
  assert.equal(getMobileNotice({room:room('+4: chấp nhận hoặc thách thức.',{me:'me',pending:{target:'me'}}),tableFx:{turn:true,message:{title:'Đổi màu nè!',detail:'red'}}}).text,
    '+4! Nhận bài hay thách thức?');
});

test('missing room or empty notification is ignored', () => {
  assert.equal(getMobileNotice({room:null}),null);
  assert.equal(getMobileNotice({room:room('')}),null);
});
