import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, computeState, ensureLayout, layout } from '../film/director'
import { film, updaters } from '../film/store'
import { Ring } from './Ring'
import { Dust } from './Dust'
import { Signals } from './Signals'
import { Body } from './Body'
import { Voice } from './Voice'
import { Ecosystem } from './Ecosystem'
import { Network } from './Network'
import { Privacy } from './Privacy'
import { Days } from './Days'
import { Dock } from './Dock'
import { DEBUG } from '../Debug'

// QA: #t4~xb disables the body, ~xs signals, ~xv voice, ~xr ring, ~xd dust, ~xk dock
const off = (k) => typeof window !== 'undefined' && new RegExp('~x[a-z]*' + k).test(window.location.hash)
const v = new THREE.Vector3()
const qBase = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)
const eul = new THREE.Euler(0, 0, 0, 'YXZ')
const qe = new THREE.Quaternion()
const planeQ = new THREE.Quaternion()
const one = new THREE.Vector3(1, 1, 1)

// Exact critically damped spring step (stable at any frame time).
function spring(st, key, target, omega, dt) {
  const x = st[key]
  const vk = key + 'V'
  const vel = st[vk] || 0
  const y = x - target
  const ex = Math.exp(-omega * dt)
  const tmp = (vel + omega * y) * dt
  st[key] = (y + tmp) * ex + target
  st[vk] = (vel - omega * tmp) * ex
}

const sm = { cx: 0, cy: 0, cz: 12, tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, px: 0, py: 0, pz: 0, s: 1, init: false }

function Director() {
  if (!film.marks.tree) film.marks.tree = performance.now()
  const size = useThree((s) => s.size)
  ensureLayout(size.width, size.height)
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const time = film.reduced ? 0 : state.clock.elapsedTime
    film.time = time
    computeState(film.t, time)

    // pointer parallax (desktop only), very gentle
    const px = film.finePointer ? film.pointer.x : 0
    const py = film.finePointer ? film.pointer.y : 0
    sm.px += (px - sm.px) * (1 - Math.exp(-dt * 2))
    sm.py += (py - sm.py) * (1 - Math.exp(-dt * 2))

    const T = S.ringT
    if (!sm.init || film.reduced || film.snap) {
      film.snap = false
      Object.assign(sm, { cx: S.cam.x, cy: S.cam.y, cz: S.cam.z, tx: S.tgt.x, ty: S.tgt.y, tz: S.tgt.z, rx: T.rx, ry: T.ry, rz: T.rz, qx: T.pos.x, qy: T.pos.y, qz: T.pos.z, s: T.scale, init: true })
    } else {
      // camera: a dolly with weight; ring: a heavier object (slightly slower)
      const oc = 7.5
      const or = 6.2
      spring(sm, 'cx', S.cam.x, oc, dt)
      spring(sm, 'cy', S.cam.y, oc, dt)
      spring(sm, 'cz', S.cam.z, oc, dt)
      spring(sm, 'tx', S.tgt.x, oc, dt)
      spring(sm, 'ty', S.tgt.y, oc, dt)
      spring(sm, 'tz', S.tgt.z, oc, dt)
      spring(sm, 'rx', T.rx, or, dt)
      spring(sm, 'ry', T.ry, or, dt)
      spring(sm, 'rz', T.rz, or, dt)
      spring(sm, 'qx', T.pos.x, or, dt)
      spring(sm, 'qy', T.pos.y, or, dt)
      spring(sm, 'qz', T.pos.z, or, dt)
      spring(sm, 's', T.scale, or, dt)
    }

    // ring: tiny physical responses on top of the choreography (tap dip, haptic tremor)
    const r = S.ring
    const trem = film.reduced ? 0 : S.voice.haptic * 0.006
    r.rx = sm.rx + trem * Math.sin(time * 91)
    r.ry = sm.ry
    r.rz = sm.rz + trem * Math.sin(time * 77 + 1)
    eul.set(r.rx, r.ry, r.rz, 'YXZ')
    qe.setFromEuler(eul)
    r.quat.copy(qe).multiply(qBase)
    r.scale = sm.s
    r.pos.set(sm.qx, sm.qy, sm.qz)
    // a tap presses the ring away from the finger, then it springs back
    r.pos.z -= S.voice.tap * 0.035
    r.opacity = 1
    // the ring's orbital plane (local XY, normal = ring axis)
    planeQ.copy(qe)
    S.plane.compose(r.pos, planeQ, one.set(r.scale, r.scale, r.scale))

    const cam = state.camera
    const par = layout.mobile ? 0 : 1
    cam.position.set(sm.cx + sm.px * 0.22 * par, sm.cy + sm.py * 0.12 * par, sm.cz)
    if (cam.fov !== S.fov) {
      cam.fov = S.fov
      cam.updateProjectionMatrix()
    }
    v.set(sm.tx, sm.ty, sm.tz)
    cam.lookAt(v)
    cam.updateMatrixWorld()
    state.gl.toneMappingExposure = S.exposure
  }, -2)
  return null
}

