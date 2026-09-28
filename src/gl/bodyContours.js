/*
  A human figure described as a signed distance field (capsules + ellipsoids, smooth-unioned),
  sliced into horizontal contour loops with marching squares — a body scan, not an illustration.
  Pose: standing, one hand resting over the heart (where the ring is).
  Units ≈ 3.6 tall, facing +z, centred on the origin. Runs once at start-up (~10 ms).
*/

const HEART = [0.06, 0.99, 0.27] // the hand on the chest — where the ring sits

const cap = (a, b, ra, rb) => ({ t: 'c', a, b, ra, rb })
const ell = (c, r) => ({ t: 'e', c, r })
const PRIMS = [
  ell([0, 1.58, 0.01], [0.145, 0.19, 0.165]), // head
  cap([0, 1.27, -0.01], [0, 1.42, 0.0], 0.068, 0.062), // neck
  ell([0, 1.12, -0.01], [0.34, 0.1, 0.16]), // shoulders line
  ell([0, 0.96, 0.0], [0.33, 0.3, 0.19]), // chest
  ell([0, 0.52, -0.01], [0.27, 0.33, 0.16]), // abdomen
  ell([0, 0.12, -0.01], [0.31, 0.2, 0.17]), // pelvis
  // right arm (viewer's left), relaxed
  cap([-0.41, 1.12, 0.0], [-0.5, 0.58, -0.02], 0.085, 0.068),
  cap([-0.5, 0.58, -0.02], [-0.56, 0.06, 0.05], 0.064, 0.048),
  ell([-0.575, -0.06, 0.06], [0.042, 0.085, 0.052]),
  // left arm (viewer's right), hand over the heart
  cap([0.41, 1.12, 0.0], [0.45, 0.63, 0.13], 0.085, 0.07),
  cap([0.45, 0.63, 0.13], [0.16, 0.9, 0.27], 0.066, 0.05),
  ell([0.07, 0.985, 0.265], [0.11, 0.055, 0.036]),
  // legs
  cap([-0.15, 0.04, 0.0], [-0.18, -0.8, 0.02], 0.15, 0.093),
  cap([-0.18, -0.8, 0.02], [-0.19, -1.6, -0.01], 0.088, 0.055),
  ell([-0.2, -1.7, 0.06], [0.058, 0.04, 0.12]),
  cap([0.15, 0.04, 0.0], [0.18, -0.8, 0.02], 0.15, 0.093),
  cap([0.18, -0.8, 0.02], [0.19, -1.6, -0.01], 0.088, 0.055),
  ell([0.2, -1.7, 0.06], [0.058, 0.04, 0.12]),
]

function dCap(p, c) {
  const ax = c.b[0] - c.a[0]
  const ay = c.b[1] - c.a[1]
  const az = c.b[2] - c.a[2]
  const px = p[0] - c.a[0]
  const py = p[1] - c.a[1]
  const pz = p[2] - c.a[2]
  const h = Math.max(0, Math.min(1, (px * ax + py * ay + pz * az) / (ax * ax + ay * ay + az * az)))
  const dx = px - ax * h
  const dy = py - ay * h
  const dz = pz - az * h
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (c.ra + (c.rb - c.ra) * h)
}
function dEll(p, e) {
  // cheap, good-enough ellipsoid distance
  const x = (p[0] - e.c[0]) / e.r[0]
  const y = (p[1] - e.c[1]) / e.r[1]
  const z = (p[2] - e.c[2]) / e.r[2]
  const k = Math.sqrt(x * x + y * y + z * z)
  return (k - 1) * Math.min(e.r[0], e.r[1], e.r[2])
}
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
function sdf(p) {
  let d = 1e9
  for (const q of PRIMS) d = smin(d, q.t === 'c' ? dCap(p, q) : dEll(p, q), 0.07)
  return d
}

