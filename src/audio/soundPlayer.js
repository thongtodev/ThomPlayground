/** One audio context for all short game effects; create it on user interaction. */
export function createSoundPlayer(getAudioContext = () => globalThis.AudioContext || globalThis.webkitAudioContext) {
  let context = null;
  let enabled = false;
  let disposed = false;
  let generation = 0;
  const voices = new Set();

  function getContext() {
    if (!enabled || disposed) return null;
    try {
      if (!context || context.state === 'closed') {
        const AudioContext = getAudioContext();
        if (!AudioContext) return null;
        context = new AudioContext();
      }
      return context;
    } catch {
      return null;
    }
  }

  function resume(ctx) {
    if (!ctx) return Promise.resolve(false);
    if (ctx.state === 'running') return Promise.resolve(true);
    // Invoke resume synchronously inside the gesture, then wait before scheduling.
    // Retry on the next gesture if the browser refuses or interrupts playback.
    try {
      return Promise.resolve(ctx.resume()).then(() => ctx.state === 'running', () => false);
    } catch {
      return Promise.resolve(false);
    }
  }

  function stopVoices() {
    for (const voice of [...voices]) {
      try { voice.oscillator.stop(); } catch {}
      voice.cleanup();
    }
  }

  function schedule(ctx, frequency, duration, requestedGeneration) {
    if (!enabled || disposed || requestedGeneration !== generation || context !== ctx || ctx.state !== 'running') return false;
    let oscillator, gain;
    const voice = {
      cleanup() {
        if (oscillator) {
          oscillator.onended = null;
          try { oscillator.disconnect(); } catch {}
        }
        if (gain) { try { gain.disconnect(); } catch {} }
        voices.delete(voice);
      },
    };
    try {
      oscillator = ctx.createOscillator();
      voice.oscillator = oscillator;
      gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(.045, now);
      gain.gain.exponentialRampToValueAtTime(.001, now + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.onended = voice.cleanup;
      voices.add(voice);
      oscillator.start(now);
      oscillator.stop(now + duration);
      return true;
    } catch {
      try { oscillator?.stop(); } catch {}
      voice.cleanup();
      return false;
    }
  }

  return {
    setEnabled(value) {
      const next = Boolean(value);
      if (next === enabled) return;
      enabled = next;
      generation++;
      if (!enabled) stopVoices();
    },
    unlock() {
      return resume(getContext());
    },
    play(frequency = 520, duration = .07) {
      if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(duration) || duration <= 0) return Promise.resolve(false);
      const ctx = getContext();
      const requestedGeneration = generation;
      if (!ctx) return Promise.resolve(false);
      if (ctx.state === 'running') return Promise.resolve(schedule(ctx, frequency, duration, requestedGeneration));
      return resume(ctx).then(ready => ready && schedule(ctx, frequency, duration, requestedGeneration));
    },
    dispose() {
      disposed = true;
      enabled = false;
      generation++;
      stopVoices();
      const old = context;
      context = null;
      if (old && old.state !== 'closed') {
        try { Promise.resolve(old.close()).catch(() => {}); } catch {}
      }
    },
  };
}
