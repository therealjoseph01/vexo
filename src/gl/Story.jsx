import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout, framePoint } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth, range, lerp } from '../film/timeline'
import { LineField, KIND } from './LineField'
import { talkPoint, memPoint, actPoint } from './storyLayout'

/*
  Everything the band hears and does, drawn in the film's one visual language (a luminous hairline):
  04  conversations travel through the air as waveforms and fold into the microphone
  05  each memory runs out along a path to the action it became
  03/05  haptic ripples around the loop
  06  a voice into the microphone
  08  the conversations around you — then the audio is gone
*/
const INK = new THREE.Color('#e9edf2')
const SOFT = new THREE.Color('#b9c2cc')
const DONE = new THREE.Color('#9dffc4')

const X = new THREE.Vector3()
const Y = new THREE.Vector3()
const Z = new THREE.Vector3()
const M = new THREE.Matrix4()
const mid = new THREE.Vector3()
const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c1 = new THREE.Vector3()
const c2 = new THREE.Vector3()
const view = new THREE.Vector3()
const loopRot = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0))

// a WAVE line from p (u = 0) to q (u = 1), its swing facing the camera
function waveBetween(f, l, p, q, cam) {
  X.subVectors(q, p)
  const half = X.length() / 2
  X.normalize()
  mid.addVectors(p, q).multiplyScalar(0.5)
  view.subVectors(cam, mid).normalize()
  Y.crossVectors(view, X).normalize()
  Z.crossVectors(X, Y)
  M.makeBasis(X, Y, Z).setPosition(mid)
  f.matrix(l, M)
  return half
}

