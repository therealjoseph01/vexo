// Mutable, render-free shared state. React never re-renders from scroll: everything is read per frame.
export const film = {
  t: 0, // story time (≈ screens), after PACE warp
  time: 0, // wall-clock seconds, shared by WebGL and DOM (0 under reduced motion)
  vel: 0, // story-time velocity (units / second), smoothed — drives "motion" readouts
  vw: typeof window !== 'undefined' ? window.innerWidth : 1440,
  vh: typeof window !== 'undefined' ? window.innerHeight : 900,
  pointer: { x: 0, y: 0 },
  finePointer: true,
  reduced: false,
  lenis: null,
  finish: 'silver',
  quality: 1, // 1 = full, 0.66 = reduced, 0.4 = minimal (set by the frame-time monitor)
  ready: false,
  inCoda: false,
  snap: false,
  readyAt: 0,
  marks: { boot: typeof performance !== 'undefined' ? performance.now() : 0 },
}

// QA hook, only with ?debug in the URL:  __vexo.jump(19.5)
if (typeof window !== 'undefined' && /[?&]debug\b/.test(window.location.search)) window.__vexo = film

// Per-frame DOM updaters (typography, projected labels, backdrop). Called inside the WebGL frame.
export const updaters = new Set()
