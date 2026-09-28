import * as THREE from 'three'
import { armSection, ARM_X0 } from './armGeometry'

/*
  The wearer: a human forearm and hand, as one continuous surface.

  A signed distance field sculpted from anatomy and blended wherever flesh meets flesh:
    · the forearm (lofted sections) with its muscle mass towards the elbow and the ulnar head at the wrist
    · the palm, with the thenar and hypothenar pads and soft knuckles on the back of the hand
    · four fingers and a thumb, each one smooth sweep along its bones: the radius changes continuously
      (a touch wider at the joints, narrower between), the cross-section is flatter on top than underneath,
      the pads are fuller on the palm side, and each ends in a rounded, slightly flattened tip
  The pose is the one people use to slip a bracelet on: fingers together and extended, thumb held in along the palm.

  It is polygonised once at load (surface nets, time-sliced so the page stays responsive), every vertex is
  projected onto the true surface, and normals come from the field's gradient. Each vertex also carries what
  the skin shader needs: albedo (redder at the knuckles and fingertips, paler on the inner forearm, faint veins),
  local thickness (light through thin flesh), nails and the creases across the finger joints.

  Arm space, centimetres: +X towards the fingertips (wrist crease at 0), +Y the back of the hand,
  +Z across the hand (the little finger's side).
*/

// ---------- distance helpers ----------
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a, b, k) => -smin(-a, -b, k)
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

// ellipsoid (iq's bound)
function ellipsoid(px, py, pz, e) {
  const dx = px - e[0]
  const dy = py - e[1]
  const dz = pz - e[2]
  const k0 = Math.hypot(dx / e[3], dy / e[4], dz / e[5])
  const k1 = Math.hypot(dx / (e[3] * e[3]), dy / (e[4] * e[4]), dz / (e[5] * e[5]))
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(e[3], e[4], e[5])
}
const ell = (c, r) => [c[0], c[1], c[2], r[0], r[1], r[2]]

// tapered capsule (iq's round cone)
function roundCone(px, py, pz, s) {
  const bax = s[3] - s[0]
  const bay = s[4] - s[1]
  const baz = s[5] - s[2]
  const r1 = s[6]
  const r2 = s[7]
  const l2 = s[8]
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const pax = px - s[0]
  const pay = py - s[1]
  const paz = pz - s[2]
  const y = pax * bax + pay * bay + paz * baz
  const z = y - l2
  const qx = pax * l2 - bax * y
  const qy = pay * l2 - bay * y
  const qz = paz * l2 - baz * y
  const x2 = qx * qx + qy * qy + qz * qz
  const y2 = y * y * l2
  const z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * x2
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1
}
const seg = (a, b, r1, r2) => [a[0], a[1], a[2], b[0], b[1], b[2], r1, r2, (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2]

/*
  A digit: a chain of segments along its bones. Each segment knows its frame (dir, up = the nail side),
  its radius at start / middle / end, how much fuller the pad is underneath, and the knuckle at its joints.
*/
function digit(points, radii, up0, opts) {
  const segs = []
  let s0 = 0
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const len = Math.hypot(d[0], d[1], d[2])
    d[0] /= len
    d[1] /= len
    d[2] /= len
    // the nail side, kept perpendicular to the bone
    const up = typeof up0 === 'function' ? up0(i) : up0.slice()
    const k = up[0] * d[0] + up[1] * d[1] + up[2] * d[2]
    up[0] -= k * d[0]
    up[1] -= k * d[1]
    up[2] -= k * d[2]
    const ul = Math.hypot(up[0], up[1], up[2])
    up[0] /= ul
    up[1] /= ul
    up[2] /= ul
    const side = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]]
    const r = radii[i]
    segs.push({
      a,
      d,
      len,
      s0,
      up,
      side,
      rs: r[0],
      rm: r[1],
      re: r[2],
      pad: (opts.pad && opts.pad[i]) || 0,
      padAt: (opts.padAt && opts.padAt[i]) || 0.5,
      kn: (opts.kn && opts.kn[i]) || 0,
      top: opts.top || 0.8,
      bot: opts.bot || 0.88,
      capStart: i === 0,
      capEnd: i === points.length - 2,
    })
    s0 += len
  }
  // bounding box for a quick reject: padded by the widest radius plus the widest blend, so that outside it
  // the digit is too far away to change anything and skipping it leaves no seam
  const lo = [1e9, 1e9, 1e9]
  const hi = [-1e9, -1e9, -1e9]
  for (const p of points)
    for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c], p[c] - 2.9)
      hi[c] = Math.max(hi[c], p[c] + 2.9)
    }
  return { segs, lo, hi, points }
}

