import * as THREE from 'three'

/*
  The Vexo Ring, modelled from Vexo's own render and photography.
  A flat titanium band with generously rounded outer edges, a crowned outer face,
  a comfort-fit inner channel with a fine stepped lip at each edge,
  a round microphone port on the outer face, and a raised sensor pill on the inner face
  (opposite the mic) with VΞXO engraved beside it.

  Units: inner lip radius = 1. Ring axis = local +Y. bandPoint(θ, r, y) = (r sinθ, y, r cosθ).
*/

export const RING = {
  Ri: 1.0, // inner lip radius
  Ro: 1.27, // outer radius
  h: 0.43, // half width (along the axis)
  fo: 0.085, // outer fillet
  fi: 0.034, // inner fillet
  crown: 0.012,
  step: 0.011, // depth of the recessed inner channel
  lip: 0.078, // width of the inner lip (from the edge)
  comfort: 0.008,
  thMic: Math.PI, // microphone on the back of the finger
  thSensor: 0, // sensor pill on the palm side
}

const sstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const rOut = (y) => {
  const { Ro, h, fo, crown } = RING
  const k = Math.max(0, 1 - (y / (h - fo)) ** 2)
  return Ro + crown * k * k
}

export const rIn = (y) => {
  const { Ri, h, fi, step, lip, comfort } = RING
  const a = Math.abs(y)
  const recess = step * (1 - sstep(h - lip - 0.012, h - lip, a))
  const span = h - lip - 0.012
  const k = Math.max(0, 1 - (y / span) ** 2)
  return Ri + recess - comfort * k * k * (a < span ? 1 : 0) + 0 * fi
}

export const bandPoint = (th, r, y, out = new THREE.Vector3()) => out.set(r * Math.sin(th), y, r * Math.cos(th))
export const bandNormal = (th, out = new THREE.Vector3()) => out.set(Math.sin(th), 0, Math.cos(th))
export const bandTangent = (th, out = new THREE.Vector3()) => out.set(Math.cos(th), 0, -Math.sin(th))

function profile() {
  const { Ro, Ri, h, fo, fi } = RING
  const P = [] // {r, y, part}
  const push = (r, y, part) => P.push({ r, y, part })
  // outer face, bottom → top
  const nOuter = 90
  for (let i = 0; i <= nOuter; i++) {
    const y = -(h - fo) + (2 * (h - fo) * i) / nOuter
    push(rOut(y), y, 0)
  }
  // top-outer fillet
  const nf = 22
  for (let i = 1; i <= nf; i++) {
    const a = (i / nf) * (Math.PI / 2)
    push(Ro - fo + fo * Math.cos(a), h - fo + fo * Math.sin(a), 1)
  }
  // top side, outward → inward
  const nSide = 10
  for (let i = 1; i < nSide; i++) {
    const r = Ro - fo - ((Ro - fo - (Ri + fi)) * i) / nSide
    push(r, h, 1)
  }
  // top-inner fillet
  const nfi = 14
  for (let i = 0; i <= nfi; i++) {
    const a = Math.PI / 2 + (i / nfi) * (Math.PI / 2)
    push(Ri + fi + fi * Math.cos(a), h - fi + fi * Math.sin(a), 2)
  }
  // inner face, top → bottom (dense, to catch the lip step)
  const nIn = 230
  for (let i = 1; i < nIn; i++) {
    const y = h - fi - (2 * (h - fi) * i) / nIn
    push(rIn(y), y, 2)
  }
  // bottom-inner fillet
  for (let i = 0; i <= nfi; i++) {
    const a = Math.PI + (i / nfi) * (Math.PI / 2)
    push(Ri + fi + fi * Math.cos(a), -h + fi + fi * Math.sin(a), 2)
  }
  // bottom side, inward → outward
  for (let i = 1; i < nSide; i++) {
    const r = Ri + fi + ((Ro - fo - (Ri + fi)) * i) / nSide
    push(r, -h, 1)
  }
  // bottom-outer fillet
  for (let i = 0; i < nf; i++) {
    const a = 1.5 * Math.PI + (i / nf) * (Math.PI / 2)
    push(Ro - fo + fo * Math.cos(a), -h + fo + fo * Math.sin(a), 1)
  }
  // normals by central difference on the closed loop (CCW in r,y → outward = (T.y, -T.x))
  const n = P.length
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n]
    const b = P[(i + 1) % n]
    let tr = b.r - a.r
    let ty = b.y - a.y
    const l = Math.hypot(tr, ty) || 1
    tr /= l
    ty /= l
    P[i].nr = ty
    P[i].ny = -tr
  }
  return P
}

