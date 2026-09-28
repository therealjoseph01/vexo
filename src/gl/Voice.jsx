import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth } from '../film/timeline'
import { LineField, KIND } from './LineField'
import { anchors } from './anchors'

/*
  04 · Double tap to speak.
  A voice arrives as a travelling waveform and pours into the microphone port as contracting
  rings (the official render's sound rings, reversed). The ring answers with a haptic: a ring of
  light that spreads through the band and keeps going — it becomes the orbit where apps appear.
*/
const NW = 3 // waveform layers
const NR = 5 // converging rings

const mic = new THREE.Vector3()
const m = new THREE.Matrix4()
const qz = new THREE.Quaternion()
const scl = new THREE.Vector3(1, 1, 1)
const pos = new THREE.Vector3()

export function Voice() {
  const camera = useThree((s) => s.camera)
  const f = useMemo(() => {
    const f = new LineField({ lines: NW + NR + 1, points: 320, renderOrder: 7 })
    for (let i = 0; i < NW; i++) {
      f.shape(i, KIND.WAVE, 320)
      f.style(i, { color: new THREE.Color(i === 0 ? '#f4f3ee' : '#bfc6d2'), alpha: 0, width: i === 0 ? 1.6 : 1, glow: i === 0 ? 6 : 0, glowAmt: 0.25 })
    }
    for (let i = 0; i < NR; i++) {
      f.shape(NW + i, KIND.ORBIT, 160, true)
      f.style(NW + i, { color: new THREE.Color('#f4f3ee'), alpha: 0, width: 1.1, glow: 0 })
    }
    f.shape(NW + NR, KIND.ORBIT, 360, true)
    f.style(NW + NR, { color: new THREE.Color('#eef2ff'), alpha: 0, width: 1.4, glow: 8, glowAmt: 0.35 })
    return f
  }, [])

  useFrame(({ gl, size, clock }) => {
    const V = S.voice
    const time = film.reduced ? 0 : clock.elapsedTime
    const on = V.wave > 0.001 || V.rings > 0.001 || V.orbit > 0.001
    f.mesh.visible = on
    if (!on) return
    const a = anchors.mic
    if (a) a.getWorldPosition(mic)
    const sc = S.ring.scale

    // waveform: from the left edge of the frame into the port (sized to what the lens sees)
    const halfW = mic.distanceTo(camera.position) * Math.tan((camera.fov * Math.PI) / 360) * (size.width / size.height)
    const len = Math.max(0.6, halfW * 0.5 * (layout.mobile ? 1.1 : 1))
    for (let i = 0; i < NW; i++) {
      pos.set(mic.x - len - 0.12, mic.y + 0.02, mic.z + 0.12)
      qz.identity()
      m.compose(pos, qz, scl.set(1, 1, 1))
      f.matrix(i, m)
      const amp = (layout.mobile ? 0.2 : 0.3) * (i === 0 ? 1 : 0.55 - i * 0.12)
      f.A(i, len, amp * V.wave, 7 + i * 2.3, time * (5.5 + i) + i)
      // envelope: centred on the travelling front, speech-like syllables
      f.B(i, clamp(V.front * 1.05), 0.34, 13 + i * 3.1, 1)
      f.window(i, clamp(V.front * 1.1), clamp(V.front * 1.1 - 0.75), 0.08)
      f.alpha(i, V.wave * (i === 0 ? 0.95 : 0.4))
    }

    // rings contracting into the port (in the plane of the ring's surface at the mic)
    qz.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1))
    for (let i = 0; i < NR; i++) {
      const ph = (time * 0.55 + i / NR) % 1
      const r = (0.07 + (1 - ph) * 0.62) * sc
      pos.copy(mic)
      pos.z += 0.01
      m.compose(pos, qz, scl.set(1, 1, 1))
      f.matrix(NW + i, m)
      f.A(NW + i, r, 1, 0, 0)
      f.B(NW + i, 0, 0, 0, 0)
      f.window(NW + i, 1.01, -0.01, 0.001)
      f.alpha(NW + i, V.rings * smooth(ph) * (1 - ph) * 2.2)
    }

    // the haptic answer: a ring of light that spreads through the band → the apps' orbit
    const k = NW + NR
    const r = 1.28 + smooth(V.ripple) * (layout.mobile ? 2.4 : 3.3)
    f.matrix(k, S.plane)
    f.A(k, r / Math.max(0.001, sc), 1, 0, 0)
    f.B(k, 0, 0, 0, 0)
    f.window(k, 1.01, -0.01, 0.001)
    f.alpha(k, V.orbit * (0.35 + 0.65 * (1 - smooth(V.ripple) * 0.6)))
    f.flush(gl, size)
  })

  return <primitive object={f.mesh} />
}
