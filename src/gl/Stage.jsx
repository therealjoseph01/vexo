import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, computeState, ensureLayout, layout, armBasis, wornOffset } from '../film/director'
import { film, updaters } from '../film/store'
import { SB, WORN_BASIS, POINTS, pointLocal } from './bandSpec'
import { loadBand, asset } from './bandAsset'
import { buildStudioEnv } from './studioEnv'
import { Band } from './Band'
import { Wrist } from './Wrist'
import { Dust } from './Dust'
import { Story } from './Story'
import { DEBUG } from '../Debug'

// QA: #t4~xw hides the wrist, ~xs the story lines, ~xd dust
const off = (k) => typeof window !== 'undefined' && new RegExp('~x[a-z]*' + k).test(window.location.hash)
const v = new THREE.Vector3()
const eul = new THREE.Euler(0, 0, 0, 'YXZ')
const qFloat = new THREE.Quaternion()
const qArm = new THREE.Quaternion()
const qWorn = new THREE.Quaternion()
const qBand = new THREE.Quaternion()
const pBand = new THREE.Vector3()
const pFloat = new THREE.Vector3()
const off3 = new THREE.Vector3()
const sc = new THREE.Vector3()
const basis = new THREE.Matrix4()
const fS = new THREE.Vector3()
const dS = new THREE.Vector3()
const PT_NAMES = Object.keys(POINTS)
for (const n of PT_NAMES) S.pts[n] = new THREE.Vector3()

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
// Under-damped spring (semi-implicit, sub-stepped): the loop cinching onto the wrist overshoots a touch.
function bouncy(st, key, target, omega, zeta, dt) {
  const vk = key + 'V'
  const n = Math.max(1, Math.ceil(dt / 0.004))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    const a = -omega * omega * (st[key] - target) - 2 * zeta * omega * (st[vk] || 0)
    st[vk] = (st[vk] || 0) + a * h
    st[key] += st[vk] * h
  }
}

const KEYS = ['cx', 'cy', 'cz', 'tx', 'ty', 'tz', 'px', 'py', 'pz', 'rx', 'ry', 'rz', 's', 'k', 'slide', 'fx', 'fy', 'fz', 'dx', 'dy', 'dz', 'ax', 'ay', 'az']
const sm = { init: false, cinch: 1.22, cinchV: 0, ptx: 0, pty: 0 }

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
    sm.ptx += (px - sm.ptx) * (1 - Math.exp(-dt * 2))
    sm.pty += (py - sm.pty) * (1 - Math.exp(-dt * 2))

    const F = S.float
    const W = S.worn
    const T = S.armT
    const tg = {
      cx: S.cam.x, cy: S.cam.y, cz: S.cam.z, tx: S.tgt.x, ty: S.tgt.y, tz: S.tgt.z,
      px: F.pos.x, py: F.pos.y, pz: F.pos.z, rx: F.rx, ry: F.ry, rz: F.rz, s: F.scale,
      k: W.k, slide: W.slide,
      fx: T.f.x, fy: T.f.y, fz: T.f.z, dx: T.d.x, dy: T.d.y, dz: T.d.z,
      ax: T.pos.x, ay: T.pos.y, az: T.pos.z,
    }
    if (!sm.init || film.reduced || film.snap) {
      film.snap = false
      for (const k of KEYS) {
        sm[k] = tg[k]
        sm[k + 'V'] = 0
      }
      sm.cinch = W.cinch
      sm.cinchV = 0
      sm.init = true
    } else {
      // camera: a dolly with weight; the band is a heavier object; the arm moves like an arm
      for (const k of ['cx', 'cy', 'cz', 'tx', 'ty', 'tz']) spring(sm, k, tg[k], 7.5, dt)
      for (const k of ['px', 'py', 'pz', 'rx', 'ry', 'rz', 's', 'k', 'slide']) spring(sm, k, tg[k], 6.2, dt)
      for (const k of ['fx', 'fy', 'fz', 'dx', 'dy', 'dz', 'ax', 'ay', 'az']) spring(sm, k, tg[k], 5.5, dt)
      bouncy(sm, 'cinch', W.cinch, 26, 0.32, dt)
    }

    /* ---- compose the band ---- */
    const k = THREE.MathUtils.clamp(sm.k, 0, 1)
    eul.set(sm.rx, sm.ry, sm.rz, 'YXZ')
    qFloat.setFromEuler(eul)
    pFloat.set(sm.px, sm.py, sm.pz)
    fS.set(sm.fx, sm.fy, sm.fz)
    dS.set(sm.dx, sm.dy, sm.dz)
    armBasis(fS, dS, basis)
    qArm.setFromRotationMatrix(basis)
    qWorn.copy(qArm).multiply(WORN_BASIS)
    const armPos = v.set(sm.ax, sm.ay, sm.az)
    pBand.copy(pFloat).lerp(armPos, k)
    qBand.copy(qFloat).slerp(qWorn, k)
    const cinch = sm.cinch
    const bs = SB * THREE.MathUtils.lerp(sm.s, cinch, k)
    // a haptic pulse is felt, not seen — but the band answers it with the faintest tremor
    const trem = film.reduced ? 0 : S.haptic.a * 0.004
    if (trem) pBand.addScaledVector(dS, trem * Math.sin(time * 90))
    S.band.matrix.compose(pBand, qBand, sc.setScalar(bs))

    /* ---- the arm, placed so the band sits where the choreography puts it ---- */
    wornOffset(sm.slide, cinch, off3).multiplyScalar(SB).applyQuaternion(qArm)
    const armOrigin = armPos.sub(off3)
    S.arm.matrix.compose(armOrigin, qArm, sc.setScalar(SB))

    /* ---- named points (labels, graphics) ---- */
    const ex = S.band.explode
    for (const n of PT_NAMES) pointLocal(n, ex, S.pts[n]).applyMatrix4(S.band.matrix)

    /* ---- camera ---- */
    const cam = state.camera
    const par = layout.mobile ? 0 : 1
    cam.position.set(sm.cx + sm.ptx * 0.18 * par, sm.cy + sm.pty * 0.1 * par, sm.cz)
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

