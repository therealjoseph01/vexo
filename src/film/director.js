import * as THREE from 'three'
import { track, track3, w, env, range, clamp, lerp, smooth, pulse } from './timeline'
import { ENV } from '../gl/studio'

/*
  THE DIRECTOR'S SCRIPT
  ---------------------
  Every visual value in the film is a pure function of story time `t` (plus wall-clock `time`
  for things that breathe on their own). computeState() writes targets into S; the Stage then
  passes camera and ring through critically damped springs, so the ring moves with weight.

  01 Your sixth sense   0.0 – 3.4
  02 Enter the ring     3.4 – 8.0
  03 The body           8.0 – 11.4
  04 Double tap         11.4 – 15.2
  05 Every app          15.2 – 19.2
  06 Vexo Studio        19.2 – 24.2
  07 Body as an API     24.2 – 27.4
  08 Privacy            27.4 – 30.6
  09 Five days          30.6 – 34.0
  10 Vexo               34.0 – 37.0
*/

const TAU = Math.PI * 2
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)
const col = (h) => new THREE.Color(h)

export const layout = { mobile: false, aspect: 1.6 }

export const S = {
  // camera (targets; Stage smooths)
  cam: V3(0, 0, 12),
  tgt: V3(),
  fov: 30,
  // ring rig (targets)
  ringT: { pos: V3(), rx: 0, ry: 0, rz: 0, scale: 1 },
  // ring rig (smoothed, built by Stage)
  ring: { pos: V3(), quat: new THREE.Quaternion(), scale: 1, opacity: 1, rx: 0, ry: 0, rz: 0 },
  plane: new THREE.Matrix4(), // the ring's orbital plane (local XY), for traces that circle it
  led: { g: 0, r: 0 },
  beat: 0,
  hrLive: 62,
  dust: 0,
  dustKick: 0,
  sig: { hr: 0, hrv: 0, spo2: 0, resp: 0, temp: 0, sleep: 0, motion: 0, fold: 0, a: 0 },
  body: { reveal: 0, flow: 0, data: 0, out: 0, a: 0 },
  voice: { tap: 0, wave: 0, front: 0, rings: 0, haptic: 0, ripple: 0, orbit: 0 },
  apps: { a: 0, emerge: 0, threads: 0, market: 0, retract: 0, spin: 0 },
  studio: { a: 0, stream: 0, breath: 0, code: 0, build: 0, wire: 0, credit: 0, shrink: 0 },
  api: { a: 0, grow: 0, packets: 0, collapse: 0 },
  priv: { a: 0, boundary: 0, voice: 0, perms: 0, out: 0 },
  days: { a: 0, small: 0, arc: 0, day: 0, level: 1, dock: 0, charge: 0, sink: 0 },
  fin: { a: 0 },
  bg: { top: col('#000'), bot: col('#000'), glow: col('#000'), glowA: 0, glowX: 0.5, glowY: 0.5, glowR: 0.5 },
  exposure: 1,
}

