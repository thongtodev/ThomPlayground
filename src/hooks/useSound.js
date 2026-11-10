import { useCallback, useEffect, useRef } from 'react';
import { createSoundPlayer } from '../audio/soundPlayer';

export function useSound(enabled) {
  const playerRef = useRef(null);

  useEffect(() => {
    const player = createSoundPlayer();
    playerRef.current = player;
    return () => {
      player.dispose();
      if (playerRef.current === player) playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    player.setEnabled(enabled);
    if (!enabled) return;
    const unlock = () => { void player.unlock(); };
    // Prime audio on touch/keyboard before game effects, including timed ones.
    const events = ['pointerdown', 'pointerup', 'keydown'];
    for (const event of events) document.addEventListener(event, unlock, true);
    return () => {
      for (const event of events) document.removeEventListener(event, unlock, true);
    };
  }, [enabled]);

  return useCallback((frequency, duration) => playerRef.current?.play(frequency, duration), []);
}