function segDist(px, py, pz, g) {
  const pax = px - g.a[0]
  const pay = py - g.a[1]
  const paz = pz - g.a[2]
  let along = pax * g.d[0] + pay * g.d[1] + paz * g.d[2]
  let t = along / g.len
  if (t < 0) t = g.capStart ? 0 : 0
  if (t > 1) t = 1
  const qx = g.a[0] + g.d[0] * g.len * t
  const qy = g.a[1] + g.d[1] * g.len * t
  const qz = g.a[2] + g.d[2] * g.len * t
  const vx = px - qx
  const vy = py - qy
  const vz = pz - qz
  const vu = vx * g.up[0] + vy * g.up[1] + vz * g.up[2]
  const vs = vx * g.side[0] + vy * g.side[1] + vz * g.side[2]
  const va = vx * g.d[0] + vy * g.d[1] + vz * g.d[2]
  // radius along the bone: a little wider at the joints, narrower between
  const r = t < 0.5 ? g.rs + (g.rm - g.rs) * smooth01(t * 2) : g.rm + (g.re - g.rm) * smooth01((t - 0.5) * 2)
  let ru
  if (vu < 0) {
    // the pad underneath: fuller towards the middle of the phalanx (towards the tip on the last one)
    const x = (t - g.padAt) / 0.32
    ru = r * (g.bot + g.pad * Math.exp(-x * x))
  } else {
    // flatter on top, with a soft knuckle at each joint
    const j0 = (g.len * t) / 0.32
    const j1 = (g.len * (1 - t)) / 0.32
    ru = r * (g.top + g.kn * (Math.exp(-j0 * j0) + Math.exp(-j1 * j1)))
  }
  const e = Math.sqrt((vs / r) ** 2 + (vu / ru) ** 2 + (va / r) ** 2)
  return (e - 1) * Math.min(r, ru) * 0.95
}

function digitDist(px, py, pz, dg) {
  if (px < dg.lo[0] || px > dg.hi[0] || py < dg.lo[1] || py > dg.hi[1] || pz < dg.lo[2] || pz > dg.hi[2]) return 5
  let d = 1e9
  for (const g of dg.segs) d = smin(d, segDist(px, py, pz, g), 0.12)
  return d
}

// ---------- the forearm and palm ----------
const PALM_END = 8.7
const MUSCLES = [
  ell([-15.5, 0.6, -1.3], [8.5, 2.5, 2.3]), // extensor mass, radial side (brachioradialis)
  ell([-15, -0.95, 1.15], [8, 2.3, 2.4]), // flexor mass
]
const ULNA = ell([0.25, 0.88, 2.3], [0.55, 0.42, 0.42]) // the ulnar head, on the little-finger side of the wrist
const PADS = [
  ell([4.2, -0.7, 2.3], [3.3, 0.85, 1.0]), // hypothenar
  ell([8.1, -0.8, 0.05], [1.3, 0.6, 3.05]), // the pad under the knuckles
]
const THENAR = seg([0.9, -0.85, -1.5], [4.6, -1.08, -2.02], 1.3, 1.0)
const topY = (x) => {
  const s = armSection(x)
  return s.cy + s.h
}