/* ------------------------------------------------------------------ */
/* Tracks                                                               */
/* ------------------------------------------------------------------ */
// Camera is expressed as a target + spherical offset (dist, azimuth, elevation) so moves arc.
function buildTracks(m) {
  const D = (d, dm) => (m ? (dm ?? d * 1.62) : d)
  const T = {}
  T.tgt = track3([
    [0, [0, -0.05, 0]],
    [1.1, [0, -0.1, 0]],
    [2.2, [0, m ? -0.9 : -0.55, 0]], // lift the ring above the title
    [2.9, [0, -0.25, 0]],
    [3.4, [0, 0, 0]],
    [3.95, [0, -0.62, 0]],
    [4.45, [0, -0.96, 0]],
    [5.3, [0, -0.96, 0.02]],
    [6.0, [0, -0.25, 0]],
    [6.7, [0, 0, 0]],
    [8.0, [0, 0, 0]],
    [8.8, [0, m ? -0.2 : 0.1, 0]],
    [11.2, [0, m ? -0.2 : 0.1, 0]],
    [12.0, [0, 0.02, 0.9]],
    [12.4, [0, 0.03, 1.12]],
    [14.5, [0, 0.03, 1.12]],
    [15.3, [0, 0, 0]],
    [15.9, [0, 0.55, 0]],
    [18.6, [0, 0.45, 0]],
    [19.2, [0, 0, 0]],
    [19.8, [0, 0, 0]],
    [21.6, [0, 0, 0]],
    [22.4, [m ? 0 : 0.6, m ? -1.55 : 0, 0]],
    [23.9, [m ? 0 : 0.6, m ? -1.55 : 0, 0]],
    [24.8, [0, m ? -0.3 : 0, 0]],
    [27.4, [0, m ? -0.3 : 0, 0]],
    [28.2, [0, 0, 0]],
    [30.6, [0, m ? -0.25 : 0, 0]],
    [31.6, [0, m ? -0.15 : 0, 0]],
    [33.2, [0, m ? -0.15 : 0, 0]],
    [33.8, [0, -0.55, 0]],
    [34.4, [0, -0.45, 0]],
    [35.2, [0, m ? -1.25 : -0.95, 0]],
    [37, [0, m ? -1.3 : -1.0, 0]],
  ])
  T.dist = track([
    [0, D(13.2, 19)],
    [2.2, D(12.0, 17.8)],
    [2.9, D(9.0, 13.5)],
    [3.4, D(6.2, 9.4)],
    [3.95, D(3.3, 4.4)],
    [4.45, D(2.25, 2.9)],
    [5.3, D(2.05, 2.7)],
    [6.0, D(5.2, 8)],
    [6.7, D(10.4, 16.5)],
    [8.0, D(11.2, 17.5)],
    [8.8, D(11.0, 17)],
    [11.2, D(10.6, 16.5)],
    [12.0, D(5.2, 10.5)],
    [12.4, D(3.55, 8.4)],
    [14.5, D(3.3, 8.0)],
    [15.3, D(9.5, 15)],
    [15.9, D(13.8, 20)],
    [16.8, D(11.4, 16.5)],
    [17.6, D(10.6, 15.5)],
    [18.4, D(14.2, 20.5)],
    [19.2, D(15.0, 22)],
    [19.8, D(10.5, 16)],
    [21.6, D(10.0, 15)],
    [22.4, D(11.2, 17)],
    [23.9, D(11.2, 17)],
    [24.8, D(14.0, 21)],
    [27.4, D(14.2, 21)],
    [28.2, D(11.5, 17)],
    [30.6, D(11.0, 16.5)],
    [31.0, D(13.0, 19)],
    [31.6, D(11.8, 17)],
    [33.2, D(11.8, 17)],
    [33.8, D(10.4, 15.5)],
    [34.4, D(11.5, 17)],
    [35.2, D(13.6, 19.5)],
    [37, D(12.8, 18.8)],
  ])
  T.az = track([
    [0, 0],
    [3.4, 0],
    [4.45, m ? 0.2 : 0.42],
    [5.3, m ? 0.26 : 0.55],
    [6.0, 0],
    [15.3, 0],
    [15.9, 0.2],
    [16.8, TAU * 0.32],
    [17.6, TAU * 0.62],
    [18.4, TAU * 0.9],
    [19.2, TAU],
    [37, TAU],
  ])
  T.el = track([
    [0, 0.03],
    [2.2, 0.04],
    [3.4, 0.03],
    [3.95, 0.5],
    [4.45, 0.66],
    [5.3, 0.62],
    [6.0, 0.5],
    [6.7, 0.3],
    [8.0, 0.28],
    [8.8, 0.04],
    [11.2, 0.05],
    [12.0, 0.34],
    [12.4, 0.36],
    [14.5, 0.33],
    [15.3, 0.32],
    [15.9, 0.34],
    [16.8, 0.16],
    [17.6, 0.12],
    [18.4, 0.42],
    [19.2, 0.3],
    [19.8, 0.06],
    [24.8, 0.08],
    [27.4, 0.08],
    [28.2, 0.03],
    [30.6, 0.05],
    [31.6, 0.1],
    [33.2, 0.1],
    [33.8, 0.3],
    [34.4, 0.22],
    [35.2, 0.04],
    [37, 0.05],
  ])

  // ring rig
  const HALF = Math.PI / 2
  T.rx = track([
    [0, HALF - 0.19],
    [2.2, HALF - 0.3],
    [2.9, 0.7],
    [3.4, 0.05],
    [5.3, 0.02],
    [6.0, -0.45],
    [6.7, -1.02],
    [8.0, -1.02],
    [8.8, 0.3],
    [11.2, 0.26],
    [12.0, HALF - 0.05],
    [14.5, HALF],
    [15.3, -0.6],
    [15.9, -0.95],
    [19.2, -0.95],
    [19.8, 0.25],
    [23.9, 0.2],
    [24.8, 0.34],
    [27.4, 0.34],
    [28.2, 0.22],
    [30.6, 0.3],
    [33.2, 0.32],
    [33.8, HALF],
    [34.4, HALF],
    [35.2, HALF - 0.2],
    [37, HALF - 0.24],
  ])
  T.ry = track([
    [0, 0.35],
    [2.2, 0.85],
    [3.4, 0.05],
    [5.3, 0],
    [6.7, 0],
    [8.0, 0.1],
    [8.8, -0.62],
    [11.2, -0.5],
    [12.0, 0],
    [15.3, 0],
    [19.8, 0.5],
    [23.9, 0.42],
    [24.8, -0.4],
    [27.4, -0.3],
    [28.2, 0.2],
    [30.6, -0.2],
    [33.2, -0.55],
    [33.8, -0.1],
    [34.4, 0],
    [37, 0.6],
  ])
  // roll about the ring's own axis: which details (mic, sensor) face the lens
  const PI = Math.PI
  T.rz = track([
    [0, PI],
    [2.2, PI],
    [3.4, TAU], // sensor pill at the bottom for the macro
    [5.3, TAU],
    [6.7, 3 * PI], // half roll on the way out: mic in front, pill visible through the aperture
    [8.0, 3 * PI + 0.2],
    [8.8, 3 * PI + 0.35],
    [11.2, 3 * PI + 0.35],
    [12.0, 2 * TAU], // mic to the lens
    [15.3, 2 * TAU],
    [19.2, 2 * TAU + 1.6],
    [19.8, 2 * TAU + 1.9],
    [23.9, 2 * TAU + 2.2],
    [30.6, 2 * TAU + 2.9],
    [33.8, 2 * TAU + 3.1],
    [35.2, 2 * TAU + PI],
    [37, 2 * TAU + PI + 0.2],
  ])
  T.pos = track3([
    [0, [0, 0, 0]],
    [8.0, [0, 0, 0]],
    [8.8, [0, m ? 0.5 : 0.05, 1.2]],
    [11.2, [0, m ? 0.5 : 0.05, 1.2]],
    [12.0, [0, 0, 0]],
    [19.8, [0, 0, 0]],
    [21.6, [0, 0, 0]],
    [22.4, [m ? 0 : -2.35, m ? 1.55 : 0.1, 0]],
    [23.9, [m ? 0 : -2.35, m ? 1.55 : 0.1, 0]],
    [24.8, [0, m ? 0.4 : 0, 0]],
    [27.4, [0, m ? 0.4 : 0, 0]],
    [28.2, [0, m ? 1.15 : 0, 0]],
    [30.6, [0, m ? 1.15 : 0, 0]],
    [31.6, [0, m ? 0.3 : 0.1, 0]],
    [33.2, [0, m ? 0.3 : 0.1, 0]],
    [33.8, [0, -1.22, 0]],
    [34.4, [0, -1.22, 0]],
    [35.2, [0, 0, 0]],
  ])
  T.scale = track([
    [0, 1],
    [8.0, 1],
    [8.8, m ? 0.62 : 0.72],
    [11.2, m ? 0.62 : 0.72],
    [12.0, 1],
    [15.3, 1],
    [19.8, 1],
    [21.6, 1],
    [22.4, m ? 0.5 : 0.82],
    [23.9, m ? 0.5 : 0.82],
    [24.8, 0.82],
    [27.4, 0.82],
    [28.2, m ? 0.6 : 1],
    [30.6, m ? 0.6 : 1],
    [30.95, 0.32],
    [31.3, 0.32],
    [31.6, 0.92],
    [33.2, 0.92],
    [33.8, 0.84],
    [34.4, 0.84],
    [35.2, 1],
  ])
  return T
}

