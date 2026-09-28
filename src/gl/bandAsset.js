import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from '../vendor/DRACOLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SITE } from '../config'

/*
  Vexo's own product model (vexoai.com/models/vexo-wrap-product-v15-web.glb), copied to
  public/models/vexo-band.glb. Loaded once, before the film starts.
  Units are centimetres. The loop's axis is +Y (band width, 0 → 2.62), the module sits on −Z,
  its sensor window faces +Z (into the wrist), the microphone is on the module's top edge.
*/

export const asset = { gltf: null, progress: 0, error: null, ready: false }
const listeners = new Set()
export const onAsset = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const emit = () => listeners.forEach((f) => f(asset))

async function reachable(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, { method })
      if (r.ok) return true
    } catch (e) {
      /* try the next way */
    }
  }
  return false
}

function loadFrom(url, draco) {
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  return new Promise((resolve, reject) =>
    loader.load(
      url,
      resolve,
      (e) => {
        asset.progress = e.total ? e.loaded / e.total : Math.min(0.95, e.loaded / 7.4e6)
        emit()
      },
      reject,
    ),
  )
}

let started = null
export function loadBand() {
  if (started) return started
  started = (async () => {
    // local copy first (dev, production, hosted preview); vexoai.com's own file when opened from disk
    const localModel = 'models/vexo-band.glb'
    const remoteModel = `${SITE || 'https://www.vexoai.com'}/models/vexo-wrap-product-v15-web.glb`
    const localDraco = 'draco/'
    const remoteDraco = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    const draco = new DRACOLoader()
    draco.setDecoderPath((await reachable(localDraco + 'draco_wasm_wrapper.js')) ? localDraco : remoteDraco)
    // the same model as glTF + textures, for hosts that don't serve .glb (the hosted preview)
    const localGltf = 'models/vexo-band.gltf'
    let gltf = null
    for (const url of [localModel, localGltf, remoteModel]) {
      try {
        gltf = await loadFrom(url, draco)
        break
      } catch (e) {
        if (url === remoteModel) throw e
      }
    }
    draco.dispose()
    prepare(gltf.scene)
    asset.gltf = gltf
    asset.ready = true
    asset.progress = 1
    emit()
    return gltf
  })().catch((err) => {
    asset.error = err
    emit()
    throw err
  })
  return started
}

// Merge a many-part group (the PCBs) into one mesh per material: 240 draw calls → a handful.
function mergeGroup(group) {
  group.updateWorldMatrix(true, true)
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert()
  const byMat = new Map()
  const drop = []
  group.traverse((o) => {
    if (!o.isMesh) return
    const g = o.geometry.clone()
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()])
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))
    const key = o.material.uuid
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, geos: [] })
    byMat.get(key).geos.push(g)
    drop.push(o)
  })
  for (const o of drop) o.parent.remove(o)
  for (const { mat, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false)
    if (merged) group.add(new THREE.Mesh(merged, mat))
  }
}

function prepare(scene) {
  for (const child of [...scene.children]) {
    if (/PCB|Battery|ERM motor/.test(child.name)) mergeGroup(child)
  }
  scene.traverse((o) => {
    if (!o.isMesh) return
    const m = o.material
    o.frustumCulled = false
    // Transmission needs an extra render pass; the smoked glass reads just as well as tinted, glossy and see-through.
    if (m.transmission > 0) {
      m.transmission = 0
      if (/smoked optical glass/i.test(m.name)) {
        m.color.set('#0c0f12')
        m.roughness = /inner/i.test(m.name) ? 0.2 : 0.04
        m.transparent = true
        m.opacity = /inner/i.test(m.name) ? 0.25 : 0.62
        m.depthWrite = false
        o.renderOrder = 3
      } else {
        m.transparent = true
        m.opacity = 0.18
        m.depthWrite = false
        o.renderOrder = 2
      }
    }
    m.envMapIntensity = 1
  })
}
