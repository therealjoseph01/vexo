import * as THREE from 'three'
import { track, track3, w, env, range, clamp, lerp, smooth, pulse } from './timeline'
import { SB, WORN_BASIS, pointLocal } from '../gl/bandSpec'
import { WRIST_X, armTop } from '../gl/armGeometry'

/*
  THE DIRECTOR'S SCRIPT
  ---------------------
  Every visual value in the film is a pure function of story time `t` (plus wall-clock `time`
  for things that breathe on their own). computeState() writes targets into S; the Stage passes
  camera, band and arm through critically damped springs and composes the final matrices.

  The band has two lives: floating in the studio (Euler pose), and worn (placed on the arm).
  S.worn.k blends between them. While worn, the band stays where it is and the arm moves
  through it — a hand pushing into a bracelet — so the protagonist never leaves the frame.

  01 Already on it        0.0 – 3.6    darkness → weave → light → the whole band
  02 Woven comfort        3.6 – 8.2    microphone, sensors, inside the module
  03 On your wrist        8.2 – 11.2   a hand slides through; the band cinches and settles
  04 It has the context   11.2 – 15.6  three conversations collapse into the microphone
  05 Acts before you ask  15.6 – 19.8  memory → action
  06 Just say it          19.8 – 23.8  the microphone, a deck
  07 In tune with you     23.8 – 27.4  the sensor window, three signals
  08 Private by design    27.4 – 31.0  the audio disappears, memories remain
  09 Make it yours        31.0 – 35.0  off the wrist, back into the light
*/

const PI = Math.PI
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const col = (h) => new THREE.Color(h)

export const layout = { mobile: false, aspect: 1.6 }

export const S = {
  // camera (targets; Stage smooths)
  cam: V3(0, 0, 8),
  tgt: V3(),
  fov: 30,
  camAz: 0,
  // floating band pose (targets)
  float: { pos: V3(), rx: 0, ry: PI, rz: 0, scale: 1 },
  // worn: k = 0 floating … 1 on the arm; slide = cm from the wrist towards the fingertips; cinch = loop scale
  worn: { k: 0, slide: 24, cinch: 1.22 },
  // the arm, expressed by where the band sits on it (world), the fingers' direction and the back of the wrist
  armT: { pos: V3(), f: V3(1, 0, 0), d: V3(0, 1, 0) },
  // composed by the Stage
  band: { matrix: new THREE.Matrix4(), alpha: 1, explode: 0, wrapAlpha: 1, ledG: 0, ledR: 0 },
  arm: { matrix: new THREE.Matrix4(), alpha: 0, solid: 1, rim: 0, scan: 0, contact: 0, pulse: 0, tint: 0, warm: 0 },
  pts: {}, // world positions of named points on the band (Stage)
  light: { spotPos: V3(), spotTgt: V3(), spot: 0, spotAngle: 0.2, key: 0, rim: 0, fill: 0, top: 0, env: 0 },
  dust: 0,
  dustKick: 0,
  haptic: { age: 0, a: 0 },
  ctx: { a: 0, draw: [0, 0, 0], fold: [0, 0, 0], mem: [0, 0, 0], path: [0, 0, 0], act: [0, 0, 0], crumb: 0 },
  voice: { a: 0, draw: 0, fold: 0, listen: 0, create: 0 },
  health: { a: 0, hr: 0, temp: 0, motion: 0 },
  priv: { a: 0, waves: 0, dissolve: 0, remain: 0, del: 0 },
  fin: { a: 0, cta: 0 },
  beat: 0,
  bg: { top: col('#000'), bot: col('#000'), glow: col('#000'), glowA: 0, glowX: 0.5, glowY: 0.5, glowR: 0.5 },
  exposure: 1,
}

/* ------------------------------------------------------------------ */
/* Geometry helpers (also used to aim the camera at parts of the band) */
/* ------------------------------------------------------------------ */
const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler(0, 0, 0, 'YXZ')
const _s = V3()
const _v = V3()
const _f = V3()
const _d = V3()
const _z = V3()