let TR = buildTracks(false)

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
/* Lighting                                                             */
/* ------------------------------------------------------------------ */
const C = {
  white: col('#ffffff'),
  warm: col('#fff1e2'),
  cool: col('#e2ebf7'),
  green: col('#2dff74'),
  red: col('#ff2d24'),
  amber: col('#ffb36b'),
  dawn: col('#ffc58f'),
  moon: col('#8ea6de'),
  ink: col('#e9e9e6'),
}
const tmpC = new THREE.Color()
const tmpV = new THREE.Vector3()

function box(i, dir, up, sx, sy, soft, color, intensity) {
  ENV.uBoxDir.value[i].copy(dir).normalize()
  ENV.uBoxUp.value[i].copy(up)
  ENV.uBoxSize.value[i].set(sx, sy)
  ENV.uBoxSoft.value[i] = soft
  ENV.uBoxCol.value[i].copy(color).multiplyScalar(Math.max(0, intensity))
}
const UP = V3(0, 1, 0)
const dKey = V3(-0.62, 0.55, 0.58)
const dRim = V3(0.78, 0.18, -0.6)
const dTop = V3(0, 1, 0.12)
const dFill = V3(0.45, -0.32, 0.84)
const dSweep = V3()
const dAcc = V3()
const upZ = V3(0, 0, -1)

