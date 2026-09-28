import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { clamp, smooth } from '../film/timeline'
import { LineField, KIND } from './LineField'

/*
  09 · Five days.
  No battery icon. A single arc of light circles the ring and grows shorter with each day
  while the day's light travels once around it. Then the dock, and an hour, and it's full again.
*/
export const DAY_R = 1.95

// angle of day k's tick on the dial (day 1 at the top, clockwise)
export const dayAngle = (k) => Math.PI / 2 - (k / 5) * Math.PI * 2

export function Days() {
  const camera = useThree((s) => s.camera)
  const f = useMemo(() => {
    const f = new LineField({ lines: 8, points: 240, renderOrder: 8 })
    f.shape(0, KIND.ORBIT, 240, true) // charge arc
    f.style(0, { color: new THREE.Color('#f5f3ee'), alpha: 0, width: 2, glow: 8, glowAmt: 0.35 })
    f.shape(1, KIND.ORBIT, 240, true) // faint track
    f.style(1, { color: new THREE.Color('#9aa0aa'), alpha: 0, width: 1, glow: 0 })
    for (let k = 0; k < 5; k++) {
      const a = dayAngle(k)
      f.points(2 + k, [
        [Math.cos(a) * (DAY_R + 0.1), Math.sin(a) * (DAY_R + 0.1), 0],
        [Math.cos(a) * (DAY_R + 0.26), Math.sin(a) * (DAY_R + 0.26), 0],
      ])
      f.style(2 + k, { color: new THREE.Color('#f5f3ee'), alpha: 0, width: 1.2, glow: 0 })
    }
    f.shape(7, KIND.ORBIT, 240, true) // the day's light travelling round
    f.style(7, { color: new THREE.Color('#ffd9a8'), alpha: 0, width: 1.2, glow: 6, glowAmt: 0.4 })
    return f
  }, [])
  const T = useMemo(() => ({ m: new THREE.Matrix4(), s: new THREE.Vector3() }), [])

  useFrame(({ gl, size }) => {
    const D = S.days
    const on = D.arc > 0.001
    f.mesh.visible = on
    if (!on) return
    const sc = layout.mobile ? 0.82 : 1
    // the dial faces the lens, centred on the ring (it follows the ring down onto the dock)
    T.m.compose(S.ring.pos, camera.quaternion, T.s.set(sc, sc, sc))
    for (let i = 0; i < 8; i++) f.matrix(i, T.m)
    const level = clamp(D.level)
    f.A(0, DAY_R, -1, Math.PI / 2, 0)
    f.window(0, level * smooth(clamp(D.arc * 2)), 0, 0.004)
    f.alpha(0, D.arc * (0.75 + 0.25 * D.charge))
    f.A(1, DAY_R, 1, 0, 0)
    f.alpha(1, 0.16 * D.arc)
    for (let k = 0; k < 5; k++) {
      const lit = smooth(clamp(D.day - k + 0.5))
      f.alpha(2 + k, D.arc * (0.25 + 0.75 * lit) * (1 - D.charge * 0.5))
    }
    // the day's light: once around the dial per day
    const dp = D.day % 1
    f.A(7, DAY_R + 0.42, -1, Math.PI / 2 - dp * Math.PI * 2 + 0.25, 0)
    f.window(7, 1, 0, 0.3)
    f.B(7, 0, 0, 0, 0)
    f.alpha(7, D.arc * (D.day > 0 && D.day < 5 ? 0.9 : 0) * (1 - D.charge))
    f.pulse(7, 0.02, 0.03, 0, 0)
    // draw only a short tail behind the light
    f.window(7, 0.08, 0, 0.06)
    f.flush(gl, size)
  })

  return <primitive object={f.mesh} />
}