// Runs after every scene component has applied its transforms, so labels pin with zero lag.
function OverlaySync() {
  const { camera, size } = useThree()
  useFrame(() => {
    const ctx = {
      camera,
      vw: size.width,
      vh: size.height,
      project(vec) {
        v.copy(vec).project(camera)
        return [(v.x * 0.5 + 0.5) * size.width, (-v.y * 0.5 + 0.5) * size.height, v.z < 1 && v.z > -1]
      },
    }
    for (const fn of updaters) fn(S, film.t, ctx)
  }) // priority 0 and mounted last → runs after every scene component (a positive priority would disable R3F's auto-render)
  return null
}

// Frame-time monitor: steps the pixel ratio down on slow devices, and back up if there's headroom.
function Quality() {
  const { gl, setDpr } = useThree()
  const st = useRef({ acc: 0, n: 0, level: 0 })
  const levels = useRef(null)
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, layout.mobile ? 1.5 : 1.75)
    levels.current = [dpr, Math.min(dpr, 1.25), 1, 0.75].filter((x, i, a) => a.indexOf(x) === i)
  }, [])
  useFrame((_, dt) => {
    const s = st.current
    if (document.hidden || !levels.current) return
    s.acc += dt
    s.n++
    if (s.n >= 90) {
      const avg = s.acc / s.n
      const L = levels.current
      if (avg > 1 / 42 && s.level < L.length - 1) {
        s.level++
        setDpr(L[s.level])
      } else if (avg < 1 / 58 && s.level > 0 && s.acc > 0) {
        s.level--
        setDpr(L[s.level])
      }
      film.quality = 1 - s.level * 0.25
      s.acc = 0
      s.n = 0
    }
  })
  return null
}

export function Stage({ onReady }) {
  if (!film.marks.stage) film.marks.stage = performance.now()
  const mobile = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.85
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75) : 1
  return (
    <Canvas
      className="stage"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 2, pointerEvents: 'none' }}
      dpr={dpr}
      // no debounce: measure synchronously (timers can be throttled in embedded frames)
      resize={{ scroll: false, debounce: 0 }}
      gl={(props) => {
        film.marks.gl0 = performance.now()
        const r = new THREE.WebGLRenderer({ ...props, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false })
        film.marks.gl1 = performance.now()
        return r
      }}
      camera={{ fov: 30, near: 0.02, far: 200, position: [0, 0, 12] }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearColor(0x000000, 0)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1
        film.marks.created = performance.now()
        // Compile every material up front (in parallel where the driver allows it) so nothing
        // hitches mid-film; the loader stays up until it's done.
        gl.debug.checkShaderErrors = DEBUG
        const done = () => {
          film.marks.compiled = performance.now()
          onReady && onReady()
        }
        requestAnimationFrame(() => {
          film.marks.raf = performance.now()
          try {
            const p = gl.compileAsync ? gl.compileAsync(scene, camera) : (gl.compile(scene, camera), Promise.resolve())
            Promise.race([p, new Promise((r) => setTimeout(r, 6000))]).then(done, done)
          } catch (e) {
            done()
          }
        })
      }}
    >
      <Director />
      {!off('d') && <Dust />}
      {!off('r') && <Ring segments={mobile ? 256 : 384} />}
      {!off('k') && <Dock />}
      {!off('s') && <Signals />}
      {!off('b') && <Body />}
      {!off('v') && <Voice />}
      <Ecosystem />
      <Network />
      <Privacy />
      <Days />
      <Quality />
      <OverlaySync />
    </Canvas>
  )
}