/* ------------------------------------------------------------------ */
export function computeState(t, time) {
  const m = layout.mobile

  /* ---------- camera ---------- */
  TR.tgt(t, S.tgt)
  const dist = TR.dist(t)
  const az = TR.az(t)
  const el = TR.el(t)
  S.cam.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(dist).add(S.tgt)
  S.fov = 30

  /* ---------- ring rig ---------- */
  const R = S.ringT
  R.rx = TR.rx(t)
  R.ry = TR.ry(t)
  R.rz = TR.rz(t)
  // 05: while the camera circles the ecosystem, the ring turns with it — it stays the still centre
  R.ry += az * w(t, 15.2, 15.9)
  TR.pos(t, R.pos)
  R.scale = TR.scale(t)

  /* ---------- heartbeat (62 bpm) ---------- */
  const period = 60 / 62
  const ph = (time % period) / period
  const beatRaw = Math.exp(-ph * 6.5) * (1 - Math.exp(-ph * 60))
  const beatOn = env(t, 4.3, 4.6, 10.8, 11.2)
  S.beat = beatRaw * beatOn
  ENV.uBeat.value = S.beat * 0.8
  S.hrLive = 62 + Math.round(Math.sin(time * 0.37) * 1.2)

  /* ---------- 01 ---------- */
  S.dust = env(t, 0.05, 0.9, 2.9, 3.7) + 0.55 * env(t, 34.8, 35.6, 40, 41)

  /* ---------- 02 · sensors & signals ---------- */
  const ledGon = env(t, 4.35, 4.6, 5.55, 6.0)
  const ledRon = env(t, 4.85, 5.1, 5.55, 6.0)
  S.led.g = ledGon * (0.35 + 0.65 * beatRaw)
  S.led.r = ledRon * (0.55 + 0.25 * Math.sin(time * 5.1))
  ENV.uSpill.value.setRGB(0, 0, 0).add(tmpC.copy(C.green).multiplyScalar(S.led.g * 0.5)).add(tmpC.copy(C.red).multiplyScalar(S.led.r * 0.4))
  const sg = S.sig
  sg.hr = range(t, 5.25, 5.95)
  sg.hrv = range(t, 5.85, 6.35)
  sg.spo2 = range(t, 6.15, 6.65)
  sg.resp = range(t, 6.45, 6.95)
  sg.temp = range(t, 6.75, 7.25)
  sg.sleep = range(t, 7.05, 7.55)
  sg.motion = range(t, 7.35, 7.85)
  sg.fold = w(t, 8.0, 8.7)
  sg.a = env(t, 5.2, 5.4, 8.3, 8.75)
  ENV.uThermal.value = env(t, 6.8, 7.15, 7.55, 7.95)
  S.dustKick = env(t, 7.3, 7.6, 8.0, 8.4)

  /* ---------- 03 · body ---------- */
  const B = S.body
  B.reveal = range(t, 8.25, 9.35)
  B.flow = env(t, 8.95, 9.3, 10.7, 11.05)
  B.data = range(t, 9.75, 10.55)
  B.out = w(t, 10.9, 11.55)
  B.a = env(t, 8.2, 8.5, 11.1, 11.55)

  /* ---------- 04 · voice ---------- */
  const Vc = S.voice
  const tapA = 12.45
  const tapB = 12.7
  const ageA = (t - tapA) * 3.4
  const ageB = (t - tapB) * 3.4
  ENV.uRipA.value.set(Math.PI, 0.05, Math.max(0, ageA), t > tapA && ageA < 2.2 ? 1 : 0)
  ENV.uRipB.value.set(Math.PI + 0.06, -0.04, Math.max(0, ageB), t > tapB && ageB < 2.2 ? 1 : 0)
  Vc.tap = pulse(t, tapA + 0.02, 0.025) + pulse(t, tapB + 0.02, 0.025)
  Vc.wave = env(t, 12.95, 13.2, 13.95, 14.2)
  Vc.front = range(t, 12.95, 13.95)
  Vc.rings = env(t, 13.15, 13.35, 13.95, 14.15)
  Vc.haptic = env(t, 14.3, 14.36, 14.5, 14.75)
  ENV.uHaptic.value = Vc.haptic
  ENV.uHapticP.value = range(t, 14.3, 14.62)
  Vc.ripple = range(t, 14.4, 15.5) // the haptic ripple grows into the apps orbit
  Vc.orbit = env(t, 14.45, 14.7, 16.0, 16.6)

  /* ---------- 05 · apps ---------- */
  const A = S.apps
  A.emerge = range(t, 15.2, 16.3)
  A.threads = env(t, 15.8, 16.4, 18.9, 19.4)
  A.market = range(t, 17.9, 18.7)
  A.retract = w(t, 19.1, 19.9)
  A.a = env(t, 15.1, 15.4, 19.5, 19.95)
  A.spin = t * 0.08

  /* ---------- 06 · studio ---------- */
  const St = S.studio
  St.a = env(t, 19.7, 19.9, 24.3, 24.8)
  St.stream = range(t, 20.85, 21.45)
  St.breath = pulse(t, 21.55, 0.12)
  St.code = range(t, 21.45, 22.35)
  St.build = range(t, 21.95, 23.35)
  St.wire = range(t, 22.85, 23.55)
  St.credit = range(t, 23.45, 23.85)
  St.shrink = w(t, 24.2, 24.9)

  /* ---------- 07 · api ---------- */
  const Ap = S.api
  Ap.grow = range(t, 24.45, 25.35)
  Ap.packets = env(t, 25.0, 25.4, 26.9, 27.25)
  Ap.collapse = w(t, 27.3, 28.0)
  Ap.a = env(t, 24.3, 24.6, 27.7, 28.05)

  /* ---------- 08 · privacy ---------- */
  const P = S.priv
  P.boundary = range(t, 28.15, 28.8)
  P.voice = range(t, 28.55, 29.45)
  P.perms = range(t, 29.15, 30.25)
  P.out = w(t, 30.35, 30.95)
  P.a = env(t, 28.05, 28.3, 30.5, 30.95)

  /* ---------- 09 · days ---------- */
  const Dy = S.days
  Dy.small = env(t, 30.75, 31.0, 31.3, 31.55)
  Dy.arc = env(t, 31.4, 31.7, 34.1, 34.5)
  Dy.day = clamp((t - 31.65) / 0.31, 0, 5) // 0 → 5 days across the scene
  Dy.dock = w(t, 33.05, 33.55) * (1 - w(t, 34.15, 34.75))
  Dy.charge = range(t, 33.6, 34.05)
  Dy.level = lerp(1 - 0.19 * Dy.day, 1, smooth(Dy.charge))
  Dy.a = env(t, 30.65, 30.9, 34.2, 34.6)

  /* ---------- 10 ---------- */
  S.fin.a = w(t, 34.9, 35.5)

  /* ---------- lighting ---------- */
  lights(t, time, m)

  /* ---------- background ---------- */
  const bg = S.bg
  bg.top.setRGB(0, 0, 0)
  bg.bot.setRGB(0.008, 0.008, 0.009)
  bg.glow.set('#15171b')
  bg.glowA = 0.3 * env(t, 1.0, 2.6, 3.3, 3.9) + 0.5 * env(t, 5.6, 6.6, 8.2, 8.8) + 0.35 * env(t, 8.3, 9.0, 11.0, 11.6) + 0.4 * env(t, 15.2, 16, 19, 19.8) + 0.45 * env(t, 20.2, 21.2, 24, 24.6) + 0.35 * env(t, 24.4, 25.2, 27.4, 28) + 0.5 * env(t, 30.8, 31.6, 34.2, 34.8) + 0.6 * w(t, 35.0, 36.0)
  bg.glowX = 0.5
  bg.glowY = m ? 0.42 : 0.5
  bg.glowR = 0.55
  // green breath of the PPG during the macro shot
  if (S.led.g > 0.001) {
    bg.glow.lerp(tmpC.set('#0d3a1e'), clamp(ledGon))
    bg.glowA = Math.max(bg.glowA, 0.5 * ledGon + 0.25 * S.led.g)
  }
  // five days: each day brings a dawn and a night to the room
  if (Dy.arc > 0.001) {
    const dp = Dy.day % 1
    const day = Math.sin(Math.PI * clamp(dp * 1.15))
    tmpC.copy(C.moon).lerp(C.dawn, day)
    bg.glow.lerp(tmpC.multiplyScalar(0.2), Dy.arc * (1 - Dy.charge))
    bg.glowY = lerp(bg.glowY, 0.42, Dy.arc)
  }
}

