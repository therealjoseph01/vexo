import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S } from '../film/director'
import { film } from '../film/store'
import { asset, onAsset } from './bandAsset'
import { anchors } from './anchors'
import { BAND_CENTER, PARTS, EXPLODE, INTERNAL, FINISH_LOOK, pointLocal } from './bandSpec'

/*
  The protagonist: Vexo Band, rendered from Vexo's own model.
  Model space is centimetres with the loop centred on the origin:
    +Y  across the band (the loop's axis)      −Z  the module side (top of the wrist)
    +Z  towards the wrist (sensor window faces this way)
*/
// world position of a named point on the band (follows the exploded view)
export function bandPoint(name, out) {
  if (!pointLocal(name, S.band.explode, out)) return false
  return out.applyMatrix4(S.band.matrix)
}

export function Band() {
  const [gltf, setGltf] = useState(asset.gltf)
  useEffect(() => onAsset((a) => a.gltf && setGltf(a.gltf)), [])
  const rig = useRef()
  const model = useRef()

  const R = useMemo(() => {
    if (!gltf) return null
    const scene = gltf.scene
    const parts = {}
    for (const child of scene.children) {
      for (const [k, re] of Object.entries(PARTS)) if (re.test(child.name)) (parts[k] ||= []).push({ node: child, z0: child.position.z })
    }
    const mats = { weave: [], tuck: [], metal: [], ledG: [], ledR: [], wrapAll: [] }
    scene.traverse((o) => {
      if (!o.isMesh) return
      const n = o.material.name || ''
      if (/Continuous wrap/.test(n)) mats.weave.push(o.material)
      if (/Tuck embroidery/.test(n)) mats.tuck.push(o.material)
      if (/— web$/.test(n) && !/wrap|Tuck/i.test(n)) mats.metal.push(o.material)
      if (/green LED/i.test(n)) mats.ledG.push(o.material)
      if (/red LED/i.test(n)) mats.ledR.push(o.material)
    })
    ;(parts.wrap || []).forEach(({ node }) =>
      node.traverse((o) => {
        if (o.isMesh) mats.wrapAll.push(o.material)
      }),
    )
    mats.ledG.forEach((m) => (m.emissiveIntensity = 0))
    mats.ledR.forEach((m) => (m.emissiveIntensity = 0))
    return { scene, parts, mats, look: { weave: new THREE.Color().copy(FINISH_LOOK.graphite.weave), tuck: new THREE.Color().copy(FINISH_LOOK.graphite.tuck), metal: new THREE.Color().copy(FINISH_LOOK.graphite.metal) } }
  }, [gltf])

  useFrame((_, dt) => {
    if (!R) return
    const B = S.band
    // world pose comes from the director as one matrix (floating, sliding onto the wrist, worn)
    rig.current.matrix.copy(B.matrix)
    rig.current.matrixWorldNeedsUpdate = true
    rig.current.visible = B.alpha > 0.002

    // finish, eased so a change reads as the same object re-lit
    const f = FINISH_LOOK[film.finish] || FINISH_LOOK.graphite
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 4)
    R.look.weave.lerp(f.weave, k)
    R.look.tuck.lerp(f.tuck, k)
    R.look.metal.lerp(f.metal, k)
    R.mats.weave.forEach((m) => m.color.copy(R.look.weave))
    R.mats.tuck.forEach((m) => m.color.copy(R.look.tuck))
    R.mats.metal.forEach((m) => m.color.copy(R.look.metal))

    // exploded view along the module's axis
    const e = B.explode
    for (const [key, list] of Object.entries(R.parts)) {
      for (const p of list) {
        p.node.position.z = p.z0 + (EXPLODE[key] || 0) * e
        if (INTERNAL.includes(key)) p.node.visible = e > 0.002
      }
    }
    // the weave steps back while the module opens (and for the x-ray under the wrist)
    const wa = B.wrapAlpha
    const want = wa < 0.995
    R.mats.wrapAll.forEach((m) => {
      if (m.transparent !== want) {
        m.transparent = want
        m.depthWrite = !want
        m.needsUpdate = true
      }
      m.opacity = wa
    })

    // sensor LEDs
    R.mats.ledG.forEach((m) => (m.emissiveIntensity = B.ledG * 9))
    R.mats.ledR.forEach((m) => (m.emissiveIntensity = B.ledR * 7))
  })

  const setModel = (o) => {
    model.current = o
    if (o) anchors.bandModel = o
  }

  return (
    <group ref={rig} matrixAutoUpdate={false}>
      {R && (
        <group ref={setModel} position={[-BAND_CENTER.x, -BAND_CENTER.y, -BAND_CENTER.z]}>
          <primitive object={R.scene} />
        </group>
      )}
    </group>
  )
}
