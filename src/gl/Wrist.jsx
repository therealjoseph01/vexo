import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth } from '../film/timeline'
import { LineField } from './LineField'
import { armLoops, armSolid, ARM_X0, ARM_X1, WRIST_X } from './armGeometry'

/*
  The wearer's wrist: contour loops of light over a near-black sculpted form.
  The form occludes the far side of the band and the lines behind it, so the band sits
  around a solid wrist; for the sensor shot it fades and the wrist becomes an x-ray.
*/
const occluderVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const occluderFrag = /* glsl */ `
  uniform float uA;
  uniform vec3 uRim;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float f = pow(1.0 - clamp(abs(dot(n, normalize(vV))), 0.0, 1.0), 2.5);
    vec3 c = vec3(0.008, 0.009, 0.011) + uRim * f;
    gl_FragColor = vec4(c, uA);
  }
`

const tint = new THREE.Color()
const green = new THREE.Color('#9dffc4')

export function Wrist() {
  const R = useMemo(() => {
    const loops = armLoops(layout.mobile ? { step: 0.7, pts: 72, thumbPts: 36 } : {})
    const f = new LineField({ lines: loops.length, points: layout.mobile ? 72 : 96, renderOrder: 6 })
    loops.forEach((l, i) => {
      f.points(i, l.pts, true)
      f.style(i, { color: new THREE.Color('#d9dee6'), alpha: 0, width: 1, glow: 0 })
    })
    const geo = armSolid(layout.mobile ? { rings: 100, seg: 48 } : {})
    const mat = new THREE.ShaderMaterial({
      vertexShader: occluderVert,
      fragmentShader: occluderFrag,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: { uA: { value: 1 }, uRim: { value: new THREE.Color(0.05, 0.055, 0.062) } },
    })
    const solid = new THREE.Mesh(geo, mat)
    solid.renderOrder = 0
    solid.frustumCulled = false
    return { loops, f, solid, mat }
  }, [])

  useFrame(({ gl, size }) => {
    const A = S.arm
    const on = A.alpha > 0.002
    R.f.mesh.visible = on
    R.solid.visible = on && A.solid > 0.01
    if (!on) return
    const time = film.time
    R.solid.matrixAutoUpdate = false
    R.solid.matrix.copy(A.matrix)
    R.solid.matrixWorldNeedsUpdate = true
    const solidA = A.solid * A.alpha
    R.mat.uniforms.uA.value = solidA
    R.mat.depthWrite = solidA > 0.6
    R.mat.uniforms.uRim.value.setRGB(0.05, 0.055, 0.062).multiplyScalar(0.6 + 0.8 * A.rim)

    const span = ARM_X1 - ARM_X0
    tint.set('#d9dee6').lerp(green, A.tint)
    R.loops.forEach((l, i) => {
      R.f.matrix(i, A.matrix)
      R.f.style(i, { color: tint })
      // drawn in from the elbow like a scan, faded at the cut and towards the fingertips
      const xn = (l.x - ARM_X0) / span
      const vis = smooth(clamp((A.scan * 1.15 - xn) / 0.08))
      const edge = smooth(clamp((l.x - ARM_X0) / 5)) * (1 - 0.75 * smooth(clamp((l.x - 11) / 7)))
      // where the band sits the skin reads brighter (contact)
      const contact = Math.exp(-Math.pow((l.x - WRIST_X) / 2.2, 2)) * A.contact
      R.f.alpha(i, A.alpha * vis * (0.32 * edge + 0.5 * contact) * (l.part === 'thumb' ? 0.8 : 1))
      // health signals travel from the sensor along the wrist (repeating pulses on distance from the band)
      R.f.pulse(i, time * 0.8, 0.06, 3.2 * A.pulse, 3, 4)
    })
    R.f.flush(gl, size)
  })

  return (
    <>
      <primitive object={R.solid} />
      <primitive object={R.f.mesh} />
    </>
  )
}
