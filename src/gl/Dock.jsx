import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S } from '../film/director'
import { RING } from './ringGeometry'
import { studioMaterial } from './studio'
import { dockPrintTexture } from './textures'

/*
  The charging dock from Vexo's render: a soft rounded triangle, a centre puck the ring
  sits around, the wordmark printed across the back, a white status dot at the front.
*/
// matches the ring's docked pose in the director (y = -1.22, scale 0.84, lying flat)
const DOCK_SCALE = 0.84
const DOCK_Y = -1.22 - RING.h * DOCK_SCALE - 0.004

function roundedTriangle(side, r) {
  const s = new THREE.Shape()
  const R = side / Math.sqrt(3) // circumradius
  const pts = [0, 1, 2].map((i) => {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3
    return new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R)
  })
  for (let i = 0; i < 3; i++) {
    const p = pts[i]
    const prev = pts[(i + 2) % 3]
    const next = pts[(i + 1) % 3]
    const d1 = prev.clone().sub(p).normalize()
    const d2 = next.clone().sub(p).normalize()
    const ang = Math.acos(d1.dot(d2))
    const off = r / Math.tan(ang / 2)
    const a1 = p.clone().addScaledVector(d1, off)
    const a2 = p.clone().addScaledVector(d2, off)
    const bis = d1.clone().add(d2).normalize()
    const c = p.clone().addScaledVector(bis, r / Math.sin(ang / 2))
    if (i === 0) s.moveTo(a1.x, a1.y)
    else s.lineTo(a1.x, a1.y)
    // sweep the corner the short way round, through the point nearest the vertex
    const st = Math.atan2(a1.y - c.y, a1.x - c.x)
    const mid = Math.atan2(p.y - c.y, p.x - c.x)
    let dm = mid - st
    while (dm > Math.PI) dm -= Math.PI * 2
    while (dm < -Math.PI) dm += Math.PI * 2
    const sweep = Math.sign(dm) * (Math.PI - ang)
    const N = 18
    for (let k = 1; k <= N; k++) {
      const a = st + (sweep * k) / N
      s.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)
    }
    void a2
  }
  s.closePath()
  return s
}

export function Dock() {
  const ref = useRef()
  const led = useRef()
  const R = useMemo(() => {
    const body = new THREE.ExtrudeGeometry(roundedTriangle(4.3, 0.7), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 6, curveSegments: 40 })
    body.rotateX(-Math.PI / 2) // lie flat; extrusion goes +y
    body.translate(0, -0.29, 0) // top face at y = 0
    body.rotateY(Math.PI) // a vertex points toward the camera
    body.computeVertexNormals()
    const bodyMat = studioMaterial({ base: '#55575c', rough: 0.38, metal: 0.25 })
    // puck: a low dome that sits inside the ring
    const pr = RING.Ri - 0.07
    const prof = [new THREE.Vector2(0.0001, 0.17)]
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * (pr - 0.07)
      prof.push(new THREE.Vector2(x, 0.17 - 0.03 * (x / pr) ** 2))
    }
    for (let i = 1; i <= 14; i++) {
      const a = (i / 14) * (Math.PI / 2)
      prof.push(new THREE.Vector2(pr - 0.07 + Math.sin(a) * 0.07, 0.07 + Math.cos(a) * 0.07))
    }
    prof.push(new THREE.Vector2(pr, 0))
    const puck = new THREE.LatheGeometry(prof, 96)
    const puckMat = studioMaterial({ base: '#070708', rough: 0.06, metal: 0, side: THREE.DoubleSide })
    const print = new THREE.PlaneGeometry(1.5, 0.375)
    print.rotateX(-Math.PI / 2)
    const printMat = new THREE.MeshBasicMaterial({ map: dockPrintTexture(), transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, color: '#cfcfcf' })
    const ledMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    return { body, bodyMat, puck, puckMat, print, printMat, ledMat }
  }, [])

  useFrame((state) => {
    const d = S.days
    const k = d.dock
    ref.current.visible = k > 0.002
    if (!ref.current.visible) return
    // rises from below the frame, sinks away after the charge
    ref.current.scale.setScalar(DOCK_SCALE)
    ref.current.position.set(0, DOCK_Y - (1 - k) * 3.2, 0)
    ref.current.rotation.y = -0.1 + 0.05 * (1 - k)
    const breathe = 0.55 + 0.45 * Math.sin(state.clock.elapsedTime * 3)
    const c = d.charge > 0 && d.charge < 1 ? breathe : d.charge >= 1 ? 1 : 0.35
    R.ledMat.color.setScalar(0.4 + 2.2 * c)
  })

  return (
    <group ref={ref}>
      <mesh geometry={R.body} material={R.bodyMat} />
      <mesh geometry={R.puck} material={R.puckMat} />
      <mesh geometry={R.print} material={R.printMat} position={[0, 0.003, -1.35]} />
      <mesh ref={led} material={R.ledMat} position={[0, 0.004, 1.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 24]} />
      </mesh>
    </group>
  )
}