export function armBasis(f, d, out) {
  _f.copy(f).normalize()
  _d.copy(d).addScaledVector(_f, -_d.copy(d).dot(_f)).normalize()
  _z.crossVectors(_f, _d)
  return out.makeBasis(_f, _d, _z)
}

// where the band's centre sits in arm space (cm) for a given slide and cinch: resting on top of the arm
export function wornOffset(slide, cinch, out) {
  const x = WRIST_X + slide
  return out.set(x, armTop(x) - 1.8 * cinch, 0.105 * cinch)
}

function floatMatrix(pos, rx, ry, rz, scale, out) {
  _e.set(rx, ry, rz, 'YXZ')
  _q.setFromEuler(_e)
  return out.compose(pos, _q, _s.setScalar(SB * scale))
}
function wornMatrix(pos, f, d, cinch, out) {
  armBasis(f, d, out)
  _q.setFromRotationMatrix(out).multiply(WORN_BASIS)
  return out.compose(pos, _q, _s.setScalar(SB * cinch))
}

/* ------------------------------------------------------------------ */
/* Tracks                                                               */
/* ------------------------------------------------------------------ */
// Camera: target + spherical offset (dist, azimuth, elevation), so moves arc.
const toArr = (v) => [v.x, v.y, v.z]

function buildTracks(m) {
  const D = (d, k = 1.7) => (m ? d * k : d)
  const T = {}

  /* ---- the floating band ---- */
  T.ry = track([
    [0, PI + 0.3],
    [2.0, PI + 0.12],
    [2.4, PI + 0.22],
    [3.6, PI + 0.62],
    [4.2, PI + 0.95],
    [4.7, 2 * PI + 0.3],
    [5.1, 2 * PI + 0.35],
    [5.55, 2 * PI + 0.4],
    [5.9, 2 * PI + PI / 2 + 0.4],
    [7.3, 2 * PI + PI / 2 + 0.55],
    [7.9, 3 * PI + 0.4],
    [8.4, 3 * PI + 0.5],
    [31, 3 * PI + 0.5],
    [33.0, 3 * PI + 0.35],
    [35, 3 * PI + 0.85],
  ])
  T.rx = track([
    [0, 0.05],
    [2.0, 0.08],
    [3.0, 0.3],
    [3.6, 0.34],
    [4.2, 0.36],
    [4.7, 0.9],
    [5.1, 0.88],
    [5.55, 0.8],
    [5.9, 0.2],
    [7.3, 0.22],
    [7.9, 0.3],
    [33.0, 0.3],
    [35, 0.36],
  ])
  T.rz = track([
    [0, 0],
    [35, 0],
  ])
  T.pos = track3([
    [0, [0, 0, 0]],
    [8.4, [0, 0, 0]],
    [32.2, [0, 0, 0]],
    [33.2, [0, m ? 0.55 : 0.18, 0]],
    [35, [0, m ? 0.6 : 0.22, 0]],
  ])
  T.scale = track([
    [0, 1],
    [35, 1],
  ])

  /* ---- the arm, and the band on it ---- */
  const F1 = m ? [0.08, 0.96, -0.26] : [0.97, 0.06, -0.24]
  const D1 = m ? [-0.05, 0.28, 0.96] : [-0.06, 0.8, 0.6]
  T.armF = track3([
    [8.2, F1],
    [31, F1],
  ])
  T.armD = track3([
    [8.2, D1],
    [10.4, D1],
    [11.4, m ? [-0.2, 0.2, 0.96] : [0.0, 0.95, 0.3]],
    [19.6, m ? [-0.2, 0.2, 0.96] : [0.0, 0.95, 0.3]],
    [20.4, m ? [-0.1, 0.25, 0.96] : [-0.04, 0.86, 0.5]],
    [31, m ? [-0.1, 0.25, 0.96] : [-0.04, 0.86, 0.5]],
    [31.6, D1],
  ])
  T.armP = track3([
    [8.2, [0, 0, 0]],
    [35, [0, 0, 0]],
  ])
  const OUT = 22 - WRIST_X // band just beyond the fingertips
  T.slide = track([
    [8.2, OUT],
    [8.95, OUT],
    [9.95, 0],
    [31.35, 0],
    [32.35, OUT + 2],
  ])
  // the loop loosens to pass over the hand, then cinches (the Stage adds the physical settle)
  T.cinch = track([
    [8.2, 1.22],
    [9.9, 1.22],
    [10.08, 1.0],
    [31.2, 1.0],
    [31.5, 1.22],
  ])
  T.wornK = track([
    [8.3, 0],
    [8.95, 1],
    [32.3, 1],
    [33.1, 0],
  ])

  // world position of a band point at story time t (floating or worn, before smoothing)
  const M = new THREE.Matrix4()
  const bandAt = (t, name, explode = 0) => {
    const k = T.wornK(t)
    if (k < 0.5) floatMatrix(T.pos(t, V3()), T.rx(t), T.ry(t), T.rz(t), T.scale(t), M)
    else wornMatrix(T.armP(t, V3()), T.armF(t, V3()), T.armD(t, V3()), T.cinch(t), M)
    return toArr(pointLocal(name, explode, V3()).applyMatrix4(M))
  }
  // a camera direction expressed in the arm's frame (fingers f, back of the wrist d, across s) → az / el
  const armDir = (t, a, b, c) => {
    const f = T.armF(t, V3()).normalize()
    const d = T.armD(t, V3())
    d.addScaledVector(f, -d.dot(f)).normalize()
    const s = V3().crossVectors(f, d)
    const v = V3().addScaledVector(f, a).addScaledVector(d, b).addScaledVector(s, c).normalize()
    return { az: Math.atan2(v.x, v.z), el: Math.asin(v.y) }
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

  /* ---- camera ---- */
  const micV = armDir(20.8, 0.78, 0.55, 0.3)
  const senV = armDir(25.2, 0.25, -0.9, 0.35)
  T.tgt = track3([
    [0, add(bandAt(0.4, 'emblem'), [0.12, -0.04, 0])],
    [0.4, add(bandAt(0.4, 'emblem'), [0.12, -0.04, 0])],
    [1.4, add(bandAt(1.4, 'flap'), [-0.05, 0.0, 0])],
    [2.05, add(bandAt(2.05, 'wordmark'), [0, 0.02, 0])],
    [2.4, add(bandAt(2.4, 'wordmark'), [0.1, 0, 0])],
    [3.1, [0, m ? -0.9 : -0.42, 0]],
    [3.6, [0, m ? -0.4 : -0.1, 0]],
    [4.2, [0, 0, 0]],
    [4.7, add(bandAt(4.7, 'mic'), [0.1, -0.05, 0])],
    [5.05, add(bandAt(5.05, 'mic'), [0.15, -0.08, 0])],
    [5.45, add(bandAt(5.45, 'sensor'), [0, 0.05, 0])],
    [5.6, add(bandAt(5.6, 'sensor'), [0, 0.02, 0])],
    [5.95, [-0.55, 0.02, 0]],
    [7.3, [-0.6, 0.02, 0]],
    [7.9, [0, 0, 0]],
    [8.3, [0, 0, 0]],
    [8.95, m ? [0.1, -2.2, 0] : [-2.1, -0.1, 0]],
    [9.95, m ? [0, 0.2, 0] : [0.3, 0.05, 0]],
    [10.4, [0, 0.05, 0]],
    [11.2, [0, m ? -0.2 : 0.15, 0]],
    [11.9, m ? [0, -0.6, 0] : [0, 0.35, 0.6]],
    [15.4, m ? [0, -0.6, 0] : [0, 0.35, 0.6]],
    [16.2, m ? [0, -0.9, 0] : [0, 0.3, 1.1]],
    [19.4, m ? [0, -0.9, 0] : [0, 0.3, 1.1]],
    [20.3, add(bandAt(20.3, 'mic'), [0, 0.02, 0])],
    [21.6, add(bandAt(21.6, 'mic'), [0, 0.02, 0])],
    [22.3, m ? add(bandAt(22.3, 'mic'), [0, 1.2, 0]) : add(bandAt(22.3, 'mic'), [0, 0.55, 0.6])],
    [23.5, m ? add(bandAt(23.5, 'mic'), [0, 1.2, 0]) : add(bandAt(23.5, 'mic'), [0, 0.55, 0.6])],
    [24.4, add(bandAt(24.4, 'sensor'), [0, 0, 0])],
    [27.0, add(bandAt(27.0, 'sensor'), [0, 0, 0])],
    [27.9, [0, m ? -0.3 : 0.3, 0]],
    [31.0, [0, m ? -0.3 : 0.3, 0]],
    [31.5, m ? [0, -0.6, 0] : [-0.6, 0, 0]],
    [32.3, m ? [0, -0.6, 0] : [-1.2, 0, 0]],
    [33.2, [0, m ? -0.75 : -0.62, 0]],
    [35, [0, m ? -0.8 : -0.66, 0]],
  ])
  T.dist = track([
    [0, D(1.35, 1.25)],
    [0.4, D(1.35, 1.25)],
    [1.4, D(1.55, 1.3)],
    [2.05, D(1.3, 1.3)],
    [2.4, D(1.8, 1.4)],
    [3.1, D(7.4, 1.75)],
    [3.6, D(7.0)],
    [4.2, D(6.8)],
    [4.7, D(2.0, 1.5)],
    [5.05, D(1.85, 1.5)],
    [5.45, D(3.0, 1.5)],
    [5.6, D(3.1, 1.5)],
    [5.95, D(6.0)],
    [7.3, D(6.2)],
    [7.9, D(7.2)],
    [8.3, D(7.4)],
    [8.95, D(10.5, 1.55)],
    [9.95, D(7.6, 1.55)],
    [10.4, D(7.2, 1.55)],
    [11.2, D(6.2, 1.6)],
    [11.9, D(10.0, 1.6)],
    [15.4, D(10.4, 1.6)],
    [16.2, D(12.0, 1.6)],
    [19.4, D(12.4, 1.6)],
    [20.3, D(2.4, 1.4)],
    [21.6, D(2.1, 1.4)],
    [22.3, D(4.8, 1.8)],
    [23.5, D(5.0, 1.8)],
    [24.4, D(4.6, 1.5)],
    [27.0, D(4.3, 1.5)],
    [27.9, D(14, 1.5)],
    [31.0, D(15, 1.5)],
    [31.5, D(10, 1.6)],
    [32.3, D(10.5, 1.6)],
    [33.2, D(8.8, 1.7)],
    [35, D(8.4, 1.7)],
  ])
  T.az = track([
    [0, 0.55],
    [0.4, 0.55],
    [1.4, 0.2],
    [2.05, -0.3],
    [2.4, -0.35],
    [3.1, 0],
    [4.2, 0],
    [4.7, 0.25],
    [5.05, 0.2],
    [5.45, 0.05],
    [5.95, 0.1],
    [7.3, 0.12],
    [7.9, 0],
    [8.3, 0],
    [8.95, m ? 0 : 0.1],
    [9.95, m ? 0 : 0.05],
    [10.4, 0.05],
    [11.2, m ? -0.4 : -0.55],
    [11.9, m ? -0.2 : -1.2],
    [15.4, m ? -0.25 : -1.25],
    [16.2, m ? -0.2 : -1.1],
    [19.4, m ? -0.25 : -1.15],
    [20.3, micV.az],
    [21.6, micV.az - 0.08],
    [22.3, m ? micV.az * 0.5 : micV.az * 0.6],
    [23.5, m ? micV.az * 0.5 : micV.az * 0.6],
    [24.4, senV.az],
    [27.0, senV.az + 0.2],
    [27.9, m ? -0.3 : -0.9],
    [31.0, m ? -0.35 : -1.0],
    [31.5, -0.2],
    [32.3, -0.1],
    [33.2, 0],
    [35, 0],
  ])
  T.el = track([
    [0, 0.08],
    [1.4, 0.05],
    [2.05, 0.06],
    [3.1, 0.12],
    [4.2, 0.14],
    [4.7, 0.5],
    [5.05, 0.5],
    [5.45, 0.5],
    [5.95, 0.18],
    [7.3, 0.2],
    [7.9, 0.14],
    [8.3, 0.14],
    [8.95, m ? 0.08 : 0.16],
    [9.95, m ? 0.12 : 0.2],
    [10.4, 0.22],
    [11.2, m ? 0.3 : 0.42],
    [11.9, m ? 0.2 : 0.62],
    [15.4, m ? 0.22 : 0.62],
    [16.2, m ? 0.2 : 0.55],
    [19.4, m ? 0.2 : 0.55],
    [20.3, micV.el],
    [21.6, micV.el],
    [22.3, micV.el * 0.6],
    [23.5, micV.el * 0.6],
    [24.4, senV.el],
    [27.0, senV.el + 0.05],
    [27.9, 0.3],
    [31.0, 0.3],
    [31.5, 0.14],
    [32.3, 0.14],
    [33.2, 0.08],
    [35, 0.06],
  ])
  T.bandAt = bandAt

  // Fixed "stages" in world space for the story's graphics, laid out as screen offsets from the
  // camera at a reference moment (so they compose for that shot but stay put in the world).
  const frame = (t0) => {
    const o = T.tgt(t0, V3())
    const a = T.az(t0)
    const e = T.el(t0)
    const dir = V3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a))
    const r = V3().crossVectors(V3(0, 1, 0), dir).normalize()
    const u = V3().crossVectors(dir, r).normalize()
    return { o, r, u, dir, dist: T.dist(t0) }
  }
  T.frames = { ctx: frame(13.2), act: frame(17.4), voice: frame(22.8), priv: frame(29.2) }
  return T
}

