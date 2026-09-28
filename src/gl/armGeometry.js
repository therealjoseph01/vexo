import * as THREE from 'three'
import { track } from '../film/timeline'

/*
  A forearm and hand, lofted from superelliptical cross-sections (centimetres).
  Arm space:  +X along the arm (elbow → fingertips, wrist crease at x = 0)
              +Y the back of the wrist (where Vexo's module sits)
              +Z across the wrist
  The wrist is about 5.6 × 3.9 cm, so Vexo's loop (≈ 6.2 × 4.7 cm inside) sits on it the way it sits on a real wrist.
*/
const K = [
  // x, halfWidth (Z), halfThickness (Y), centreY, exponent
  [-21, 3.8, 3.3, 0.0, 2.0],
  [-13, 3.7, 3.1, 0.05, 2.0],
  [-7, 3.35, 2.6, 0.05, 2.1],
  [-2.5, 2.95, 2.05, 0.0, 2.3],
  [0, 2.8, 1.92, 0.0, 2.4],
  [1.8, 3.0, 1.8, -0.05, 2.5],
  [4.5, 3.42, 1.55, -0.1, 2.7],
  [8.5, 3.48, 1.3, -0.2, 2.8],
  [11, 3.38, 1.1, -0.35, 2.6],
  [14.5, 3.1, 0.9, -0.55, 2.4],
  [17, 2.6, 0.66, -0.7, 2.2],
  [18.2, 1.6, 0.46, -0.75, 2.0],
  [18.8, 0.25, 0.18, -0.75, 2.0],
]
const tW = track(K.map((k) => [k[0], k[1]]))
const tH = track(K.map((k) => [k[0], k[2]]))
const tC = track(K.map((k) => [k[0], k[3]]))
const tN = track(K.map((k) => [k[0], k[4]]))
export const ARM_X0 = K[0][0]
export const ARM_X1 = K[K.length - 1][0]
export const WRIST_X = -1.6 // where the band sits: just above the wrist crease

export const armSection = (x) => ({ w: tW(x), h: tH(x), cy: tC(x), n: tN(x) })
// height of the back of the arm/hand at x (where a loose band rests as it slides)
export const armTop = (x) => (x > ARM_X1 ? tC(ARM_X1) : tC(x) + tH(x))

// superellipse point
function se(a, w, h, n) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * w, Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * h]
}

// thumb: a tapered tube along the radial side of the hand
// thumb held in alongside the palm, the way you hold a hand to slip a bracelet over it
const T0 = new THREE.Vector3(2.6, -0.5, -2.5)
const T1 = new THREE.Vector3(9.6, -0.85, -2.85)
const TR0 = 1.0
const TR1 = 0.68

// Contour loops for LineField: [{ pts: [[x,y,z,w]], x }] — w = normalised distance from the band
export function armLoops({ step = 0.5, pts = 96, thumbPts = 48 } = {}) {
  const loops = []
  for (let x = ARM_X0 + 0.5; x <= ARM_X1 - 0.3; x += step) {
    const { w, h, cy, n } = armSection(x)
    const s = 1.012 // just proud of the occluder
    const ring = []
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2
      const [zz, yy] = se(a, w * s, h * s, n)
      ring.push([x, cy + yy, zz, Math.abs(x - WRIST_X) / 20])
    }
    loops.push({ pts: ring, x, part: 'arm' })
  }
  const axis = new THREE.Vector3().subVectors(T1, T0)
  const len = axis.length()
  axis.normalize()
  const u = new THREE.Vector3(0, 1, 0).cross(axis).normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  for (let k = 1; k < 16; k++) {
    const t = k / 16
    const c = new THREE.Vector3().copy(T0).addScaledVector(axis, len * t)
    const r = (TR0 + (TR1 - TR0) * t) * (t > 0.85 ? Math.sqrt(1 - ((t - 0.85) / 0.15) ** 2) * 0.99 + 0.01 : 1) * 1.012
    const ring = []
    for (let i = 0; i < thumbPts; i++) {
      const a = (i / thumbPts) * Math.PI * 2
      const p = new THREE.Vector3().copy(c).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r * 0.8)
      ring.push([p.x, p.y, p.z, Math.abs(p.x - WRIST_X) / 20])
    }
    loops.push({ pts: ring, x: c.x, part: 'thumb' })
  }
  return loops
}

// The solid the lines are drawn on: occludes the band's far side and everything behind the arm.
export function armSolid({ rings = 140, seg = 64 } = {}) {
  const pos = []
  const nor = []
  const idx = []
  const addTube = (sectionAt, count) => {
    const base = pos.length / 3
    for (let r = 0; r <= count; r++) {
      const sec = sectionAt(r / count)
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2
        const p = sec.point(a)
        pos.push(p.x, p.y, p.z)
        const q = sec.normal(a)
        nor.push(q.x, q.y, q.z)
      }
    }
    for (let r = 0; r < count; r++)
      for (let i = 0; i < seg; i++) {
        const a = base + r * (seg + 1) + i
        const b = a + seg + 1
        idx.push(a, b, a + 1, a + 1, b, b + 1)
      }
  }
  addTube((t) => {
    const x = ARM_X0 + (ARM_X1 - ARM_X0) * t
    const { w, h, cy, n } = armSection(x)
    return {
      point: (a) => {
        const [zz, yy] = se(a, w, h, n)
        return new THREE.Vector3(x, cy + yy, zz)
      },
      normal: (a) => {
        const [zz, yy] = se(a, 1 / w, 1 / h, n)
        return new THREE.Vector3(0, yy, zz).normalize()
      },
    }
  }, rings)
  const axis = new THREE.Vector3().subVectors(T1, T0)
  const len = axis.length()
  axis.normalize()
  const u = new THREE.Vector3(0, 1, 0).cross(axis).normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()
  addTube((t) => {
    const c = new THREE.Vector3().copy(T0).addScaledVector(axis, len * t)
    const r = (TR0 + (TR1 - TR0) * t) * (t > 0.85 ? Math.sqrt(Math.max(0, 1 - ((t - 0.85) / 0.15) ** 2)) : 1)
    return {
      point: (a) => new THREE.Vector3().copy(c).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r * 0.8),
      normal: (a) => new THREE.Vector3().addScaledVector(u, Math.cos(a)).addScaledVector(v, Math.sin(a) / 0.8).normalize(),
    }
  }, 24)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}