// ---------- fingers ----------
const deg = Math.PI / 180
const FINGERS = [
  { base: [8.95, -0.05, -2.48], len: [4.4, 2.5, 1.9], r: [0.95, 0.86, 0.78, 0.7], curl: [5, 11, 8], splay: -1 }, // index
  { base: [9.3, -0.02, -0.82], len: [4.8, 2.9, 2.0], r: [0.97, 0.88, 0.8, 0.71], curl: [4, 10, 7], splay: 0 }, // middle
  { base: [9.0, -0.06, 0.84], len: [4.5, 2.7, 1.9], r: [0.92, 0.83, 0.75, 0.67], curl: [6, 12, 8], splay: 1 }, // fourth
  { base: [8.3, -0.18, 2.36], len: [3.5, 2.0, 1.75], r: [0.82, 0.72, 0.65, 0.58], curl: [8, 14, 9], splay: 2.5 }, // little
]
const digits = []
const nails = []
const joints = []
const tips = []
const KNUCKLES = []
for (const f of FINGERS) {
  const yaw = f.splay * deg
  let pitch = f.curl[0] * deg
  const dirAt = (pt) => [Math.cos(pt) * Math.cos(yaw), -Math.sin(pt), Math.cos(pt) * Math.sin(yaw)]
  const upAt = (pt) => [Math.sin(pt) * Math.cos(yaw), Math.cos(pt), Math.sin(pt) * Math.sin(yaw)]
  const pts = []
  const ups = []
  const d0 = dirAt(pitch)
  // the bone starts inside the palm so the finger grows out of it
  pts.push([f.base[0] - d0[0] * 2.2, f.base[1] - d0[1] * 2.2 - 0.18, f.base[2] - d0[2] * 2.2])
  ups.push(upAt(pitch))
  let p = f.base.slice()
  pts.push(p)
  for (let j = 0; j < 3; j++) {
    if (j > 0) pitch += f.curl[j] * deg
    const d = dirAt(pitch)
    const L = f.len[j] - (j === 2 ? f.r[3] * 0.85 : 0) // the rounded tip ends at the fingertip
    const q = [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L]
    ups.push(upAt(pitch))
    joints.push({ p: p.slice(), dir: d, r: f.r[j], kind: j, up: upAt(pitch) })
    if (j === 2) {
      tips.push({ p: [q[0] + d[0] * f.r[3] * 0.85, q[1] + d[1] * f.r[3] * 0.85, q[2] + d[2] * f.r[3] * 0.85], dir: d })
      const u = upAt(pitch)
      const c = [p[0] + d[0] * f.len[2] * 0.62 + u[0] * f.r[3] * 0.8, p[1] + d[1] * f.len[2] * 0.62 + u[1] * f.r[3] * 0.8, p[2] + d[2] * f.len[2] * 0.62]
      nails.push({ c, d, u, rl: f.len[2] * 0.38, rw: f.r[3] * 0.78, rh: 0.35 })
    }
    pts.push(q)
    p = q
  }
  const r = f.r
  digits.push(
    digit(
      pts,
      [
        [r[0] * 1.05, r[0] * 1.07, r[0] * 1.02],
        [r[0], r[0] * 0.965, r[1] * 1.01],
        [r[1] * 1.01, r[1] * 0.96, r[2] * 1.01],
        [r[2] * 1.01, r[2] * 0.98, r[3]],
      ],
      (i) => ups[i],
      { pad: [0, 0.1, 0.1, 0.18], padAt: [0.5, 0.55, 0.5, 0.62], kn: [0, 0.025, 0.03, 0.02], top: 0.8, bot: 0.86 },
    ),
  )
  KNUCKLES.push(ell([f.base[0] - 0.35, topY(f.base[0] - 0.35) - 0.1, f.base[2]], [0.55, 0.17, 0.46]))
}
// the thumb, held in along the side of the palm; its nail faces outwards (−Z)
{
  const P = [
    [1.4, -0.72, -1.95],
    [4.9, -1.0, -2.72],
    [7.45, -1.2, -2.72],
    [9.05, -1.32, -2.45],
  ]
  const up = [0, 0.42, -0.9]
  digits.push(digit(P, [[1.12, 1.05, 0.98], [0.98, 0.9, 0.88], [0.88, 0.8, 0.68]], up, { pad: [0, 0.1, 0.2], padAt: [0.5, 0.5, 0.6], kn: [0, 0.05, 0.03], top: 0.84, bot: 0.9 }))
  joints.push({ p: P[1], dir: [1, -0.11, 0], r: 0.98, kind: 1, up, thumb: true })
  joints.push({ p: P[2], dir: [0.98, -0.07, 0.16], r: 0.88, kind: 2, up, thumb: true })
  const dl = [P[3][0] - P[2][0], P[3][1] - P[2][1], P[3][2] - P[2][2]]
  const ll = Math.hypot(...dl)
  const d = dl.map((v) => v / ll)
  tips.push({ p: [P[3][0] + d[0] * 0.58, P[3][1] + d[1] * 0.58, P[3][2] + d[2] * 0.58], dir: d })
  const c = [P[2][0] + dl[0] * 0.68 + up[0] * 0.62, P[2][1] + dl[1] * 0.68 + up[1] * 0.62, P[2][2] + dl[2] * 0.68 + up[2] * 0.62]
  nails.push({ c, d, u: up, rl: 0.72, rw: 0.62, rh: 0.35 })
}
const THUMB = digits[digits.length - 1]
const FINGER_DIGITS = digits.slice(0, 4)

