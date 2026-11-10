import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundPlayer } from '../src/audio/soundPlayer.js';

function fixture(initialState = 'running') {
  const contexts = [];
  class FakeContext {
    constructor() {
      this.state = initialState;
      this.currentTime = 12;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      this.resumeCalls = 0;
      this.closeCalls = 0;
      contexts.push(this);
    }
    async resume() { this.resumeCalls++; this.state = 'running'; }
    async close() { this.closeCalls++; this.state = 'closed'; }
    createOscillator() {
      const node = { frequency: {}, connect() {}, disconnect() { this.disconnected = true; }, start(time) { this.started = time; }, stop(time) { this.stopped = time; } };
      this.oscillators.push(node);
      return node;
    }
    createGain() {
      const node = { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { this.disconnected = true; } };
      this.gains.push(node);
      return node;
    }
  }
  const player = createSoundPlayer(() => FakeContext);
  player.setEnabled(true);
  return { player, contexts };
}

test('250 rapid effects reuse one context and release completed nodes, not the context', async () => {
  const { player, contexts } = fixture();
  for (let i = 0; i < 250; i++) assert.equal(await player.play(720, .05), true);
  assert.equal(contexts.length, 1);
  const ctx = contexts[0];
  assert.equal(ctx.oscillators.length, 250);
  for (const oscillator of ctx.oscillators) oscillator.onended();
  assert.ok(ctx.oscillators.every(node => node.disconnected));
  assert.ok(ctx.gains.every(node => node.disconnected));
  assert.equal(ctx.closeCalls, 0);
  player.dispose();
  assert.equal(ctx.closeCalls, 1);
});

test('effects wait for resume and start at the resumed audio clock', async () => {
  const { player, contexts } = fixture('suspended');
  await player.unlock();
  const ctx = contexts[0];
  ctx.state = 'suspended';
  let finishResume;
  ctx.resume = () => new Promise(resolve => { finishResume = () => { ctx.state = 'running'; ctx.currentTime = 42; resolve(); }; });
  const played = player.play(180, .15);
  assert.equal(ctx.oscillators.length, 0);
  finishResume();
  assert.equal(await played, true);
  assert.equal(ctx.oscillators[0].started, 42);
  assert.equal(ctx.oscillators[0].stopped, 42.15);
  player.dispose();
});

test('a rejected resume is contained and retried on the next gesture', async () => {
  const { player, contexts } = fixture();
  await player.unlock();
  const ctx = contexts[0];
  ctx.state = 'suspended';
  ctx.resume = () => Promise.reject(new Error('autoplay blocked'));
  assert.equal(await player.play(), false);
  ctx.resume = async () => { ctx.state = 'running'; };
  assert.equal(await player.play(), true);
  assert.equal(contexts.length, 1);
  player.dispose();
});

test('muting stops active effects and cancels delayed effects even after re-enabling', async () => {
  const { player, contexts } = fixture();
  await player.play();
  const ctx = contexts[0];
  ctx.state = 'suspended';
  let finishResume;
  ctx.resume = () => new Promise(resolve => { finishResume = () => { ctx.state = 'running'; resolve(); }; });
  const delayed = player.play();
  player.setEnabled(false);
  assert.ok(ctx.oscillators[0].disconnected);
  assert.equal(await player.play(), false);
  player.setEnabled(true);
  finishResume();
  assert.equal(await delayed, false);
  assert.equal(ctx.oscillators.length, 1);
  assert.equal(await player.play(), true);
  assert.equal(contexts.length, 1);
  player.dispose();
});

test('dispose cancels a pending effect and never recreates an audio context', async () => {
  const { player, contexts } = fixture();
  await player.unlock();
  const ctx = contexts[0];
  ctx.state = 'suspended';
  let finishResume;
  ctx.resume = () => new Promise(resolve => { finishResume = resolve; });
  const delayed = player.play();
  player.dispose();
  finishResume();
  assert.equal(await delayed, false);
  player.setEnabled(true);
  assert.equal(await player.play(), false);
  assert.equal(contexts.length, 1);
});

test('a closed context is replaced on the next effect', async () => {
  const { player, contexts } = fixture();
  await player.play();
  contexts[0].state = 'closed';
  assert.equal(await player.play(), true);
  assert.equal(contexts.length, 2);
  player.dispose();
});

test('disabled or unsupported audio creates no nodes and cannot break gameplay', async () => {
  const { player, contexts } = fixture();
  player.setEnabled(false);
  assert.equal(await player.unlock(), false);
  assert.equal(await player.play(), false);
  assert.equal(contexts.length, 0);
  const unsupported = createSoundPlayer(() => undefined);
  unsupported.setEnabled(true);
  assert.equal(await unsupported.play(), false);
  const unavailable = createSoundPlayer(() => class { constructor() { throw new Error('unavailable'); } });
  unavailable.setEnabled(true);
  assert.equal(await unavailable.play(), false);
});