function lights(t, time, m) {
  // 01/10 — a single strip of light travels around the ring's circumference
  const sweepA = env(t, 0.02, 0.35, 2.7, 3.6) + env(t, 34.5, 35.3, 40, 41)
  let a = lerp(-2.6, 1.15, smooth(range(t, 0.0, 2.8)))
  if (t > 34) a = lerp(-2.4, 1.0, smooth(range(t, 34.3, 36.6))) + 0.08 * Math.sin(time * 0.25)
  const e = 0.22
  dSweep.set(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
  box(0, dSweep, UP, 0.03, 2.4, 0.012, C.white, 7.5 * sweepA)

  // key / rim / top / fill
  const studio = w(t, 2.1, 3.2) * (1 - 0.75 * env(t, 27.5, 28.1, 30.3, 30.8)) * (1 - w(t, 34.2, 34.8) * 0.8)
  let key = 2.2 * studio
  let rim = 0.4 + 1.9 * studio
  let top = 1.3 * studio
  let fill = 0.55 * studio
  // inside the ring: dark, so the sensor's own light carries the shot
  const macro = env(t, 3.8, 4.3, 5.4, 5.9)
  key = lerp(key, 0.5, macro)
  top = lerp(top, 0.28, macro)
  rim = lerp(rim, 1.1, macro)
  fill = lerp(fill, 0.25, macro)
  // privacy: darkness, one rim light
  const dark = env(t, 27.4, 28.1, 30.4, 30.9)
  rim = lerp(rim, 2.4, dark)
  // final studio: brighter, cleaner
  // the dock needs an edge to read as an object
  rim = lerp(rim, 3.0, S.days.dock)
  const fin = w(t, 35.0, 36.0)
  key = lerp(key, 2.6, fin)
  top = lerp(top, 1.5, fin)
  rim = lerp(rim, 2.2, fin)
  fill = lerp(fill, 0.7, fin)

  // 04: the close-up gets product-shot strips instead of broad boxes (crisp lines on the band)
  const vo = env(t, 11.6, 12.2, 14.9, 15.4)
  key = lerp(key, 2.6, vo)
  top = lerp(top, 0.55, vo)
  rim = lerp(rim, 2.2, vo)

  const keyC = tmpC.copy(C.warm)
  // large, soft sources so the titanium reads as a gradient, not black glass with specks
  box(1, dKey, UP, lerp(0.95, 0.07, vo), lerp(0.55, 1.4, vo), lerp(0.28, 0.03, vo), keyC, key)
  box(2, dRim, UP, 0.07, 1.25, 0.035, C.white, rim)
  box(3, dTop, upZ, 1.2, 0.9, 0.35, C.cool, top)
  box(4, dFill, UP, 1.4, 0.07, 0.06, C.cool, fill)

  // accent: day light for the five days, haptic flash, studio breath
  const Dy = S.days
  if (Dy.arc > 0.001) {
    const da = Dy.day * TAU + 2.2
    const dp = Dy.day % 1
    const day = Math.sin(Math.PI * clamp(dp * 1.15))
    dAcc.set(Math.sin(da), 0.25 + 0.5 * day, Math.cos(da))
    tmpC.copy(C.moon).lerp(C.dawn, day)
    box(5, dAcc, UP, 0.5, 0.3, 0.12, tmpC, (1.2 + 2.2 * day) * Dy.arc * (1 - Dy.charge))
  } else {
    const br = S.studio.breath + S.voice.haptic * 0.2
    dAcc.set(0.2, 0.3, 1)
    box(5, dAcc, UP, 1.4, 1.0, 0.3, C.white, br * 1.6)
  }

  // env room
  const room = 0.012 + 0.07 * studio * (1 - 0.6 * macro) + 0.03 * fin
  ENV.uEnvTop.value.setRGB(room, room, room * 1.05)
  ENV.uEnvBot.value.setRGB(room * 0.3, room * 0.3, room * 0.32)
  ENV.uEnvFloor.value.setRGB(room * 0.15, room * 0.15, room * 0.15)
  ENV.uTime.value = time
}
