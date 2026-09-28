import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth } from '../film/timeline'
import { LineField, KIND } from './LineField'

/*
  08 · Yours alone.
  After the network collapses into the ring: one boundary closes around the ring and your phone.
  Your voice crosses to the phone, becomes text there, and the audio ends at the boundary.
  Only text and numbers continue — dashed, and only if you sync.
*/
function roundedRect(w, h, r, n = 12) {
  const pts = []
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, Math.PI * 1.5],
  ]
  corners.forEach(([cx, cy, a0]) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0])
    }
  })
  return pts
}

// layout of the scene (world): ring at its pose, phone beside/below it, boundary around both
export function privacyLayout() {
  const m = layout.mobile
  const ring = S.ring.pos
  return m
    ? { phone: new THREE.Vector3(ring.x, ring.y - 2.4, 0), phoneS: 0.62, center: new THREE.Vector3(ring.x, ring.y - 1.2, 0), rx: 1.5, ry: 2.3, cloud: new THREE.Vector3(ring.x + 2.4, ring.y - 2.4, 0) }
    : { phone: new THREE.Vector3(ring.x + 3.35, ring.y, 0), phoneS: 1, center: new THREE.Vector3(ring.x + 1.65, ring.y, 0), rx: 3.35, ry: 2.05, cloud: new THREE.Vector3(ring.x + 6.6, ring.y, 0) }
}

export function Privacy() {
  const f = useMemo(() => {
    const f = new LineField({ lines: 6, points: 200, renderOrder: 8 })
    // 0 boundary · 1 phone · 2 phone notch · 3 voice wave · 4 cloud (dashed) · 5 phone "text" lines
    f.shape(0, KIND.ORBIT, 200, true)
    f.style(0, { color: new THREE.Color('#e9ecf2'), alpha: 0, width: 1.2, glow: 6, glowAmt: 0.2 })
    f.points(1, roundedRect(1.1, 2.2, 0.2), true)
    f.style(1, { color: new THREE.Color('#e9ecf2'), alpha: 0, width: 1.2, glow: 0 })
    f.points(2, [
      [-0.12, 0.98, 0],
      [0.12, 0.98, 0],
    ])
    f.style(2, { color: new THREE.Color('#e9ecf2'), alpha: 0, width: 1.4, glow: 0 })
    f.shape(3, KIND.WAVE, 160)
    f.style(3, { color: new THREE.Color('#f4f3ee'), alpha: 0, width: 1.3, glow: 5, glowAmt: 0.25 })
    f.shape(4, KIND.BEZIER, 120)
    f.style(4, { color: new THREE.Color('#c9cfd9'), alpha: 0, width: 1, glow: 0 })
    f.dash(4, 26)
    f.points(5, [
      [-0.32, 0.3, 0],
      [0.3, 0.3, 0],
    ])
    f.style(5, { color: new THREE.Color('#f4f3ee'), alpha: 0, width: 1.2, glow: 0 })
    return f
  }, [])
  const T = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() }), [])

  useFrame(({ gl, size }) => {
    const P = S.priv
    const on = P.a > 0.001
    f.mesh.visible = on
    if (!on) return
    const L = privacyLayout()
    const time = film.time
    const out = 1 - P.out
    const bnd = smooth(P.boundary)

    // boundary: an ellipse drawn around ring + phone
    T.q.identity()
    T.m.compose(L.center, T.q, T.s.set(L.rx, L.ry, 1))
    f.matrix(0, T.m)
    f.A(0, 1, 1, Math.PI / 2, 0)
    f.window(0, bnd, 0, 0.02)
    // in Scene 09 the boundary contracts into the ring's charge arc
    f.alpha(0, 0.55 * P.a * out)

    // phone outline + a line of transcribed text appearing on it
    T.m.compose(L.phone, T.q, T.s.set(L.phoneS, L.phoneS, L.phoneS))
    f.matrix(1, T.m)
    f.matrix(2, T.m)
    f.window(1, smooth(clamp(P.boundary * 1.4 - 0.2)), 0, 0.02)
    f.alpha(1, 0.7 * P.a * out)
    f.alpha(2, 0.5 * P.a * out * smooth(clamp(P.boundary * 2 - 1)))
    const txt = smooth(clamp((P.voice - 0.7) / 0.3))
    f.matrix(5, T.m)
    f.window(5, txt, 0, 0.05)
    f.alpha(5, 0.8 * P.a * out)

    // voice: ring → phone. The audio stops at the phone.
    T.a.copy(S.ring.pos)
    const toPhone = T.b.copy(L.phone).sub(T.a)
    const len = toPhone.length()
    toPhone.normalize()
    const start = 1.35 * S.ring.scale
    const end = layout.mobile ? 0.8 : 0.62
    const half = (len - start - end) / 2
    T.p.copy(T.a).addScaledVector(toPhone, start + half)
    T.q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), toPhone)
    T.m.compose(T.p, T.q, T.s.set(1, 1, 1))
    f.matrix(3, T.m)
    const v = P.voice
    f.A(3, half, 0.16 * Math.sin(Math.PI * clamp(v * 1.2)), 8, time * 6)
    f.B(3, clamp(v * 1.1), 0.35, 13, 1)
    f.window(3, clamp(v * 1.25), clamp(v * 1.25 - 0.8), 0.06)
    f.alpha(3, P.a * out * (v > 0 && v < 1 ? 1 : 0))

    // beyond the boundary: only text and numbers, only if you sync (dashed)
    const c0 = T.c.copy(L.phone)
    if (layout.mobile) c0.y -= 0.95 * L.phoneS
    else c0.x += 0.6
    T.d.copy(L.cloud)
    const mid1 = c0.clone().lerp(T.d, 0.33)
    const mid2 = c0.clone().lerp(T.d, 0.66)
    f.bezier(4, c0, mid1, mid2, T.d)
    f.window(4, smooth(clamp((P.perms - 0.1) / 0.5)), 0, 0.03)
    f.alpha(4, 0.4 * P.a * out)
    f.flush(gl, size)
  })

  return <primitive object={f.mesh} />
}
