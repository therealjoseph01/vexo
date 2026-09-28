import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S } from '../film/director'
import { film } from '../film/store'
import { anchors } from './anchors'
import { RING, ringGeometry, pillGeometry, innerStrip, bendInner, roundedRectShape, bandPoint, bandNormal, rOut } from './ringGeometry'
import { studioMaterial, FINISH_LOOK } from './studio'
import { engravingTexture, grilleTexture, glowTexture } from './textures'

/*
  The protagonist. Every scene moves this one object; it is never swapped for an image.
*/
export function Ring({ segments = 384 }) {
  const rig = useRef()
  const body = useRef()
  const ledG = useRef()
  const ledR = useRef()
  const glowG = useRef()
  const glowR = useRef()

  const R = useMemo(() => {
    const geo = ringGeometry(segments)
    const metal = studioMaterial({ base: '#e3e2de', rough: 0.07, metal: 1, fx: true, part: true, innerAO: 0.5 })
    // sensor pill: glossy black, raised off the inner face (opposite the microphone)
    const pillW = 0.27
    const pillH = 0.46
    const pill = pillGeometry(pillW, pillH, 0.12, 0.01, 0.024, RING.thSensor)
    const pillMat = studioMaterial({ base: '#050506', rough: 0.05, metal: 0, innerAO: 1 })
    const lift = 0.0592 // just above the pill's flat top (depth + 2 × bevel = 0.058)
    const win = (w, h, r, y) => {
      const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24)
      g.translate(0, y, 0)
      return bendInner(g, RING.thSensor, lift)
    }
    const winTop = win(0.17, 0.09, 0.04, 0.13)
    const winLow = win(0.18, 0.21, 0.07, -0.075)
    const glassMat = studioMaterial({ base: '#000000', rough: 0.02, metal: 0, innerAO: 1, polygonOffset: 2 })
    const lowMat = studioMaterial({ base: '#0b0b0d', rough: 0.12, metal: 0, innerAO: 1, polygonOffset: 2 })
    const led = (w, h, r, x, y) => {
      const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 12)
      g.translate(x, y, 0)
      return bendInner(g, RING.thSensor, lift + 0.001)
    }
    const ledGGeo = led(0.052, 0.034, 0.006, -0.036, 0.13)
    const ledRGeo = led(0.028, 0.028, 0.014, 0.04, 0.13)
    const ledGMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.14, 0.08), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    const ledRMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.14, 0.04, 0.04), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    const glow = glowTexture()
    const glowGMat = new THREE.SpriteMaterial({ map: glow, color: '#35ff7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    const glowRMat = new THREE.SpriteMaterial({ map: glow, color: '#ff3b30', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    const ledPos = (x, y) => bandPoint(RING.thSensor - x / RING.Ri, RING.Ri - lift - 0.02, y)

    // VΞXO engraved beside the pill
    const eng = innerStrip(RING.thSensor + 0.3, RING.thSensor + 0.98, -0.075, 0.075, 0.0007)
    const engMat = studioMaterial({ base: '#8d8c88', rough: 0.35, metal: 1, map: engravingTexture(), mapColor: '#6f6e6a', mapRough: 0.4, mapAlpha: true, transparent: true, depthWrite: false, polygonOffset: 3, innerAO: 0.5, side: THREE.DoubleSide })

    // microphone: polished bezel around a dark mesh grille, on the outer face
    const n = bandNormal(RING.thMic, new THREE.Vector3())
    const P = bandPoint(RING.thMic, rOut(0), 0, new THREE.Vector3())
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    const bezelGeo = new THREE.TorusGeometry(0.056, 0.0095, 20, 72)
    const grilleGeo = new THREE.CircleGeometry(0.052, 48)
    const bezelMat = studioMaterial({ base: '#e3e2de', rough: 0.05, metal: 1 })
    const grilleMat = studioMaterial({ base: '#2a2a2d', rough: 0.3, metal: 1, map: grilleTexture(), mapColor: '#010101', mapRough: 0.9, polygonOffset: 1 })
    const micPos = P.clone().addScaledVector(n, 0.0006)
    const bezelPos = P.clone().addScaledVector(n, 0.0012)

    return { geo, metal, pill, pillMat, winTop, winLow, glassMat, lowMat, ledGGeo, ledRGeo, ledGMat, ledRMat, glowGMat, glowRMat, ledGPos: ledPos(-0.036, 0.13), ledRPos: ledPos(0.04, 0.13), eng, engMat, bezelGeo, grilleGeo, bezelMat, grilleMat, micPos, bezelPos, q }
  }, [segments])

  const cur = useMemo(() => ({ base: new THREE.Color('#e3e2de'), rough: 0.07, ao: 0.5, target: new THREE.Color() }), [])

  useFrame((_, dt) => {
    const r = S.ring
    rig.current.position.copy(r.pos)
    rig.current.quaternion.copy(r.quat)
    rig.current.scale.setScalar(r.scale)
    rig.current.visible = r.opacity > 0.002

    // finish (eased so a change reads as the same object re-lit, not a swap)
    const look = FINISH_LOOK[film.finish] || FINISH_LOOK.silver
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 4)
    cur.base.lerp(look.base, k)
    cur.rough += (look.rough - cur.rough) * k
    cur.ao += (look.ao - cur.ao) * k
    const m = R.metal.uniforms
    m.uBase.value.copy(cur.base)
    m.uRough.value = cur.rough
    m.uInnerAO.value = cur.ao
    R.bezelMat.uniforms.uBase.value.copy(cur.base)
    R.engMat.uniforms.uBase.value.copy(cur.base).multiplyScalar(0.62)
    R.engMat.uniforms.uMapColor.value.copy(cur.base).multiplyScalar(0.45)

    // sensor LEDs
    const g = S.led.g
    const rr = S.led.r
    R.ledGMat.color.setRGB(0.05 + 0.5 * g, 0.14 + 2.6 * g, 0.08 + 0.9 * g)
    R.ledRMat.color.setRGB(0.14 + 2.4 * rr, 0.04 + 0.3 * rr, 0.04 + 0.25 * rr)
    R.glowGMat.opacity = g * 0.9
    R.glowRMat.opacity = rr * 0.85
    glowG.current.visible = g > 0.003
    glowR.current.visible = rr > 0.003
  })

  const setAnchor = (name) => (o) => {
    if (o) anchors[name] = o
  }

  const normalsOnly = typeof window !== 'undefined' && /~n/.test(window.location.hash)
  return (
    <group ref={rig}>
      <group ref={body}>
        {normalsOnly ? (
          <mesh geometry={R.geo}>
            <meshNormalMaterial />
          </mesh>
        ) : (
          <mesh geometry={R.geo} material={R.metal} />
        )}
        <mesh geometry={R.pill} material={R.pillMat} />
        <mesh geometry={R.winTop} material={R.glassMat} />
        <mesh geometry={R.winLow} material={R.lowMat} />
        <mesh geometry={R.ledGGeo} material={R.ledGMat} />
        <mesh geometry={R.ledRGeo} material={R.ledRMat} />
        <sprite ref={glowG} material={R.glowGMat} position={R.ledGPos} scale={[0.34, 0.34, 0.34]} />
        <sprite ref={glowR} material={R.glowRMat} position={R.ledRPos} scale={[0.26, 0.26, 0.26]} />
        <mesh geometry={R.eng} material={R.engMat} renderOrder={2} />
        <mesh geometry={R.grilleGeo} material={R.grilleMat} position={R.micPos} quaternion={R.q} />
        <mesh geometry={R.bezelGeo} material={R.bezelMat} position={R.bezelPos} quaternion={R.q} />
        {/* anchors for labels & effects (ring-local) */}
        <group ref={setAnchor('ringCenter')} />
        <group ref={setAnchor('mic')} position={R.bezelPos} />
        <group ref={setAnchor('sensor')} position={bandPoint(RING.thSensor, RING.Ri - 0.06, 0)} />
        <group ref={setAnchor('ledG')} position={R.ledGPos} />
        <group ref={setAnchor('ledR')} position={R.ledRPos} />
        <group ref={setAnchor('top')} position={[0, 0, -RING.Ro]} />
      </group>
    </group>
  )
}