// ---------- the field ----------
function body(x, y, z, sec) {
  const { w, h, cy, n } = sec
  const qz = Math.abs(z) / w
  const qy = Math.abs(y - cy) / h
  const d = (Math.pow(Math.pow(qz, n) + Math.pow(qy, n), 1 / n) - 1) * Math.min(w, h) * 0.92
  return smax(d, x - PALM_END, 2.2)
}

function hand(x, y, z, sec) {
  let d = body(x, y, z, sec)
  if (x < -0.5) for (const m of MUSCLES) d = smin(d, ellipsoid(x, y, z, m), 2.4)
  if (x > -3 && x < 3.5) d = smin(d, ellipsoid(x, y, z, ULNA), 0.9)
  if (x > -2.5 && x < 13) {
    d = smin(d, roundCone(x, y, z, THENAR), 1.4)
    for (const p of PADS) d = smin(d, ellipsoid(x, y, z, p), 0.8)
    // the thumb blends broadly into the thenar at its root, tightly further out
    d = smin(d, digitDist(x, y, z, THUMB), 1.0 - 0.75 * smooth01((x - 4.2) / 1.8))
  }
  if (x > 6 && x < 11.5) for (const k of KNUCKLES) d = smin(d, ellipsoid(x, y, z, k), 0.7)
  if (x > 3.5) {
    // fingers: grown out of the palm, pressed gently against each other
    let fs = 1e9
    for (const dg of FINGER_DIGITS) fs = smin(fs, digitDist(x, y, z, dg), 0.1)
    d = smin(d, fs, 1.25)
  }
  return d
}

// ---------- skin data ----------
const srgb = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)
// fair skin: measured albedos sit well below white, and redden where blood is close to the surface
const C_BASE = srgb(0.87, 0.69, 0.58)
const C_RED = srgb(0.83, 0.55, 0.48)
const C_PALE = srgb(0.9, 0.745, 0.645)
const C_WARM = srgb(0.85, 0.65, 0.53)
const C_VEIN = srgb(0.72, 0.64, 0.66)
const C_NAIL = srgb(0.92, 0.76, 0.73)
const C_NAIL_EDGE = srgb(0.95, 0.9, 0.84)