// marching squares on one horizontal slice → closed loops of [x, y, z]
function slice(y, x0, x1, z0, z1, res) {
  const nx = Math.ceil((x1 - x0) / res)
  const nz = Math.ceil((z1 - z0) / res)
  const V = new Float32Array((nx + 1) * (nz + 1))
  const P = [0, y, 0]
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nx; i++) {
      P[0] = x0 + i * res
      P[2] = z0 + j * res
      V[j * (nx + 1) + i] = sdf(P)
    }
  const val = (i, j) => V[j * (nx + 1) + i]
  const pts = new Map()
  const edgePt = (key, ia, ja, ib, jb) => {
    if (pts.has(key)) return key
    const a = val(ia, ja)
    const b = val(ib, jb)
    const t = a / (a - b)
    pts.set(key, [x0 + (ia + (ib - ia) * t) * res, y, z0 + (ja + (jb - ja) * t) * res])
    return key
  }
  const adj = new Map()
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a).push(b)
    adj.get(b).push(a)
  }
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const a = val(i, j) < 0 ? 1 : 0
      const b = val(i + 1, j) < 0 ? 2 : 0
      const c = val(i + 1, j + 1) < 0 ? 4 : 0
      const d = val(i, j + 1) < 0 ? 8 : 0
      const k = a | b | c | d
      if (k === 0 || k === 15) continue
      const eB = () => edgePt(`h${i},${j}`, i, j, i + 1, j) // bottom (j)
      const eR = () => edgePt(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1)
      const eT = () => edgePt(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1)
      const eL = () => edgePt(`v${i},${j}`, i, j, i, j + 1)
      switch (k) {
        case 1: case 14: link(eL(), eB()); break
        case 2: case 13: link(eB(), eR()); break
        case 3: case 12: link(eL(), eR()); break
        case 4: case 11: link(eR(), eT()); break
        case 6: case 9: link(eB(), eT()); break
        case 7: case 8: link(eL(), eT()); break
        case 5: link(eL(), eB()); link(eR(), eT()); break
        case 10: link(eB(), eR()); link(eT(), eL()); break
      }
    }
  const loops = []
  const seen = new Set()
  for (const start of adj.keys()) {
    if (seen.has(start)) continue
    const loop = []
    let prev = null
    let cur = start
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      loop.push(pts.get(cur))
      const n = adj.get(cur)
      const next = n[0] !== prev ? n[0] : n[1]
      prev = cur
      cur = next
    }
    if (loop.length > 6) loops.push(loop)
  }
  return loops
}

function resampleLoop(loop, n) {
  const src = [...loop, loop[0]]
  const acc = [0]
  for (let i = 1; i < src.length; i++) acc.push(acc[i - 1] + Math.hypot(src[i][0] - src[i - 1][0], src[i][2] - src[i - 1][2]))
  const total = acc[acc.length - 1]
  const out = []
  let j = 1
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total
    while (j < acc.length - 1 && acc[j] < s) j++
    const t = (s - acc[j - 1]) / (acc[j] - acc[j - 1] || 1)
    const a = src[j - 1]
    const b = src[j]
    out.push([a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t])
  }
  return { pts: out, len: total }
}

// → [{ pts: [[x,y,z,w]], y }] ; w = distance to the heart (drives the converging pulses)
export function buildBodyContours({ slices = 92, res = 0.018, maxPts = 128, maxLoops = 256 } = {}) {
  const out = []
  const y0 = -1.74
  const y1 = 1.77
  for (let s = 0; s < slices; s++) {
    const y = y0 + ((y1 - y0) * s) / (slices - 1)
    for (const loop of slice(y, -0.82, 0.82, -0.36, 0.46, res)) {
      const { pts, len } = resampleLoop(loop, 0)
      const n = Math.max(16, Math.min(maxPts - 1, Math.round(len * 70)))
      const r = resampleLoop(loop, n).pts.map((p) => [p[0], p[1], p[2], Math.hypot(p[0] - HEART[0], p[1] - HEART[1], (p[2] - HEART[2]) * 0.6)])
      out.push({ pts: r, y })
      if (out.length >= maxLoops) return out
    }
  }
  return out
}

export const BODY_HEART = HEART