let TR = buildTracks(false)
export const tracks = () => TR

// world point at screen offset (x right, y up, z towards the camera; world units) in a story frame
export function framePoint(key, x, y, out, z = 0) {
  const f = TR.frames[key]
  return out.copy(f.o).addScaledVector(f.r, x).addScaledVector(f.u, y).addScaledVector(f.dir, z)
}

export function ensureLayout(width, height) {
  const mobile = width / height < 0.85
  layout.aspect = width / height
  if (mobile !== layout.mobile) {
    layout.mobile = mobile
    TR = buildTracks(mobile)
  }
}
if (typeof window !== 'undefined') ensureLayout(window.innerWidth, window.innerHeight)

/* ------------------------------------------------------------------ */
const tmpC = new THREE.Color()

export function computeState(t, time) {
  const m = layout.mobile

  /* ---------- camera ---------- */
  TR.tgt(t, S.tgt)
  const dist = TR.dist(t)
  const az = TR.az(t)
  const el = TR.el(t)
  S.camAz = az
  S.cam.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist).add(S.tgt)
  S.fov = 30

  /* ---------- band (floating) ---------- */
  const F = S.float
  F.rx = TR.rx(t)
  F.ry = TR.ry(t)
  F.rz = TR.rz(t)
  TR.pos(t, F.pos)
  F.scale = TR.scale(t)
  // a slow idle turn while it hangs in the studio (never under reduced motion: time is 0 there)
  F.ry += 0.035 * Math.sin(time * 0.21) * (1 - w(t, 3.2, 3.6)) + 0.03 * Math.sin(time * 0.17) * w(t, 33, 34)

  /* ---------- band (worn) and the arm ---------- */
  const Wn = S.worn
  Wn.k = TR.wornK(t)
  Wn.slide = TR.slide(t)
  Wn.cinch = TR.cinch(t)
  TR.armP(t, S.armT.pos)
  TR.armF(t, S.armT.f)
  TR.armD(t, S.armT.d)

  const A = S.arm
  A.alpha = env(t, 8.2, 8.55, 32.3, 32.9)
  A.scan = range(t, 8.25, 9.1)
  A.solid = 1 - 0.88 * env(t, 23.9, 24.5, 26.9, 27.5)
  A.rim = 0.4 + 0.6 * env(t, 8.2, 8.8, 10.3, 11.0)
  A.contact = env(t, 9.9, 10.15, 11.2, 12.0) * 0.9 + env(t, 24.3, 24.8, 26.9, 27.4)
  A.pulse = env(t, 24.5, 24.8, 26.9, 27.3)
  A.tint = env(t, 24.3, 24.8, 26.9, 27.4)
  A.warm = env(t, 25.25, 25.6, 26.0, 26.4)

  /* ---------- band details ---------- */
  const B = S.band
  B.alpha = 1
  B.explode = w(t, 5.9, 6.6) * (1 - w(t, 7.2, 7.8))
  B.wrapAlpha = 1 - 0.8 * env(t, 5.85, 6.3, 7.25, 7.7) - 0.82 * env(t, 24.0, 24.5, 26.9, 27.4)
  const period = 60 / 62
  const ph = (time % period) / period
  const beat = Math.exp(-ph * 6.5) * (1 - Math.exp(-ph * 60))
  S.beat = beat
  const ledOn = env(t, 5.2, 5.4, 5.7, 5.95) + env(t, 24.5, 24.8, 26.9, 27.3)
  B.ledG = clamp(ledOn) * (0.35 + 0.65 * beat)
  B.ledR = clamp(env(t, 24.9, 25.2, 26.9, 27.3)) * (0.6 + 0.2 * Math.sin(time * 4.3))

  /* ---------- 01 ---------- */
  S.dust = 0.9 * env(t, 0.3, 1.0, 2.6, 3.4) + 0.5 * env(t, 32.8, 33.6, 40, 41)
  S.dustKick = env(t, 25.6, 25.9, 26.5, 26.9) // 07 · motion: your scroll shoves the dust

  /* ---------- haptics (03 settle, 05 done) ---------- */
  const H = S.haptic
  const h1 = 10.1
  const h2 = 18.0
  const hs = t < h2 - 0.3 ? h1 : h2
  H.age = Math.max(0, t - hs)
  H.a = t > hs && H.age < 0.9 ? 1 - smooth(range(H.age, 0.4, 0.9)) : 0

  /* ---------- 04 / 05 · context → memory → action ---------- */
  const C = S.ctx
  C.a = env(t, 11.4, 11.8, 19.6, 20.0)
  const starts = [12.0, 13.1, 14.2]
  for (let i = 0; i < 3; i++) {
    const s = starts[i]
    C.draw[i] = range(t, s, s + 0.45)
    C.fold[i] = range(t, s + 0.72, s + 1.05)
    C.mem[i] = smooth(range(t, s + 0.95, s + 1.2)) * (1 - smooth(range(t, 19.5, 19.9)))
    C.path[i] = range(t, 15.9 + 0.55 * i, 16.4 + 0.55 * i) * (1 - smooth(range(t, 19.3, 19.8)))
    C.act[i] = smooth(range(t, 16.3 + 0.55 * i, 16.55 + 0.55 * i)) * (1 - smooth(range(t, 19.4, 19.9)))
  }
  // REAL WORLD → VEXO → MEMORY → ACTION
  C.crumb = t < 12.2 ? 0 : t < 12.75 ? 1 : t < 13.05 ? 2 : t < 16.25 ? 3 : 4

  /* ---------- 06 · voice ---------- */
  const Vc = S.voice
  Vc.a = env(t, 20.2, 20.5, 23.3, 23.8)
  Vc.draw = range(t, 20.55, 21.55)
  Vc.fold = range(t, 21.45, 21.8)
  Vc.listen = env(t, 20.5, 20.65, 21.6, 21.8)
  Vc.create = range(t, 21.85, 23.2)

  /* ---------- 07 · health ---------- */
  const Hl = S.health
  Hl.a = env(t, 24.2, 24.5, 26.95, 27.35)
  Hl.hr = range(t, 24.6, 25.0)
  Hl.temp = range(t, 25.2, 25.6)
  Hl.motion = range(t, 25.8, 26.2)

  /* ---------- 08 · privacy ---------- */
  const P = S.priv
  P.a = env(t, 27.6, 28.0, 30.7, 31.1)
  P.waves = range(t, 27.8, 28.6)
  P.dissolve = range(t, 28.9, 29.7)
  P.remain = smooth(range(t, 29.3, 29.7)) * (1 - smooth(range(t, 30.7, 31.05)))
  P.del = range(t, 30.05, 30.45)

  /* ---------- 09 ---------- */
  S.fin.a = w(t, 33.0, 33.6)
  S.fin.cta = w(t, 33.6, 34.2)

  /* ---------- light ---------- */
  lights(t, time, m)

  /* ---------- background ---------- */
  const bg = S.bg
  bg.top.setRGB(0, 0, 0)
  bg.bot.setRGB(0.008, 0.008, 0.009)
  bg.glow.set('#16181c')
  bg.glowA =
    0.35 * env(t, 2.2, 3.0, 3.5, 4.0) +
    0.45 * env(t, 5.9, 6.5, 7.4, 8.0) +
    0.35 * env(t, 9.6, 10.3, 11.0, 11.6) +
    0.35 * env(t, 15.8, 16.6, 19.2, 19.8) +
    0.4 * env(t, 21.9, 22.6, 23.4, 24.0) +
    0.6 * w(t, 32.8, 34.0)
  bg.glowX = 0.5
  bg.glowY = m ? 0.4 : 0.48
  bg.glowR = 0.55
  // the sensor's own light in the room
  if (B.ledG > 0.001) {
    const g = clamp(ledOn)
    bg.glow.lerp(tmpC.set('#0b2e1a'), g)
    bg.glowA = Math.max(bg.glowA, 0.45 * g)
  }
}