const VEINS = [
  [[-6, -0.6], [-2.5, -0.9], [0.8, -1.2], [3.5, -1.6], [6.2, -1.9]],
  [[-4, 0.8], [-0.5, 0.9], [2.5, 0.7], [5, 0.2], [7, -0.4]],
  [[2.2, 1.0], [4.8, 1.5], [7, 1.8]],
]
function veinDist(x, z) {
  let m = 1e9
  for (const v of VEINS)
    for (let i = 0; i < v.length - 1; i++) {
      const a = v[i]
      const b = v[i + 1]
      const t = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)))
      m = Math.min(m, Math.hypot(x - (a[0] + (b[0] - a[0]) * t), z - (a[1] + (b[1] - a[1]) * t)))
    }
  return m
}
// nail: 0..1 inside the nail plate, and how far towards its free edge (for the paler tip)
function nailAt(x, y, z) {
  let best = 0
  let edge = 0
  for (const n of nails) {
    const dx = x - n.c[0]
    const dy = y - n.c[1]
    const dz = z - n.c[2]
    const l = dx * n.d[0] + dy * n.d[1] + dz * n.d[2]
    const h = dx * n.u[0] + dy * n.u[1] + dz * n.u[2]
    if (h < -0.25) continue
    const sx = dx - l * n.d[0] - h * n.u[0]
    const sy = dy - l * n.d[1] - h * n.u[1]
    const sz = dz - l * n.d[2] - h * n.u[2]
    const w = Math.hypot(sx, sy, sz)
    // a rounded rectangle, squarer at the free edge
    const e = Math.pow(Math.pow(Math.abs(l) / n.rl, 3) + Math.pow(w / n.rw, 3), 1 / 3)
    const m = 1 - smooth01((e - 0.8) / 0.22)
    if (m > best) {
      best = m
      edge = smooth01((l / n.rl - 0.55) / 0.35)
    }
  }
  return [best, edge]
}

