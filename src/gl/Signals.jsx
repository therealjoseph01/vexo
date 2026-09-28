import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { smooth, clamp } from '../film/timeline'
import { LineField, KIND, WAVE } from './LineField'

/*
  02 · The ring as a circular oscilloscope.
  Each biometric signal is a trace orbiting the band in the ring's own plane; the
  circumference is the time axis, so every trace flows around the ring as time passes.
*/
export const ORBITS = [
  { key: 'hr', label: 'Heart rate', wave: WAVE.PPG, r: 1.58, amp: 0.1, freq: 16, speed: 62 / 60, color: '#8dffbd', width: 1.6, glow: 5, glowAmt: 0.35 },
  { key: 'hrv', label: 'HRV', wave: WAVE.TICKS, r: 1.8, amp: 0.085, freq: 16, speed: 62 / 60, color: '#f2f1ec', width: 1.2, glow: 0, glowAmt: 0 },
  { key: 'spo2', label: 'Blood oxygen', wave: WAVE.SPO2, r: 2.0, amp: 0.05, freq: 5, speed: 0.12, color: '#ff7a6b', width: 1.4, glow: 4, glowAmt: 0.25 },
  { key: 'resp', label: 'Respiratory rate', wave: WAVE.SINE, r: 2.2, amp: 0.065, freq: 5, speed: 14 / 60, color: '#dfe8f5', width: 1.2, glow: 0, glowAmt: 0 },
  { key: 'temp', label: 'Skin temperature', wave: WAVE.THERMAL, r: 2.4, amp: 0.05, freq: 2, speed: 0.03, color: '#ffbb7a', width: 1.5, glow: 5, glowAmt: 0.3 },
  { key: 'sleep', label: 'Sleep', wave: WAVE.HYPNO, r: 2.6, amp: 0.055, freq: 14, speed: 0.02, color: '#aab8ff', width: 1.2, glow: 0, glowAmt: 0 },
  { key: 'motion', label: 'Activity', wave: WAVE.NOISE, r: 2.8, amp: 0.035, freq: 1, speed: 0.4, color: '#f2f1ec', width: 1.1, glow: 0, glowAmt: 0 },
]
// where each trace's label pins (angle in the ring plane). The ring is rolled half a turn for
// this shot, so π + a lands on the right-hand side of frame.
export const LABEL_ANGLE = [-0.55, -0.32, -0.1, 0.12, 0.34, 0.56, 0.78].map((a) => Math.PI - a)

const tmp = new THREE.Vector3()
export function orbitPoint(i, out, radiusScale = 1) {
  const o = ORBITS[i]
  const a = LABEL_ANGLE[i]
  const r = o.r * radiusScale * (layout.mobile ? 0.8 : 1)
  out.set(Math.cos(a) * r, Math.sin(a) * r, 0).applyMatrix4(S.plane)
  return out
}

export function Signals() {
  const field = useMemo(() => {
    const f = new LineField({ lines: ORBITS.length, points: 480 })
    ORBITS.forEach((o, i) => {
      f.shape(i, KIND.ORBIT, 480, true)
      f.style(i, { color: new THREE.Color(o.color), alpha: 0, width: o.width, glow: o.glow, glowAmt: o.glowAmt })
    })
    return f
  }, [])

  useFrame(({ gl, size, clock }) => {
    const time = film.reduced ? 0 : clock.elapsedTime
    const sg = S.sig
    const visible = sg.a > 0.001
    field.mesh.visible = visible
    if (!visible) return
    const fold = sg.fold
    ORBITS.forEach((o, i) => {
      const p = smooth(clamp(sg[o.key]))
      const r = o.r * (1 - 0.55 * fold) * (layout.mobile ? 0.8 : 1)
      let amp = o.amp * (1 - fold)
      let extra = 1
      if (o.key === 'motion') extra = 0.35 + Math.min(2.5, Math.abs(film.vel) * 2.2) // your own scroll is the motion
      if (o.key === 'resp') amp *= 0.8 + 0.2 * Math.sin(time * 1.47)
      field.matrix(i, S.plane)
      // draw on around the ring, starting from the label side
      field.A(i, r, 1, LABEL_ANGLE[i] - p * Math.PI * 2 + Math.PI * 2, amp)
      field.window(i, p, 0, 0.012)
      field.B(i, o.wave, o.freq, -time * o.speed * (o.wave === WAVE.PPG || o.wave === WAVE.TICKS ? 1 : 1), extra)
      field.alpha(i, sg.a * (p > 0 ? 0.35 + 0.65 * Math.min(1, p * 3) : 0) * (1 - fold * 0.9) * (i === 0 ? 1 + S.beat * 0.4 : 1))
    })
    field.flush(gl, size)
  })

  return <primitive object={field.mesh} />
}
