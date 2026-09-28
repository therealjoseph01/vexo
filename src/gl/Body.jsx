import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth, ease } from '../film/timeline'
import { LineField, KIND } from './LineField'
import { buildBodyContours, BODY_HEART } from './bodyContours'

/*
  03 · The body becomes data.
  A figure drawn as ~200 contour loops stands behind the ring, hand over the heart, aligned by
  forced perspective so the ring sits on the hand. Pulses travel through the contours toward the
  ring (body → ring); then the readings leave the ring and hang in space (ring → data).
*/

export const READOUTS = [
  { k: 'Heart rate', v: '62', u: 'bpm', off: [-2.4, 0.85, 0.5], offM: [-1.2, 1.55, 0.3] },
  { k: 'HRV', v: '46', u: 'ms', off: [2.3, 0.95, -0.6], offM: [1.2, 1.4, -0.3] },
  { k: 'Blood oxygen', v: '98', u: '%', off: [-2.2, -0.7, -0.9], offM: [-1.3, -0.05, -0.4] },
  { k: 'Skin temperature', v: '36.6', u: '°C', off: [2.5, -0.5, 0.7], offM: [1.25, -0.2, 0.3] },
  { k: 'Respiratory rate', v: '14', u: '/min', off: [-1.15, -1.85, -0.5], offM: [-1.1, -1.6, -0.2] },
  { k: 'Sleep', v: '7h 12m', u: '', off: [1.25, -1.75, 0.25], offM: [1.05, -1.75, 0.2] },
]
const offs = READOUTS.map((r) => new THREE.Vector3(...r.off))
const offsM = READOUTS.map((r) => new THREE.Vector3(...r.offM))
const q = new THREE.Quaternion()
const Y = new THREE.Vector3(0, 1, 0)

// Where readout i hangs right now (world). e = how far it has travelled out of the ring (0..1).
export function readoutPos(i, out, time = 0) {
  const d = S.body.data
  const e = ease.out(clamp((d - i * 0.09) / 0.5))
  q.setFromAxisAngle(Y, 0.18 * Math.sin(time * 0.12 + i) + (1 - e) * 0.6)
  out.copy(layout.mobile ? offsM[i] : offs[i]).applyQuaternion(q).multiplyScalar(e).add(S.ring.pos)
  return e
}

const tmpV = new THREE.Vector3()
const dir = new THREE.Vector3()
const target = new THREE.Vector3()
const mBody = new THREE.Matrix4()
const mLine = new THREE.Matrix4()
const mBreath = new THREE.Matrix4()
const sc = new THREE.Vector3()
const quat = new THREE.Quaternion()

export function Body() {
  const camera = useThree((s) => s.camera)
  const R = useMemo(() => {
    const loops = buildBodyContours(layout.mobile ? { slices: 70, res: 0.024, maxPts: 96, maxLoops: 200 } : {})
    const f = new LineField({ lines: loops.length, points: layout.mobile ? 96 : 128, renderOrder: 4 })
    const ymin = -1.74
    const ymax = 1.77
    loops.forEach((l, i) => {
      f.points(i, l.pts, true)
      f.style(i, { color: new THREE.Color('#d7dde6'), alpha: 0, width: 1.15, glow: 0, glowAmt: 0 })
      f.window(i, 1.02, -0.02, 0.01)
      f.depthFade(i, 0.85)
    })
    const yn = loops.map((l) => (l.y - ymin) / (ymax - ymin))
    // threads: ring → each readout
    const th = new LineField({ lines: READOUTS.length, points: 48, renderOrder: 6 })
    READOUTS.forEach((_, i) => {
      th.shape(i, KIND.BEZIER, 48)
      th.style(i, { color: new THREE.Color('#e9e9e4'), alpha: 0, width: 1, glow: 0 })
    })
    return { f, loops, yn, th }
  }, [])

  useFrame(({ gl, size, clock }) => {
    const B = S.body
    const time = film.reduced ? 0 : clock.elapsedTime
    const on = B.a > 0.001
    R.f.mesh.visible = on
    R.th.mesh.visible = on && B.data > 0
    if (!on) return

    // forced perspective: put the hand exactly behind the ring, far away and large
    const s = layout.mobile ? 2.7 : 3.05
    dir.copy(S.ring.pos).sub(camera.position).normalize()
    const zBody = S.ring.pos.z - 9.2
    const tt = (zBody - camera.position.z) / dir.z
    target.copy(camera.position).addScaledVector(dir, tt)
    tmpV.set(BODY_HEART[0], BODY_HEART[1], BODY_HEART[2]).multiplyScalar(s)
    target.sub(tmpV)
    target.y -= B.out * 1.2
    quat.identity()
    mBody.compose(target, quat, sc.set(s, s, s))

    const breath = Math.sin(time * ((2 * Math.PI * 14) / 60))
    const reveal = B.reveal * 1.12
    const pulse = B.flow
    R.loops.forEach((l, i) => {
      const yn = R.yn[i]
      // chest & ribcage swell with each breath
      const chest = Math.exp(-Math.pow((l.y - 0.85) / 0.35, 2))
      const k = 1 + 0.022 * breath * chest
      mBreath.makeScale(k, 1, k)
      mLine.multiplyMatrices(mBody, mBreath)
      R.f.matrix(i, mLine)
      // scan: loops appear bottom → top, with a bright front
      const vis = smooth(clamp((reveal - yn) / 0.06))
      const front = Math.exp(-Math.pow((reveal - yn) / 0.035, 2)) * (B.reveal < 1 ? 1 : 0)
      const heartGlow = Math.exp(-Math.pow((l.y - 0.98) / 0.18, 2)) * S.beat * 0.6
      R.f.alpha(i, B.a * (1 - B.out) * (0.42 * vis + 0.9 * front + heartGlow * vis))
      // signals converge on the ring
      R.f.pulse(i, -time * 0.55, 0.07, 3.2 * pulse, 3, 3.2)
    })
    R.f.flush(gl, size)

    // threads from the ring to the readouts
    READOUTS.forEach((_, i) => {
      const e = readoutPos(i, tmpV, time)
      const p0 = S.ring.pos
      const c1 = p0.clone().lerp(tmpV, 0.35)
      c1.y += 0.35
      const c2 = p0.clone().lerp(tmpV, 0.75)
      R.th.bezier(i, p0, c1, c2, tmpV)
      R.th.window(i, e, 0, 0.05)
      R.th.alpha(i, 0.22 * B.a * (1 - B.out) * Math.min(1, e * 3))
      R.th.pulse(i, (time * 0.6) % 1, 0.04, 2.5, 2, 1)
    })
    R.th.flush(gl, size)
  })

  return (
    <>
      <primitive object={R.f.mesh} />
      <primitive object={R.th.mesh} />
    </>
  )
}
