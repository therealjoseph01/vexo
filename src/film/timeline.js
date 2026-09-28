// The film is one continuous timeline in "story time" (≈ screens of scroll).
// All choreography is written in story time; PACE decides how much scroll each moment gets.
export const TOTAL = 37

export const SCENES = [
  { id: 'sense', n: '01', name: 'Your sixth sense', start: 0, end: 3.4, jump: 1.9 },
  { id: 'enter', n: '02', name: 'Enter the ring', start: 3.4, end: 8.0, jump: 4.55 },
  { id: 'body', n: '03', name: 'The body, speaking', start: 8.0, end: 11.4, jump: 9.9 },
  { id: 'voice', n: '04', name: 'Double tap to speak', start: 11.4, end: 15.2, jump: 12.2 },
  { id: 'apps', n: '05', name: 'Every app, one ring', start: 15.2, end: 19.2, jump: 16.1 },
  { id: 'studio', n: '06', name: 'Vexo Studio', start: 19.2, end: 24.2, jump: 20.1 },
  { id: 'api', n: '07', name: 'The body, as an API', start: 24.2, end: 27.4, jump: 25.6 },
  { id: 'privacy', n: '08', name: 'Yours alone', start: 27.4, end: 30.6, jump: 29.3 },
  { id: 'days', n: '09', name: 'Five days', start: 30.6, end: 34.0, jump: 31.2 },
  { id: 'vexo', n: '10', name: 'Vexo', start: 34.0, end: TOTAL, jump: 36.2 },
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
  [3.9, 5.3, 1.45], // 02 · inside the ring, the LEDs wake
  [5.9, 7.9, 1.25], // 02 · signals join the orbit one by one
  [8.6, 10.6, 1.3], // 03 · body → ring → data
  [12.3, 14.6, 1.45], // 04 · tap, speak, understand, respond
  [16.0, 18.4, 1.25], // 05 · the flight through the ecosystem
  [20.0, 23.6, 1.55], // 06 · language becomes an app
  [24.8, 26.8, 1.2], // 07 · the network
  [28.2, 30.3, 1.3], // 08 · privacy
  [31.3, 33.4, 1.6], // 09 · five days
  [34.6, 36.4, 1.35], // 10 · the final reveal
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
  ring and camera move like something heavy on a dolly, not a CSS tween.
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
      // weighted harmonic mean — keeps it monotone
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
