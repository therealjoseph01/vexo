import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth, ease } from '../film/timeline'
import { LineField, KIND } from './LineField'
import { GLYPHS } from './glyphs'
import { APPS } from '../config'

/*
  05 · Every app, one ring.
  The haptic ripple from Scene 04 reaches its full radius and the apps are born on it — each one
  a line drawing of the signal it lives on, orbiting at its own depth, tied back to the ring by a
  thread that carries pulses outward. The camera circles through them. Then 100+ more.
*/
const RADII = [4.6, 5.5, 4.9, 5.9, 4.5, 5.6, 5.0, 5.8, 4.7].map((r) => r * 0.86)
const HEIGHT = [0.9, -0.55, 1.35, -1.05, 0.2, 1.1, -1.3, 0.6, -0.35]

const dir = new THREE.Vector3()

// Where app i is right now (world) and how present it is (0..1).
export function appPos(i, out) {
  const A = S.apps
  const m = layout.mobile
  const a = (i / APPS.length) * Math.PI * 2 + 0.35 + A.spin * 0.15
  const R = RADII[i] * (m ? 0.6 : 1)
  const y = HEIGHT[i] * (m ? 1.25 : 1) + 0.08 * Math.sin(film.time * 0.5 + i * 1.7)
  const e = ease.out(clamp((A.emerge - i * 0.055) / 0.5))
  const back = smooth(clamp((A.retract - (APPS.length - 1 - i) * 0.04) / 0.6))
  // born on the ripple (in the ring's plane), rising to its own height; later pulled home
  out.set(Math.sin(a) * R * (0.92 + 0.08 * e), y * e, Math.cos(a) * R * (0.92 + 0.08 * e))
  out.lerp(S.ring.pos, back)
  return e * (1 - back) * A.a
}

export function Ecosystem() {
  const camera = useThree((s) => s.camera)
  const R = useMemo(() => {
    const glyphLines = []
    APPS.forEach((app, i) => GLYPHS[app.id].lines.forEach((ln, j) => glyphLines.push({ app: i, j, ...ln })))
    const f = new LineField({ lines: glyphLines.length + APPS.length, points: 96, renderOrder: 8 })
    glyphLines.forEach((g, k) => {
      f.points(k, g.pts, !!g.closed)
      f.style(k, { color: new THREE.Color('#f1f0eb'), alpha: 0, width: 1.25, glow: 0 })
    })
    const T0 = glyphLines.length
    APPS.forEach((_, i) => {
      f.shape(T0 + i, KIND.BEZIER, 96)
      f.style(T0 + i, { color: new THREE.Color('#d8dde6'), alpha: 0, width: 1, glow: 0 })
    })
    // 100+ more: a quiet constellation of apps around the whole system
    const N = 128
    let s = 11
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      const u = rnd() * 2 - 1
      const th = rnd() * Math.PI * 2
      const r = 7.2 + rnd() * 2.6
      const k = Math.sqrt(1 - u * u)
      pos[i * 3] = Math.cos(th) * k * r
      pos[i * 3 + 1] = u * r * 0.55
      pos[i * 3 + 2] = Math.sin(th) * k * r
      seed[i] = rnd()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const dotMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uA: { value: 0 }, uTime: { value: 0 }, uPR: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uA, uTime, uPR;
        varying float vA;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float appear = smoothstep(aSeed * 0.7, aSeed * 0.7 + 0.3, uA);
          vA = appear * (0.45 + 0.55 * sin(uTime * (0.6 + aSeed) + aSeed * 30.0) * 0.5 + 0.275);
          gl_PointSize = (3.0 + aSeed * 2.5) * uPR * appear;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d) * vA;
          if (a < 0.003) discard;
          gl_FragColor = vec4(vec3(0.95, 0.95, 0.92), a);
        }`,
    })
    const dots = new THREE.Points(g, dotMat)
    dots.frustumCulled = false
    const positions = APPS.map(() => ({ v: new THREE.Vector3(), k: 0 }))
    return { f, glyphLines, T0, dots, dotMat, positions }
  }, [])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const ms = useMemo(() => new THREE.Matrix4(), [])
  const sv = useMemo(() => new THREE.Vector3(), [])
  const p0 = useMemo(() => new THREE.Vector3(), [])
  const p1 = useMemo(() => new THREE.Vector3(), [])
  const p2 = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ gl, size }) => {
    const A = S.apps
    const time = film.time
    const on = A.a > 0.001
    R.f.mesh.visible = on
    R.dots.visible = on && A.market > 0.001
    R.dotMat.uniforms.uA.value = A.market * A.a * (1 - A.retract)
    R.dotMat.uniforms.uTime.value = time
    R.dotMat.uniforms.uPR.value = gl.getPixelRatio()
    if (!on) return

    const positions = R.positions
    positions.forEach((p, i) => {
      p.k = appPos(i, p.v)
    })

    // glyphs face the lens
    R.glyphLines.forEach((g, k) => {
      const { v, k: pr } = positions[g.app]
      const sc = (layout.mobile ? 0.75 : 1) * (0.55 + 0.45 * pr)
      let s2 = sc
      if (g.breathe) s2 *= 1 + 0.1 * g.breathe * Math.sin(time * ((2 * Math.PI) / 5))
      sv.set(s2, s2, s2)
      m.compose(v, camera.quaternion, sv)
      R.f.matrix(k, m)
      let head = clamp(pr * 1.6 - g.j * 0.12)
      if (g.set !== undefined) head = clamp((pr - 0.4) * 3 - g.set * 0.3)
      R.f.window(k, smooth(head), 0, 0.04)
      let a = pr * 0.85
      if (g.dose !== undefined) a *= 0.5 + 0.5 * Math.max(0, Math.sin(time * 1.2 - g.dose * 6))
      R.f.alpha(k, a)
      if (g.runner) R.f.pulse(k, (time * 0.18) % 1, 0.03, 4, 0)
      else if (g.ball) R.f.pulse(k, (time * 0.45) % 1, 0.05, 3, 0)
      else if (g.trend) R.f.pulse(k, (time * 0.12) % 1, 0.05, 2.5, 0)
      else R.f.pulse(k, 0, 0.1, 0, 0)
    })

    // threads: ring → app, pulses travelling outward
    APPS.forEach((_, i) => {
      const { v, k: pr } = positions[i]
      const id = R.T0 + i
      dir.copy(v).sub(S.ring.pos)
      dir.y = 0
      dir.normalize()
      p0.copy(S.ring.pos).addScaledVector(dir, 1.35 * S.ring.scale)
      p1.copy(p0).addScaledVector(dir, 1.3)
      p1.y += 0.2
      p2.copy(v).addScaledVector(dir, -1.1)
      p2.y = v.y * 0.6
      R.f.bezier(id, p0, p1, p2, v)
      R.f.window(id, smooth(clamp(A.threads * 1.2 * pr)), 0, 0.05)
      R.f.alpha(id, 0.3 * pr * A.threads)
      R.f.pulse(id, time * 0.45 + i * 0.13, 0.05, 3, 2, 1.5)
    })
    R.f.flush(gl, size)
  })

  return (
    <>
      <primitive object={R.f.mesh} />
      <primitive object={R.dots} />
    </>
  )
}
