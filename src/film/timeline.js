// The film is one continuous timeline in "story time" (≈ screens of scroll).
// All choreography is written in story time; PACE decides how much scroll each moment gets.
export const TOTAL = 35

export const SCENES = [
  { id: 'open', n: '01', name: 'Already on it', start: 0, end: 3.6, jump: 2.6 },
  { id: 'band', n: '02', name: 'Woven comfort', start: 3.6, end: 8.2, jump: 6.2 },
  { id: 'wrist', n: '03', name: 'On your wrist', start: 8.2, end: 11.2, jump: 10.6 },
  { id: 'context', n: '04', name: 'It has the context', start: 11.2, end: 15.6, jump: 11.6 },
  { id: 'acts', n: '05', name: 'Acts before you ask', start: 15.6, end: 19.8, jump: 16.2 },
  { id: 'voice', n: '06', name: 'Just say it', start: 19.8, end: 23.8, jump: 20.4 },
  { id: 'health', n: '07', name: 'In tune with you', start: 23.8, end: 27.4, jump: 25.0 },
  { id: 'privacy', n: '08', name: 'Private by design', start: 27.4, end: 31.0, jump: 28.4 },
  { id: 'yours', n: '09', name: 'Make it yours', start: 31.0, end: TOTAL, jump: 34.2 },
]

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export const lerp = (a, b, t) => a + (b - a) * t
export const range = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)))
export const smooth = (x) => x * x * (3 - 2 * x)
export const smoother = (x) => x * x * x * (x * (x * 6 - 15) + 10)
export const w = (t, a, b) => smooth(range(t, a, b))
// Envelope: fades in over [a0,a1], out over [b0,b1]
export const env = (t, a0, a1, b0, b1) => (t < a1 ? smooth(range(t, a0, a1)) : 1 - smooth(range(t, b0, b1)))
export const pulse = (x, c, wdt) => Math.exp(-((x - c) * (x - c)) / (2 * wdt * wdt))

export const ease = {
  linear: (x) => x,
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  expoOut: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
}

/*
  PACE — slow-motion zones. [storyStart, storyEnd, factor]: that stretch gets `factor`× more
  scroll distance, so it plays slower under the same wheel. Edges blend smoothly.
*/
export const PACE = [
  [0.2, 2.2, 1.35], // 01 · light across the weave
  [4.3, 5.5, 1.25], // 02 · microphone, sensors
  [5.8, 7.2, 1.35], // 02 · inside the module
  [8.6, 10.4, 1.55], // 03 · onto the wrist
  [11.4, 15.2, 1.35], // 04 · three conversations
  [15.8, 19.4, 1.3], // 05 · memories become actions
  [20.4, 23.4, 1.4], // 06 · voice → a deck
  [24.4, 27.0, 1.25], // 07 · sensors
  [28.0, 30.6, 1.35], // 08 · the audio disappears
  [31.2, 33.4, 1.3], // 09 · off the wrist
]
const PACE_RAMP = 0.3
const PACE_STEP = 0.004
const paceAt = (s) => {
  let k = 1
  for (const [a, b, f] of PACE) {
    const box = smooth(range(s, a - PACE_RAMP, a + PACE_RAMP)) * (1 - smooth(range(s, b - PACE_RAMP, b + PACE_RAMP)))
    k += (f - 1) * box
  }
  return k
}
const N_PACE = Math.ceil(TOTAL / PACE_STEP) + 1
const scrollOf = new Float32Array(N_PACE)
for (let i = 1; i < N_PACE; i++) scrollOf[i] = scrollOf[i - 1] + PACE_STEP * paceAt((i - 0.5) * PACE_STEP)

export const SCROLL_TOTAL = scrollOf[N_PACE - 1]

// story time → scroll position (screens)
export function unwarp(story) {
  const f = clamp(story / PACE_STEP, 0, N_PACE - 1)
  const i = Math.min(Math.floor(f), N_PACE - 2)
  return scrollOf[i] + (scrollOf[i + 1] - scrollOf[i]) * (f - i)
}

// scroll position (screens) → story time
export function warp(scroll) {
  if (scroll <= 0) return 0
  if (scroll >= SCROLL_TOTAL) return TOTAL
  let lo = 0
  let hi = N_PACE - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (scrollOf[mid] < scroll) lo = mid
    else hi = mid
  }
  const x = (scroll - scrollOf[lo]) / (scrollOf[hi] - scrollOf[lo] || 1)
  return (lo + x) * PACE_STEP
}

export const sceneIndexAt = (t) => {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start - 0.0001) return i
  return 0
}

/*
  Monotone cubic track (Fritsch–Carlson). Keys: [[t, value], ...].
  Velocity is continuous through interior keys (no stop-and-go at every keyframe),
  zero at the ends and on holds (repeated values), and it never overshoots — so the
  band and camera move like something heavy on a dolly, not a CSS tween.
*/
export function track(keys) {
  const n = keys.length
  const xs = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const d = new Array(Math.max(1, n - 1))
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1e-6)
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0
    else {
      const h0 = xs[i] - xs[i - 1]
      const h1 = xs[i + 1] - xs[i]
      const w1 = 2 * h1 + h0
      const w2 = h1 + 2 * h0
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 2 && x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const s = (x - xs[i]) / h
    const s2 = s * s
    const s3 = s2 * s
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1]
  }
}

// Vector track: keys [[t, [x, y, z]], ...] → fn(t, outVector3)
export function track3(keys) {
  const tx = track(keys.map((k) => [k[0], k[1][0]]))
  const ty = track(keys.map((k) => [k[0], k[1][1]]))
  const tz = track(keys.map((k) => [k[0], k[1][2]]))
  return (t, out) => out.set(tx(t), ty(t), tz(t))
}