export function Story() {
  const R = useMemo(() => {
    const f = new LineField({ lines: 40, points: 160, renderOrder: 12 })
    const id = {
      talk: f.alloc(3),
      echo: f.alloc(3),
      tether: f.alloc(3),
      path: f.alloc(3),
      ripple: f.alloc(3),
      voice: f.alloc(3),
      priv: f.alloc(12),
    }
    for (let i = 0; i < 3; i++) {
      f.shape(id.talk + i, KIND.WAVE, 160).style(id.talk + i, { color: INK, width: 1.3, glow: 5, glowAmt: 0.35 })
      f.shape(id.echo + i, KIND.WAVE, 160).style(id.echo + i, { color: SOFT, width: 0.8, glow: 0 })
      f.shape(id.tether + i, KIND.BEZIER, 64).style(id.tether + i, { color: SOFT, width: 0.8, glow: 0 })
      f.shape(id.path + i, KIND.BEZIER, 96).style(id.path + i, { color: INK, width: 1.1, glow: 4, glowAmt: 0.3 })
      f.shape(id.ripple + i, KIND.ORBIT, 128, true).style(id.ripple + i, { color: INK, width: 1, glow: 6, glowAmt: 0.4 })
      f.shape(id.voice + i, KIND.WAVE, 160).style(id.voice + i, { color: i ? SOFT : INK, width: i ? 0.8 : 1.4, glow: i ? 0 : 6, glowAmt: 0.4 })
    }
    for (let i = 0; i < 12; i++) f.shape(id.priv + i, KIND.WAVE, 120).style(id.priv + i, { color: i % 3 ? SOFT : INK, width: i % 3 ? 0.8 : 1.1, glow: 0 })
    return { f, id }
  }, [])

  useFrame(({ gl, size, camera }) => {
    const { f, id } = R
    const time = film.time
    const m = layout.mobile
    const cam = camera.position
    f.hideAll()
    const mic = S.pts.mic

    /* ---- 04 · conversations fold into the microphone ---- */
    const C = S.ctx
    if (C.a > 0.002) {
      for (let i = 0; i < 3; i++) {
        talkPoint(i, a)
        const draw = C.draw[i]
        const fold = C.fold[i]
        const on = draw > 0 && fold < 1
        if (on) {
          const half = waveBetween(f, id.talk + i, a, mic, cam)
          const amp = (m ? 0.2 : 0.26) * (1 - 0.6 * smooth(fold))
          const ph = time * 7 + i * 2
          f.A(id.talk + i, half, amp, 7 + i, ph).B(id.talk + i, lerp(0.25, 0.95, smooth(fold)), 0.3, 13 + i * 2, 1)
          f.window(id.talk + i, smooth(draw) * 1.02, smooth(fold) * 1.02, 0.06).alpha(id.talk + i, C.a * 0.95)
          waveBetween(f, id.echo + i, a, mic, cam)
          f.A(id.echo + i, half, amp * 0.55, 4.2 + i, ph * 0.8 + 1).B(id.echo + i, lerp(0.3, 0.95, smooth(fold)), 0.36, 9, 1)
          f.window(id.echo + i, smooth(draw) * 1.02, smooth(fold) * 1.02, 0.1).alpha(id.echo + i, C.a * 0.4)
        }
        // what it heard becomes a memory, tethered to the band
        const mem = C.mem[i]
        if (mem > 0.002) {
          memPoint(i, b)
          c1.copy(mic).lerp(b, 0.35).addScaledVector(S.armT.d, 0.4)
          c2.copy(mic).lerp(b, 0.75)
          f.bezier(id.tether + i, mic, c1, c2, b).window(id.tether + i, mem * 1.02, 0, 0.1).alpha(id.tether + i, 0.45 * mem * C.a)
          // 05 · …and runs out to what it did
          const pth = C.path[i]
          if (pth > 0.002 && !m) {
            actPoint(i, a)
            c1.copy(b).lerp(a, 0.33).addScaledVector(camera.up, 0.25 * (1 - i))
            c2.copy(b).lerp(a, 0.7)
            const k = smooth(pth)
            f.bezier(id.path + i, b, c1, c2, a)
              .window(id.path + i, k * 1.02, 0, 0.06)
              .alpha(id.path + i, 0.85 * C.a)
              .pulse(id.path + i, k, 0.06, 2.2 * (1 - k), 0)
            f.style(id.path + i, { color: C.act[i] > 0.5 ? DONE : INK })
          }
        }
      }
    }

    /* ---- haptic ripples around the loop ---- */
    const H = S.haptic
    if (H.a > 0.002) {
      M.multiplyMatrices(S.band.matrix, loopRot)
      for (let i = 0; i < 3; i++) {
        const age = H.age - i * 0.09
        if (age <= 0) continue
        const r = 3.5 + age * 11
        f.matrix(id.ripple + i, M).A(id.ripple + i, r, 1, 0, 0).B(id.ripple + i, 0, 1, 0, 0)
        f.alpha(id.ripple + i, H.a * (1 - smooth(clamp(age / 0.75))) * (0.6 - i * 0.15))
      }
    }

    /* ---- 06 · a voice into the microphone ---- */
    const Vc = S.voice
    if (Vc.a > 0.002 && Vc.fold < 1 && Vc.draw > 0) {
      a.copy(mic).addScaledVector(X.setFromMatrixColumn(camera.matrixWorld, 0), m ? -0.9 : -1.9).addScaledVector(Y.setFromMatrixColumn(camera.matrixWorld, 1), m ? 1.2 : 0.3)
      for (let i = 0; i < 3; i++) {
        const half = waveBetween(f, id.voice + i, a, mic, cam)
        const k = smooth(Vc.fold)
        f.A(id.voice + i, half, (0.12 - i * 0.03) * (1 - 0.7 * k), 9 + i * 3.1, time * 8 + i).B(id.voice + i, lerp(0.35, 0.97, k), 0.34, 17 + i * 2, 1)
        f.window(id.voice + i, smooth(Vc.draw) * 1.02, k * 1.02, 0.05).alpha(id.voice + i, Vc.a * (i ? 0.45 : 1))
      }
    }

    /* ---- 08 · conversations all around — then the audio is gone ---- */
    const P = S.priv
    if (P.a > 0.002 && P.dissolve < 1) {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + 0.3
        const rx = m ? 1.35 : 4.6
        const ry = m ? 3.3 : 2.35
        const x = Math.cos(ang) * rx * (0.9 + 0.12 * Math.sin(i * 7.1))
        const y = Math.sin(ang) * ry * (0.9 + 0.12 * Math.cos(i * 3.7))
        framePoint('priv', x, y, mid, Math.sin(i * 2.3) * 1.2)
        const len = (m ? 0.55 : 1.0) * (0.75 + 0.4 * Math.abs(Math.sin(i * 1.7)))
        X.setFromMatrixColumn(camera.matrixWorld, 0)
        a.copy(mid).addScaledVector(X, -len)
        b.copy(mid).addScaledVector(X, len)
        const half = waveBetween(f, id.priv + i, a, b, cam)
        const d = smooth(clamp(P.dissolve * 1.4 - (i % 4) * 0.1))
        f.A(id.priv + i, half, 0.16 * (1 - d), 5 + (i % 3), time * (4 + (i % 5)) + i).B(id.priv + i, 0.5, 0.33, 11, 1)
        f.window(id.priv + i, smooth(clamp(P.waves * 1.5 - (i % 5) * 0.1)) * 1.02, 0, 0.1)
        f.dash(id.priv + i, d > 0.01 ? lerp(4, 40, d) : 0)
        f.alpha(id.priv + i, P.a * (1 - d) * (i % 3 ? 0.4 : 0.7))
      }
    }

    f.flush(gl, size)
  })

  return <primitive object={R.f.mesh} />
}