// Surface of revolution with analytic normals, UVs and a part id (0 outer · 1 edges · 2 inner).
export function ringGeometry(segments = 384) {
  const P = profile()
  const np = P.length
  const rows = np + 1 // close the profile loop
  const cols = segments + 1
  const pos = new Float32Array(rows * cols * 3)
  const nor = new Float32Array(rows * cols * 3)
  const uv = new Float32Array(rows * cols * 2)
  const part = new Float32Array(rows * cols)
  // arclength for v
  const acc = [0]
  for (let j = 1; j <= np; j++) {
    const a = P[j - 1]
    const b = P[j % np]
    acc.push(acc[j - 1] + Math.hypot(b.r - a.r, b.y - a.y))
  }
  const total = acc[np]
  let k = 0
  for (let j = 0; j < rows; j++) {
    const p = P[j % np]
    for (let i = 0; i < cols; i++) {
      const th = (i / segments) * Math.PI * 2
      const s = Math.sin(th)
      const c = Math.cos(th)
      pos[k * 3] = p.r * s
      pos[k * 3 + 1] = p.y
      pos[k * 3 + 2] = p.r * c
      nor[k * 3] = p.nr * s
      nor[k * 3 + 1] = p.ny
      nor[k * 3 + 2] = p.nr * c
      uv[k * 2] = i / segments
      uv[k * 2 + 1] = acc[j] / total
      part[k] = p.part
      k++
    }
  }
  const idx = []
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i
      const b = j * cols + i + 1
      const c = (j + 1) * cols + i + 1
      const d = (j + 1) * cols + i
      idx.push(a, d, b, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setAttribute('aPart', new THREE.BufferAttribute(part, 1))
  g.setIndex(idx)
  fixWinding(g)
  g.computeBoundingSphere()
  return g
}

// Make triangle winding agree with the supplied normals (so FrontSide culling is correct).
function fixWinding(g) {
  const p = g.attributes.position
  const n = g.attributes.normal
  const index = g.index.array
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const nn = new THREE.Vector3()
  let score = 0
  for (let t = 0; t < Math.min(index.length, 3000); t += 3) {
    a.fromBufferAttribute(p, index[t])
    b.fromBufferAttribute(p, index[t + 1])
    c.fromBufferAttribute(p, index[t + 2])
    b.sub(a)
    c.sub(a)
    b.cross(c)
    nn.fromBufferAttribute(n, index[t])
    score += Math.sign(b.dot(nn))
  }
  if (score < 0) {
    for (let t = 0; t < index.length; t += 3) {
      const tmp = index[t + 1]
      index[t + 1] = index[t + 2]
      index[t + 2] = tmp
    }
    g.index.needsUpdate = true
  }
}

/*
  Bend a flat part onto the inner face of the band.
  Local frame of the flat geometry: x = along the circumference (arc length), y = along the axis,
  z = height above the inner surface (toward the finger).
*/
export function bendInner(geo, th0, lift = 0) {
  const p = geo.attributes.position
  const n = geo.attributes.normal
  const T = new THREE.Vector3()
  const In = new THREE.Vector3()
  const tmp = new THREE.Vector3()
  // (−T, Y, In) is right-handed, so windings survive the bend (x runs against θ)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const th = th0 - x / RING.Ri
    const r = rIn(y) - lift - z
    bandPoint(th, r, y, tmp)
    p.setXYZ(i, tmp.x, tmp.y, tmp.z)
    if (n) {
      const nx = n.getX(i)
      const ny = n.getY(i)
      const nz = n.getZ(i)
      bandTangent(th, T)
      bandNormal(th, In).multiplyScalar(-1)
      tmp.set(0, 0, 0).addScaledVector(T, -nx).addScaledVector(In, nz)
      tmp.y += ny
      tmp.normalize()
      n.setXYZ(i, tmp.x, tmp.y, tmp.z)
    }
  }
  p.needsUpdate = true
  if (n) n.needsUpdate = true
  geo.computeBoundingSphere()
  return geo
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape()
  const x = w / 2
  const y = h / 2
  r = Math.min(r, x, y)
  s.moveTo(-x + r, -y)
  s.lineTo(x - r, -y)
  s.absarc(x - r, -y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x, y - r)
  s.absarc(x - r, y - r, r, 0, Math.PI / 2, false)
  s.lineTo(-x + r, y)
  s.absarc(-x + r, y - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-x, -y + r)
  s.absarc(-x + r, -y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

// A soft, raised pill (the sensor module) — extruded rounded rect with a deep bevel, then bent.
export function pillGeometry(w, h, r, depth, bevel, th0, lift = 0) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.9,
    bevelSegments: 8,
    curveSegments: 28,
  })
  // extrude goes +z from 0..depth (+ bevel both sides). Put the base at z = -bevel → sits on the surface
  g.translate(0, 0, bevel)
  g.computeVertexNormals()
  return bendInner(g, th0, lift)
}

// A thin curved strip on the inner face (for the engraving decal)
export function innerStrip(th0, th1, y0, y1, lift, segX = 64, segY = 8) {
  const g = new THREE.PlaneGeometry(1, 1, segX, segY)
  const p = g.attributes.position
  const uv = g.attributes.uv
  const tmp = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i)
    const v = uv.getY(i)
    const th = th0 + (th1 - th0) * u
    const y = y0 + (y1 - y0) * v
    bandPoint(th, rIn(y) - lift, y, tmp)
    p.setXYZ(i, tmp.x, tmp.y, tmp.z)
  }
  g.computeVertexNormals()
  // normals must face the axis
  const n = g.attributes.normal
  for (let i = 0; i < n.count; i++) {
    const th = th0 + (th1 - th0) * uv.getX(i)
    const nx = -Math.sin(th)
    const nz = -Math.cos(th)
    n.setXYZ(i, nx, 0, nz)
  }
  return g
}