/*
  The photographer's rig: key, rim, fill and top ride with the camera; the studio environment
  turns with it; one spot rakes the fabric in the opening and crosses the band again at the end.
*/
const cRight = new THREE.Vector3()
const cUp = new THREE.Vector3()
const cBack = new THREE.Vector3()
function Lights() {
  const { scene, gl } = useThree()
  const r = useRef({})
  useEffect(() => {
    const envTex = buildStudioEnv(gl)
    scene.environment = envTex
    scene.environmentIntensity = 0
    return () => {
      scene.environment = null
      envTex.dispose()
    }
  }, [scene, gl])
  useFrame((state) => {
    const L = S.light
    const R = r.current
    const cam = state.camera
    cRight.setFromMatrixColumn(cam.matrixWorld, 0)
    cUp.setFromMatrixColumn(cam.matrixWorld, 1)
    cBack.setFromMatrixColumn(cam.matrixWorld, 2)
    const at = (light, x, y, z, I) => {
      if (!light) return
      light.position.copy(v.set(sm.tx, sm.ty, sm.tz)).addScaledVector(cRight, x * 10).addScaledVector(cUp, y * 10).addScaledVector(cBack, z * 10)
      light.target.position.set(sm.tx, sm.ty, sm.tz)
      light.target.updateMatrixWorld()
      light.intensity = I
      light.visible = I > 0.001
    }
    at(R.key, -0.62, 0.62, 0.48, L.key)
    at(R.rim, 0.75, 0.32, -0.58, L.rim)
    at(R.fill, 0.35, -0.45, 0.82, L.fill)
    at(R.top, 0.05, 1, 0.1, L.top)
    if (R.spot) {
      R.spot.position.copy(L.spotPos)
      R.spot.target.position.copy(L.spotTgt)
      R.spot.target.updateMatrixWorld()
      R.spot.angle = L.spotAngle
      R.spot.intensity = L.spot
      R.spot.visible = L.spot > 0.001
    }
    scene.environmentIntensity = L.env
    // reflections turn with the camera, so the strips stay where the photographer put them
    scene.environmentRotation.set(0, Math.atan2(cBack.x, cBack.z), 0)
  })
  const set = (k) => (o) => (r.current[k] = o)
  return (
    <>
      <directionalLight ref={set('key')} color="#fff3e8" />
      <directionalLight ref={set('rim')} color="#eef3fa" />
      <directionalLight ref={set('fill')} color="#dfe7f2" />
      <directionalLight ref={set('top')} color="#f4f6f8" />
      <spotLight ref={set('spot')} color="#fff6ec" angle={0.22} penumbra={1} decay={0} distance={0} />
    </>
  )
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
  const { setDpr } = useThree()
  const st = useRef({ acc: 0, n: 0, level: 0 })
  const levels = useRef(null)
  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, layout.mobile ? 1.5 : 1.75)
    levels.current = [dpr, Math.min(dpr, 1.25), 1, 0.75].filter((x, i, a) => a.indexOf(x) === i)
  }, [])
  useFrame((_, dt) => {
    const s = st.current
    if (document.hidden || !levels.current || !film.ready) return
    s.acc += dt
    s.n++
    if (s.n >= 90) {
      const avg = s.acc / s.n
      const L = levels.current
      if (avg > 1 / 42 && s.level < L.length - 1) {
        s.level++
        setDpr(L[s.level])
      } else if (avg < 1 / 58 && s.level > 0) {
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

// The film starts once Vexo's model is in and every material has been compiled (no mid-film hitches).
function Ready({ onReady, onError }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let dead = false
    loadBand()
      .then(
        () =>
          new Promise((res) => {
            // let React mount the model, then compile everything in one go
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                film.marks.model = performance.now()
                // compile everything, including what is hidden until later in the film (the arm, the story lines)
                const hidden = []
                scene.traverse((o) => {
                  if (!o.visible) {
                    hidden.push(o)
                    o.visible = true
                  }
                })
                const restore = () => {
                  for (const o of hidden) o.visible = false
                  res()
                }
                try {
                  const p = gl.compileAsync ? gl.compileAsync(scene, camera) : (gl.compile(scene, camera), Promise.resolve())
                  Promise.race([p, new Promise((r) => setTimeout(r, 8000))]).then(restore, restore)
                } catch (e) {
                  restore()
                }
              }),
            )
          }),
      )
      .then(() => {
        if (dead) return
        film.marks.compiled = performance.now()
        film.ready = true
        onReady && onReady()
      })
      .catch((e) => {
        console.error('Vexo Band model failed to load', e)
        if (!dead) onError && onError(e)
      })
    return () => {
      dead = true
    }
  }, [gl, scene, camera])
  return null
}

export function Stage({ onReady, onError }) {
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
      camera={{ fov: 30, near: 0.05, far: 200, position: [0, 0, 8] }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1
        gl.debug.checkShaderErrors = DEBUG
        film.marks.created = performance.now()
      }}
    >
      <Director />
      <Lights />
      {!off('d') && <Dust />}
      {!off('w') && <Wrist />}
      <Band />
      {!off('s') && <Story />}
      <Quality />
      <Ready onReady={onReady} onError={onError} />
      <OverlaySync />
    </Canvas>
  )
}
