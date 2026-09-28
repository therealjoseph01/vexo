import * as THREE from 'three'
import { armSection, ARM_X0 } from './armGeometry'

/*
  The wearer: a human forearm and hand, built as one smooth surface.
  It is a signed distance field (the lofted forearm and palm, plus fingers and thumb as tapered
  capsules, blended where flesh meets flesh) polygonised once at load with surface nets.
  Arm space, centimetres: +X towards the fingertips (wrist crease at 0), +Y the back of the hand,
  +Z across (the little finger's side). The pose is the one people use to slip a bracelet on:
  fingers together and extended, thumb held in along the palm.
*/

// ---------- distance functions ----------
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a, b, k) => -smin(-a, -b, k)

// tapered capsule (iq's round cone) between a and b with radii r1, r2
function roundCone(px, py, pz, s) {
  const [ax, ay, az, bx, by, bz, r1, r2] = s
  const bax = bx - ax
  const bay = by - ay
  const baz = bz - az
  const l2 = s[8]
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const pax = px - ax
  const pay = py - ay
  const paz = pz - az
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
const seg = (a, b, r1, r2) => {
  const s = [...a, ...b, r1, r2, 0]
  s[8] = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2
  return s
}

// ---------- the hand ----------
const PALM_END = 9.1
const deg = Math.PI / 180
// [base x, base z, lengths (proximal, middle, distal), radii at the joints, curl per joint (deg)]
const FINGERS = [
  { x: 8.9, z: -2.42, len: [4.2, 2.4, 2.0], r: [0.86, 0.8, 0.73, 0.64], curl: [4, 9, 12] }, // index
  { x: 9.25, z: -0.78, len: [4.6, 2.8, 2.1], r: [0.88, 0.82, 0.75, 0.66], curl: [3, 8, 11] }, // middle
  { x: 8.95, z: 0.86, len: [4.3, 2.6, 2.0], r: [0.84, 0.78, 0.71, 0.62], curl: [4, 9, 12] }, // fourth finger
  { x: 8.2, z: 2.36, len: [3.3, 1.95, 1.75], r: [0.75, 0.69, 0.63, 0.55], curl: [6, 10, 12] }, // little
]
const segsF = []
const nails = []
for (const f of FINGERS) {
  let p = [f.x - 0.6, -0.12, f.z]
  let a = 0
  const list = []
  for (let j = 0; j < 3; j++) {
    a += f.curl[j] * deg
    const L = f.len[j] + (j === 0 ? 0.6 : 0)
    const q = [p[0] + Math.cos(a) * L, p[1] - Math.sin(a) * L, p[2] + (j === 2 ? 0 : 0) - (f.z > 2 ? 0.05 * (j + 1) : 0)]
    list.push(seg(p, q, f.r[j], f.r[j + 1]))
    if (j === 2) {
      // the nail sits on the back of the last joint, towards the tip
      const t = 0.62
      nails.push({ c: [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t + f.r[3] * 0.82, p[2] + (q[2] - p[2]) * t], rx: f.len[2] * 0.36, ry: 0.28, rz: f.r[3] * 0.74, a })
    }
    p = q
  }
  segsF.push(list)
}
// thumb, held in along the side of the palm
const THENAR = seg([0.9, -0.85, -1.55], [4.6, -1.05, -2.05], 1.35, 1.05)
const THUMB = [seg([1.6, -0.6, -2.05], [5.0, -0.95, -2.5], 1.12, 0.98), seg([5.0, -0.95, -2.5], [7.6, -1.3, -2.35], 0.95, 0.86), seg([7.6, -1.3, -2.35], [9.55, -1.5, -2.0], 0.84, 0.7)]
{
  const s = THUMB[2]
  nails.push({ c: [s[0] + (s[3] - s[0]) * 0.62, s[1] + (s[4] - s[1]) * 0.62 - 0.1, s[2] + (s[5] - s[2]) * 0.62 - 0.62], rx: 0.72, ry: 0.28, rz: 0.55, a: 0, side: true })
}

// section tables for the lofted body (forearm → palm)
function body(x, y, z, sec) {
  const { w, h, cy, n } = sec
  const qz = Math.abs(z) / w
  const qy = Math.abs(y - cy) / h
  const d = (Math.pow(Math.pow(qz, n) + Math.pow(qy, n), 1 / n) - 1) * Math.min(w, h) * 0.92
  // the palm ends in a soft round at the knuckles
  return smax(d, x - PALM_END, 1.4)
}

function hand(x, y, z, sec) {
  let d = body(x, y, z, sec)
  if (x > 0 && x < 11.5) {
    d = smin(d, roundCone(x, y, z, THENAR), 1.3)
    let t = roundCone(x, y, z, THUMB[0])
    t = Math.min(t, roundCone(x, y, z, THUMB[1]))
    t = Math.min(t, roundCone(x, y, z, THUMB[2]))
    d = smin(d, t, x < 5.5 ? 0.9 : 0.25)
  }
  if (x > 6.5) {
    // fingers: fused into the palm at the knuckles, separate from each other (they touch, they don't melt)
    let fs = 1e9
    for (const list of segsF) {
      let fd = roundCone(x, y, z, list[0])
      fd = smin(fd, roundCone(x, y, z, list[1]), 0.12)
      fd = smin(fd, roundCone(x, y, z, list[2]), 0.1)
      fs = Math.min(fs, fd)
    }
    d = smin(d, fs, 0.55)
  }
  return d
}

function nailWeight(x, y, z) {
  let m = 0
  for (const n of nails) {
    const ca = Math.cos(n.a)
    const sa = Math.sin(n.a)
    const dx = x - n.c[0]
    const dy = y - n.c[1]
    const dz = z - n.c[2]
    // into the nail's frame (tilted with the finger)
    const u = dx * ca - dy * sa
    const v = dx * sa + dy * ca
    const e = n.side ? (u / n.rx) ** 2 + (dz / 0.3) ** 2 + (v / n.rz) ** 2 : (u / n.rx) ** 2 + (v / n.ry) ** 2 + (dz / n.rz) ** 2
    m = Math.max(m, 1 - THREE.MathUtils.smoothstep(e, 0.55, 1.0))
  }
  return m
}

/*
  Surface nets over a uniform grid. One vertex per surface cell (the average of its edge crossings),
  quads across every sign-changing grid edge, normals from the field's gradient.
*/
export function buildHand({ cell = 0.2, x0 = ARM_X0, x1 = 19.4 } = {}) {
  const y0 = -3.7
  const y1 = 3.6
  const z0 = -4.4
  const z1 = 4.3
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
      for (let i = 0; i < nx; i++) val[row + i] = hand(x0 + i * cell, y, z, secs[i])
    }
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
  for (let k = 0; k < nz - 1; k++)
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
        // quads across the three edges leaving corner 0
        const inside = mask & 1
        const axes = [
          [2, 0, j, k, cx, cx * cyN], // x-edge (corner 0 → 1): neighbours in y and z
          [4, 0, i, k, 1, cx * cyN], // y-edge (corner 0 → 2): neighbours in x and z
          [16, 0, i, j, 1, cx], // z-edge (corner 0 → 4): neighbours in x and y
        ]
        for (let a = 0; a < 3; a++) {
          const [bit, , u, v, du, dv] = axes[a]
          if (!!(mask & bit) === !!inside) continue
          if (u === 0 || v === 0) continue
          const q0 = cellIdx[ci]
          const q1 = cellIdx[ci - du]
          const q2 = cellIdx[ci - du - dv]
          const q3 = cellIdx[ci - dv]
          if (q1 < 0 || q2 < 0 || q3 < 0) continue
          const flip = a === 1 ? !inside : !!inside
          if (flip) quads.push(q0, q1, q2, q3)
          else quads.push(q0, q3, q2, q1)
        }
      }

  // normals from the gradient; nails as a vertex attribute
  const N = pos.length / 3
  const nor = new Float32Array(N * 3)
  const nail = new Float32Array(N)
  const e = cell * 0.5
  for (let v = 0; v < N; v++) {
    const x = pos[v * 3]
    const y = pos[v * 3 + 1]
    const z = pos[v * 3 + 2]
    const gx = field(x + e, y, z) - field(x - e, y, z)
    const gy = field(x, y + e, z) - field(x, y - e, z)
    const gz = field(x, y, z + e) - field(x, y, z - e)
    const l = Math.hypot(gx, gy, gz) || 1
    nor[v * 3] = gx / l
    nor[v * 3 + 1] = gy / l
    nor[v * 3 + 2] = gz / l
    nail[v] = x > 12 ? nailWeight(x, y, z) : 0
  }
  const idx = new Uint32Array((quads.length / 4) * 6)
  for (let q = 0, o = 0; q < quads.length; q += 4) {
    idx[o++] = quads[q]
    idx[o++] = quads[q + 1]
    idx[o++] = quads[q + 2]
    idx[o++] = quads[q]
    idx[o++] = quads[q + 2]
    idx[o++] = quads[q + 3]
  }
  // make sure faces point out of the skin (compare winding with the gradient on a sample of faces)
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
    const fx = uy * vz - uz * vy
    const fy = uz * vx - ux * vz
    const fz = ux * vy - uy * vx
    score += Math.sign(fx * nor[a] + fy * nor[a + 1] + fz * nor[a + 2])
  }
  if (score < 0)
    for (let f = 0; f < idx.length; f += 3) {
      const t = idx[f + 1]
      idx[f + 1] = idx[f + 2]
      idx[f + 2] = t
    }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('aNail', new THREE.BufferAttribute(nail, 1))
  geo.setIndex(new THREE.BufferAttribute(idx, 1))
  geo.computeBoundingSphere()
  return geo
}