/*
  Light. The studio environment (strip softboxes, baked once) gives the titanium its edges and the
  weave its sheen; `env` fades it. The key / rim / fill / top lights ride with the camera, like a
  product photographer's rig, so the band keeps its look as we move around it. The spot is the
  single raking light of the opening: a thin blade grazing the weave.
*/
function lights(t, time, m) {
  const L = S.light
  // 01 · raking light across the fabric, then across the engraving
  const open = env(t, 0.3, 0.75, 2.3, 3.0)
  const sweep = smooth(range(t, 0.35, 1.7))
  const tg = TR.tgt
  tg(t, L.spotTgt)
  // aim sweeps across the frame; the source stays low and to the side, so the light grazes the surface
  const across = lerp(-0.7, 0.55, sweep) + lerp(0, -0.5, smooth(range(t, 1.6, 2.2))) + lerp(0, 0.6, smooth(range(t, 2.0, 2.5)))
  L.spotTgt.x += across
  L.spotPos.set(L.spotTgt.x - 2.4, L.spotTgt.y + 0.55, L.spotTgt.z + 0.55)
  L.spot = 26 * open
  L.spotAngle = 0.22

  // studio
  const studio = w(t, 2.0, 3.0) * (1 - 0.35 * env(t, 27.6, 28.2, 30.7, 31.2)) * (1 - 0.3 * env(t, 30.9, 31.3, 32.3, 33.0))
  const health = env(t, 23.9, 24.5, 26.9, 27.4)
  const fin = w(t, 32.5, 33.6)
  L.env = 0.06 + 1.0 * studio * (1 - 0.65 * health) + 0.35 * fin
  L.key = 2.4 * studio * (1 - 0.6 * health) + 1.2 * fin
  L.rim = 0.3 + 2.4 * studio + 1.6 * env(t, 27.6, 28.2, 30.7, 31.2) + 1.2 * fin
  L.fill = 0.5 * studio * (1 - 0.5 * health) + 0.3 * fin
  L.top = 1.1 * studio + 0.4 * fin

  // 09 · product light: a strip crosses the band once more before the CTA
  const pl = env(t, 32.5, 33.0, 34.6, 35.2)
  if (pl > 0.001) {
    const k = smooth(range(t, 32.6, 34.8)) + 0.04 * Math.sin(time * 0.3)
    L.spotTgt.set(lerp(-1.6, 1.4, k), 0.25, 0.4)
    L.spotPos.set(L.spotTgt.x - 3.5, 1.8, 3.2)
    L.spot = Math.max(L.spot, 14 * pl)
    L.spotAngle = 0.3
  }
}
