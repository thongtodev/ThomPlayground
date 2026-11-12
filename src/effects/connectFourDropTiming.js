// Complete a Connect Four turn only when its visual drop has settled.
// Reduced-motion and background tabs do not create a visual animation.
export function afterConnectFourDrop(animation, onLanded) {
  if (typeof onLanded !== 'function') return;
  if (animation && typeof animation.then === 'function') {
    animation.then(onLanded, onLanded);
  } else {
    queueMicrotask(onLanded);
  }
}
