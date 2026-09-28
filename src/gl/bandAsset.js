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

/*
  The same model as glTF JSON with its geometry buffer inlined and textures alongside, for hosts that
  won't serve .glb or fetch data: URIs (the hosted preview). It is repacked into a GLB in memory.
*/
async function loadPacked(url, draco) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  const total = +res.headers.get('content-length') || 4.1e6
  let text
  if (res.body && res.body.getReader) {
    const reader = res.body.getReader()
    const parts = []
    let got = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      parts.push(value)
      got += value.length
      asset.progress = Math.min(0.97, got / total)
      emit()
    }
    text = new TextDecoder().decode(await new Blob(parts).arrayBuffer())
  } else text = await res.text()
  const json = JSON.parse(text)
  const uri = json.buffers[0].uri
  const b64 = uri.slice(uri.indexOf(',') + 1)
  const raw = atob(b64)
  const bin = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bin[i] = raw.charCodeAt(i)
  delete json.buffers[0].uri
  const enc = new TextEncoder().encode(JSON.stringify(json))
  const jl = (enc.length + 3) & ~3
  const bl = (bin.length + 3) & ~3
  const glb = new Uint8Array(12 + 8 + jl + 8 + bl)
  const dv = new DataView(glb.buffer)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, glb.length, true)
  dv.setUint32(12, jl, true)
  dv.setUint32(16, 0x4e4f534a, true)
  glb.set(enc, 20)
  for (let i = enc.length; i < jl; i++) glb[20 + i] = 0x20
  dv.setUint32(20 + jl, bl, true)
  dv.setUint32(24 + jl, 0x004e4942, true)
  glb.set(bin, 28 + jl)
  const loader = new GLTFLoader()
  loader.setDRACOLoader(draco)
  const base = url.slice(0, url.lastIndexOf('/') + 1)
  return new Promise((resolve, reject) => loader.parse(glb.buffer, base, resolve, reject))
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
        gltf = url === localGltf ? await loadPacked(url, draco) : await loadFrom(url, draco)
        break
      } catch (e) {
        console.warn('Vexo Band: could not load', url, (e && e.message) || e)
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
