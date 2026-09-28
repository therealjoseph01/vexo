/*
  Each app on the ring is drawn from the signal it lives on — in the same hairline as everything
  else, never as an icon in a card. Local units: about 1 wide, centred on the origin, facing +z.
*/
const circle = (r, n = 64, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]
})
const line = (pts) => pts.map(([x, y]) => [x, y, 0])
const stadium = (w, h) => {
  const r = h / 2
  const s = w / 2 - r
  const out = []
  for (let i = 0; i < 12; i++) out.push([-s + (2 * s * i) / 12, -r, 0])
  for (let i = 0; i < 24; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 24
    out.push([s + Math.cos(a) * r, Math.sin(a) * r, 0])
  }
  for (let i = 0; i < 12; i++) out.push([s - (2 * s * i) / 12, r, 0])
  for (let i = 0; i < 24; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 24
    out.push([-s + Math.cos(a) * r, Math.sin(a) * r, 0])
  }
  return out
}
const curve = (f, x0, x1, n = 64) => Array.from({ length: n }, (_, i) => {
  const x = x0 + ((x1 - x0) * i) / (n - 1)
  return [x, f(x), 0]
})

// { lines: [{ pts, closed }], anim } — anim: optional per-frame behaviour in Ecosystem.jsx
export const GLYPHS = {
  stride: {
    lines: [
      { pts: stadium(1.0, 0.52), closed: true, runner: true },
      { pts: stadium(0.8, 0.34), closed: true },
    ],
  },
  matchday: {
    lines: [
      { pts: line([[-0.5, -0.3], [0.5, -0.3], [0.5, 0.3], [-0.5, 0.3]]), closed: true },
      { pts: line([[0, -0.3], [0, 0.3]]) },
      { pts: circle(0.1, 48), closed: true },
      { pts: line([[-0.5, -0.13], [-0.38, -0.13], [-0.38, 0.13], [-0.5, 0.13]]) },
      { pts: line([[0.5, -0.13], [0.38, -0.13], [0.38, 0.13], [0.5, 0.13]]) },
    ],
  },
  rally: {
    lines: [
      { pts: line([[-0.52, -0.26], [0.52, -0.26]]) },
      { pts: line([[0, -0.26], [0, -0.08]]) },
      { pts: curve((x) => -0.26 + 0.5 * (1 - ((x + 0.18) / 0.3) ** 2), -0.48, 0.12), ball: true },
      { pts: curve((x) => -0.26 + 0.22 * (1 - ((x - 0.3) / 0.18) ** 2), 0.12, 0.48) },
    ],
  },
  still: {
    lines: [
      { pts: circle(0.14, 48), closed: true, breathe: 1 },
      { pts: circle(0.25, 64), closed: true, breathe: 0.7 },
      { pts: circle(0.36, 80), closed: true, breathe: 0.45 },
    ],
  },
  plate: {
    lines: [
      { pts: circle(0.34, 80), closed: true },
      { pts: circle(0.26, 64), closed: true },
      { pts: line([[0, 0], [0, 0.26]]) },
      { pts: line([[0, 0], [0.225, -0.13]]) },
      { pts: line([[0, 0], [-0.225, -0.13]]) },
    ],
  },
  dose: {
    lines: [
      { pts: line([[-0.52, 0], [0.52, 0]]) },
      ...[-0.36, -0.12, 0.12, 0.36].map((x) => ({ pts: circle(0.05, 24, x, 0), closed: true, dose: x })),
    ],
  },
  lift: {
    lines: [
      { pts: line([[-0.5, -0.28], [0.5, -0.28]]) },
      ...[-0.36, -0.18, 0, 0.18, 0.36].map((x, i) => ({ pts: line([[x, -0.24], [x, -0.24 + 0.1 + i * 0.09]]), set: i })),
    ],
  },
  goals: {
    lines: [
      { pts: line([[-0.52, -0.28], [0.52, -0.28]]) },
      { pts: curve((x) => -0.24 + 0.46 * ((x + 0.5) / 1) ** 1.6 + 0.03 * Math.sin(x * 22), -0.5, 0.5, 90), trend: true },
    ],
  },
  women: {
    lines: [
      { pts: circle(0.34, 90), closed: true },
      // nightly temperature across a cycle: low follicular, ~0.3 °C shift after ovulation
      { pts: curve((x) => -0.1 + 0.16 / (1 + Math.exp(-(x - 0.02) * 22)) + 0.012 * Math.sin(x * 40), -0.3, 0.3, 80) },
    ],
  },
}