/*
  Surface nets over a uniform grid, run as a sequence of short steps (a generator), so the browser can keep
  painting while it works. Then each vertex is projected onto the true surface and given its skin data.
*/
function* steps({ cell = 0.14, x0 = ARM_X0, x1 = 19.6 } = {}, out) {
  const y0 = -3.9
  const y1 = 3.8
  const z0 = -4.4
  const z1 = 4.4
  const nx = Math.ceil((x1 - x0) / cell) + 1
  const ny = Math.ceil((y1 - y0) / cell) + 1
  const nz = Math.ceil((z1 - z0) / cell) + 1
  const val = new Float32Array(nx * ny * nz)
  const secs = []
  for (let i = 0; i < nx; i++) secs.push(armSection(Math.min(x0 + i * cell, PALM_END + 2)))
  for (let k = 0; k < nz; k++) {
    const z = z0 + k * cell
    for (let j = 0; j < ny; j++) {
      const y = y0 + j * cell
      const row = nx * (j + ny * k)
      for (let i = 0; i < nx; i++) {
        const x = x0 + i * cell
        const sc = secs[i]
        const far = x < 6 && (Math.abs(z) > sc.w + 1.8 || Math.abs(y - sc.cy) > sc.h + 1.8)
        val[row + i] = far ? 1 : hand(x, y, z, sc)
      }
    }
    yield 0.45 * (k / nz)
  }
  const field = (x, y, z) => hand(x, y, z, armSection(Math.min(x, PALM_END + 2)))

  const cx = nx - 1
  const cyN = ny - 1
  const cellIdx = new Int32Array(cx * cyN * (nz - 1)).fill(-1)
  const pos = []
  const quads = []
  const CORNER = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ]
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]
  const g = new Float32Array(8)
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0
        for (let c = 0; c < 8; c++) {
          const o = CORNER[c]
          const v = val[i + o[0] + nx * (j + o[1] + ny * (k + o[2]))]
          g[c] = v
          if (v < 0) mask |= 1 << c
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [a, b] of EDGES) {
          const va = g[a]
          const vb = g[b]
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          const A = CORNER[a]
          const B = CORNER[b]
          sx += A[0] + (B[0] - A[0]) * t
          sy += A[1] + (B[1] - A[1]) * t
          sz += A[2] + (B[2] - A[2]) * t
          n++
        }
        const id = pos.length / 3
        pos.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (k + sz / n) * cell)
        const ci = i + cx * (j + cyN * k)
        cellIdx[ci] = id
        const inside = mask & 1
        for (let a = 0; a < 3; a++) {
          const bit = a === 0 ? 2 : a === 1 ? 4 : 16
          const u = a === 0 ? j : i
          const v = a === 2 ? j : k
          const du = a === 0 ? cx : 1
          const dv = a === 2 ? cx : cx * cyN
          if (!!(mask & bit) === !!inside) continue
          if (u === 0 || v === 0) continue
          const q1 = cellIdx[ci - du]
          const q2 = cellIdx[ci - du - dv]
          const q3 = cellIdx[ci - dv]
          if (q1 < 0 || q2 < 0 || q3 < 0) continue
          const flip = a === 1 ? !inside : !!inside
          if (flip) quads.push(id, q1, q2, q3)
          else quads.push(id, q3, q2, q1)
        }
      }
    if (k % 4 === 0) yield 0.45 + 0.1 * (k / nz)
  }

  // project onto the surface, normals, skin data
  const N = pos.length / 3
  const nor = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const thin = new Float32Array(N)
  const nail = new Float32Array(N)
  const crease = new Float32Array(N * 2)
  const tmp = new THREE.Color()
  const e = 0.015
  const bad = new Uint8Array(N)
  for (let v = 0; v < N; v++) {
    const ox = pos[v * 3]
    const oy = pos[v * 3 + 1]
    const oz = pos[v * 3 + 2]
    let x = ox
    let y = oy
    let z = oz
    let gx = 0
    let gy = 0
    let gz = 0
    for (let it = 0; it < 2; it++) {
      // tetrahedral gradient: four taps give the value and the slope
      const a = field(x + e, y - e, z - e)
      const b = field(x - e, y - e, z + e)
      const c = field(x - e, y + e, z - e)
      const d = field(x + e, y + e, z + e)
      const f = (a + b + c + d) * 0.25
      gx = (a - b - c + d) / (4 * e)
      gy = (-a - b + c + d) / (4 * e)
      gz = (-a + b - c + d) / (4 * e)
      const g2 = gx * gx + gy * gy + gz * gz || 1
      const step = Math.max(-cell * 0.5, Math.min(cell * 0.5, f / g2))
      x -= gx * step
      y -= gy * step
      z -= gz * step
    }
    // a projection that jumped across a crease to another surface is undone
    if ((x - ox) ** 2 + (y - oy) ** 2 + (z - oz) ** 2 > (cell * 0.7) ** 2) {
      x = ox
      y = oy
      z = oz
      bad[v] = 1
    }
    pos[v * 3] = x
    pos[v * 3 + 1] = y
    pos[v * 3 + 2] = z
    const l = Math.hypot(gx, gy, gz) || 1
    const nX = gx / l
    const nY = gy / l
    const nZ = gz / l
    nor[v * 3] = nX
    nor[v * 3 + 1] = nY
    nor[v * 3 + 2] = nZ

    // how deep the flesh goes beneath this point (fingers are thin, the forearm isn't)
    let T = 0
    for (const s of [0.35, 0.8, 1.5, 2.6]) T = Math.max(T, -field(x - nX * s, y - nY * s, z - nZ * s))
    thin[v] = THREE.MathUtils.clamp(1 - (T - 0.45) / 1.4, 0, 1)

    // albedo
    const sec = armSection(Math.min(x, PALM_END + 2))
    tmp.copy(C_BASE)
    const dorsal = THREE.MathUtils.clamp((y - sec.cy) / sec.h, -1, 1)
    // forearm: paler inside, a little warmer on top; hand: pinker palm, warmer back — blended across the wrist
    const hk = smooth01((x + 0.5) / 3)
    tmp.lerp(C_PALE, 0.55 * THREE.MathUtils.smoothstep(-dorsal, 0.1, 0.8) * (1 - hk))
    tmp.lerp(C_WARM, 0.3 * THREE.MathUtils.smoothstep(dorsal, 0.2, 0.9) * (1 - hk))
    tmp.lerp(C_RED, 0.3 * THREE.MathUtils.smoothstep(-nY, 0.2, 0.9) * hk)
    tmp.lerp(C_WARM, 0.22 * THREE.MathUtils.smoothstep(nY, 0.3, 0.9) * hk * (1 - 0.5 * smooth01((x - 8.5) / 2)))
    let red = 0
    let cr = 0
    let along = 0
    for (const jn of joints) {
      const dx = x - jn.p[0]
      const dy = y - jn.p[1]
      const dz = z - jn.p[2]
      const a = dx * jn.dir[0] + dy * jn.dir[1] + dz * jn.dir[2]
      const rad = Math.hypot(dx - a * jn.dir[0], dy - a * jn.dir[1], dz - a * jn.dir[2])
      if (rad > jn.r * 1.6) continue
      const top = THREE.MathUtils.smoothstep(nX * jn.up[0] + nY * jn.up[1] + nZ * jn.up[2], 0.1, 0.75)
      red = Math.max(red, Math.exp(-((a / (jn.kind === 0 ? 0.9 : 0.5)) ** 2)) * (0.3 + 0.35 * top))
      // creases: fine lines across the back of the finger joints (and the palm side of them)
      const w = Math.exp(-((a / 0.3) ** 2)) * (0.35 + 0.65 * top) * (jn.kind === 0 ? 0.3 : 1)
      if (w > cr) {
        cr = w
        along = a
      }
    }
    for (const tp of tips) {
      const d = Math.hypot(x - tp.p[0], y - tp.p[1], z - tp.p[2])
      red = Math.max(red, 0.65 * Math.exp(-((d / 1.1) ** 2)))
    }
    tmp.lerp(C_RED, Math.min(0.7, red))
    if (x > -7 && x < 8 && nY > 0.2) {
      const vd = veinDist(x, z)
      tmp.lerp(C_VEIN, 0.2 * Math.exp(-((vd / 0.32) ** 2)) * THREE.MathUtils.smoothstep(nY, 0.2, 0.7))
    }
    const [nw, ne] = x > 7 ? nailAt(x, y, z) : [0, 0]
    nail[v] = nw
    if (nw > 0) tmp.lerp(C_NAIL, nw).lerp(C_NAIL_EDGE, nw * ne * 0.8)
    col[v * 3] = tmp.r
    col[v * 3 + 1] = tmp.g
    col[v * 3 + 2] = tmp.b
    crease[v * 2] = cr * (1 - nw)
    crease[v * 2 + 1] = along
    if (v % 2500 === 0) yield 0.55 + 0.43 * (v / N)
  }

  const idx = new Uint32Array((quads.length / 4) * 6)
  for (let q = 0, o = 0; q < quads.length; q += 4) {
    const a = quads[q]
    const b = quads[q + 1]
    const c = quads[q + 2]
    const d = quads[q + 3]
    const d1 = (pos[a * 3] - pos[c * 3]) ** 2 + (pos[a * 3 + 1] - pos[c * 3 + 1]) ** 2 + (pos[a * 3 + 2] - pos[c * 3 + 2]) ** 2
    const d2 = (pos[b * 3] - pos[d * 3]) ** 2 + (pos[b * 3 + 1] - pos[d * 3 + 1]) ** 2 + (pos[b * 3 + 2] - pos[d * 3 + 2]) ** 2
    if (d1 <= d2) {
      idx[o++] = a
      idx[o++] = b
      idx[o++] = c
      idx[o++] = a
      idx[o++] = c
      idx[o++] = d
    } else {
      idx[o++] = a
      idx[o++] = b
      idx[o++] = d
      idx[o++] = b
      idx[o++] = c
      idx[o++] = d
    }
  }
  let score = 0
  for (let f = 0; f < idx.length; f += 3 * 97) {
    const a = idx[f] * 3
    const b = idx[f + 1] * 3
    const c = idx[f + 2] * 3
    const ux = pos[b] - pos[a]
    const uy = pos[b + 1] - pos[a + 1]
    const uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a]
    const vy = pos[c + 1] - pos[a + 1]
    const vz = pos[c + 2] - pos[a + 2]
    score += Math.sign((uy * vz - uz * vy) * nor[a] + (uz * vx - ux * vz) * nor[a + 1] + (ux * vy - uy * vx) * nor[a + 2])
  }
  if (score < 0)
    for (let f = 0; f < idx.length; f += 3) {
      const t = idx[f + 1]
      idx[f + 1] = idx[f + 2]
      idx[f + 2] = t
    }
  // where the field's gradient disagrees with the mesh (inside tight creases), trust the mesh
  const fn = new Float32Array(N * 3)
  for (let f = 0; f < idx.length; f += 3) {
    const a = idx[f] * 3
    const b = idx[f + 1] * 3
    const c = idx[f + 2] * 3
    const ux = pos[b] - pos[a]
    const uy = pos[b + 1] - pos[a + 1]
    const uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a]
    const vy = pos[c + 1] - pos[a + 1]
    const vz = pos[c + 2] - pos[a + 2]
    const nx_ = uy * vz - uz * vy
    const ny_ = uz * vx - ux * vz
    const nz_ = ux * vy - uy * vx
    for (const o of [a, b, c]) {
      fn[o] += nx_
      fn[o + 1] += ny_
      fn[o + 2] += nz_
    }
  }
  for (let v = 0; v < N; v++) {
    const o = v * 3
    const l = Math.hypot(fn[o], fn[o + 1], fn[o + 2]) || 1
    const mx = fn[o] / l
    const my = fn[o + 1] / l
    const mz = fn[o + 2] / l
    const dot = mx * nor[o] + my * nor[o + 1] + mz * nor[o + 2]
    if (bad[v] || dot < 0.6) {
      nor[o] = mx
      nor[o + 1] = my
      nor[o + 2] = mz
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aThin', new THREE.BufferAttribute(thin, 1))
  geo.setAttribute('aNail', new THREE.BufferAttribute(nail, 1))
  geo.setAttribute('aCrease', new THREE.BufferAttribute(crease, 2))
  geo.setIndex(new THREE.BufferAttribute(idx, 1))
  geo.computeBoundingSphere()
  out.geo = geo
  yield 1
}

// all at once (tests, tools)
export function buildHand(opts) {
  const out = {}
  for (const _ of steps(opts, out));
  return out.geo
}

// a little at a time, so the loader keeps moving while the hand is sculpted
export const handAsset = { geo: null, progress: 0 }
let building = null
export function buildHandAsync(opts, onProgress) {
  if (building) return building
  building = new Promise((resolve) => {
    const out = {}
    const it = steps(opts, out)
    // message events aren't clamped like timers are in background frames, so this keeps its pace
    const ch = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null
    const next = () => (ch ? ch.port2.postMessage(0) : setTimeout(tick, 0))
    const tick = () => {
      const t0 = performance.now()
      for (;;) {
        const r = it.next()
        if (r.done) {
          handAsset.geo = out.geo
          handAsset.progress = 1
          onProgress && onProgress(1)
          if (ch) ch.port1.close()
          resolve(out.geo)
          return
        }
        handAsset.progress = r.value
        if (performance.now() - t0 > 24) break
      }
      onProgress && onProgress(handAsset.progress)
      next()
    }
    if (ch) ch.port1.onmessage = tick
    next()
  })
  return building
}
