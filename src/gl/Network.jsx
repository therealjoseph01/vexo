import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth } from '../film/timeline'
import { LineField, KIND } from './LineField'

/*
  07 · The body, as an API.
  The ring becomes the hub of a network: the app you just built, marketplace apps, external AI
  assistants over MCP, your own code over OAuth 2.1. Packets travel outward along each arc,
  labelled with the data that connection has been granted. In 08 it all retracts into the ring.
*/
export const NODES = [
  { name: 'Fuel Planner', via: 'Built with Vexo Studio', grant: 'latest vitals', off: [3.7, 1.55, -0.4], offM: [1.3, 2.35, 0] },
  { name: 'Stride', via: 'Marketplace · scoped access', grant: 'latest vitals', off: [4.1, -1.25, 0.5], offM: [1.3, -1.6, 0.3] },
  { name: 'Claude', via: 'MCP · your personal link', grant: 'metric history · transcripts', off: [-3.9, 1.35, 0.3], offM: [-1.3, 2.1, 0.2] },
  { name: 'ChatGPT', via: 'MCP · your personal link', grant: 'activity summaries', off: [-3.6, -1.35, -0.5], offM: [-1.3, -1.75, -0.3] },
  { name: 'Your code', via: 'OAuth 2.1 · scope by scope', grant: 'the scopes you approve', off: [0.35, -2.2, 0.9], offM: [0.1, -3.4, 0.5] },
]

const offs = NODES.map((n) => new THREE.Vector3(...n.off))
const offsM = NODES.map((n) => new THREE.Vector3(...n.offM))

export function nodePresence(i) {
  const A = S.api
  const k = smooth(clamp((A.grow - 0.25 - i * 0.1) / 0.4))
  // labels and nodes go out quickly as everything is pulled back into the ring
  return k * (1 - smooth(clamp(A.collapse * 2.5))) * (A.a > 0 ? 1 : 0)
}

export function nodePos(i, out) {
  const o = layout.mobile ? offsM[i] : offs[i]
  out.copy(o).multiplyScalar(1 - 0.92 * smooth(S.api.collapse)).add(S.ring.pos)
  out.y += 0.06 * Math.sin(film.time * 0.6 + i * 1.3)
  return out
}

export function Network() {
  const camera = useThree((s) => s.camera)
  const f = useMemo(() => {
    const f = new LineField({ lines: NODES.length * 3, points: 96, renderOrder: 8 })
    NODES.forEach((_, i) => {
      f.shape(i, KIND.BEZIER, 96)
      f.style(i, { color: new THREE.Color('#e7e9ee'), alpha: 0, width: 1.1, glow: 0 })
      f.shape(NODES.length + i, KIND.ORBIT, 48, true)
      f.style(NODES.length + i, { color: new THREE.Color('#ffffff'), alpha: 0, width: 1.4, glow: 5, glowAmt: 0.3 })
      f.shape(NODES.length * 2 + i, KIND.ORBIT, 64, true)
      f.style(NODES.length * 2 + i, { color: new THREE.Color('#dfe3ea'), alpha: 0, width: 1, glow: 0 })
    })
    return f
  }, [])
  const tmp = useMemo(() => ({ n: new THREE.Vector3(), d: new THREE.Vector3(), p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), m: new THREE.Matrix4(), s: new THREE.Vector3() }), [])

  useFrame(({ gl, size }) => {
    const A = S.api
    const on = A.a > 0.001
    f.mesh.visible = on
    if (!on) return
    const time = film.time
    NODES.forEach((_, i) => {
      const n = nodePos(i, tmp.n)
      const grow = smooth(clamp((A.grow - i * 0.1) / 0.45))
      // arc: leaves the rim of the ring, bows, lands on the node
      tmp.d.copy(n).sub(S.ring.pos).normalize()
      tmp.p0.copy(S.ring.pos).addScaledVector(tmp.d, 1.32 * S.ring.scale)
      tmp.p1.copy(tmp.p0).lerp(n, 0.35)
      tmp.p1.z += 1.1
      tmp.p1.y += 0.25
      tmp.p2.copy(tmp.p0).lerp(n, 0.8)
      tmp.p2.z += 0.5
      f.bezier(i, tmp.p0, tmp.p1, tmp.p2, n)
      f.window(i, grow * (1 - smooth(A.collapse)), 0, 0.04)
      f.alpha(i, 0.42 * A.a)
      // packets: data leaving the ring for this connection
      f.pulse(i, time * 0.5 + i * 0.21, 0.035, 4 * A.packets, 2, 2)
      // node: a point of light and a quiet halo, facing the lens
      const pr = nodePresence(i)
      tmp.m.compose(n, camera.quaternion, tmp.s.set(1, 1, 1))
      const core = NODES.length + i
      f.matrix(core, tmp.m)
      f.A(core, 0.075 * (0.5 + 0.5 * pr), 1, 0, 0)
      f.alpha(core, pr)
      const halo = NODES.length * 2 + i
      const ph = (time * 0.5 + i * 0.3) % 1
      f.matrix(halo, tmp.m)
      f.A(halo, 0.12 + ph * 0.3, 1, 0, 0)
      f.alpha(halo, pr * (1 - ph) * 0.5 * A.packets)
    })
    f.flush(gl, size)
  })

  return <primitive object={f.mesh} />
}
