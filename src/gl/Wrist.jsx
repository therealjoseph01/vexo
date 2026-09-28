import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth, lerp } from '../film/timeline'
import { LineField } from './LineField'
import { armLoops, ARM_X0, ARM_X1, WRIST_X } from './armGeometry'
import { buildHand } from './handMesh'

/*
  The wearer's forearm and hand: real skin under the studio lights.
  It arrives fingertips-first, drawn out of the dark by a thin line of light, and for the
  sensor scene the skin turns glassy so the band's underside shows through, with contour lines
  carrying the signals up the wrist.
*/
const SKIN = new THREE.Color('#e9b99d')
const NAIL = new THREE.Color('#f3d2c6')

function skinMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: SKIN,
    roughness: 0.5,
    metalness: 0,
    sheen: 0.55,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#ffc2a8'),
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    transparent: true,
    depthWrite: true,
    envMapIntensity: 0.45,
  })
  const u = {
    uScan: { value: 99 },
    uAlpha: { value: 1 },
    uGlass: { value: 0 },
    uGlow: { value: new THREE.Color(0, 0, 0) },
    uNail: { value: NAIL },
    uWrist: { value: WRIST_X },
  }
  m.userData.u = u
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aNail;\nvarying float vAx;\nvarying float vNail;\nvarying vec3 vAp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAx = position.x;\nvNail = aNail;\nvAp = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uScan, uAlpha, uGlass, uWrist;
        uniform vec3 uGlow, uNail;
        varying float vAx;
        varying float vNail;
        varying vec3 vAp;
        float hsh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vnoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`,
      )
      // nails: paler and glossier; skin: a faint, even mottling so it doesn't read as plastic
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float mott = vnoise(vAp * 1.7) * 0.6 + vnoise(vAp * 5.3) * 0.4;
        diffuseColor.rgb *= 0.95 + 0.08 * mott;
        diffuseColor.rgb = mix(diffuseColor.rgb, uNail, smoothstep(0.2, 0.8, vNail));`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // skin relief: fine creases and pores, as a procedural bump (no texture to download)
          float hb = vnoise(vAp * 24.0) * 0.55 + vnoise(vAp * vec3(4.0, 11.0, 11.0)) * 0.45;
          // fine relief only, and only where it's big enough on screen not to shimmer
          float px = length(fwidth(vAp));
          hb *= 0.0035 * (1.0 - smoothstep(0.2, 0.8, vNail)) * (1.0 - smoothstep(0.05, 0.14, px));
          vec2 dh = vec2(dFdx(hb), dFdy(hb));
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2));
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.22, smoothstep(0.2, 0.8, vNail));
        roughnessFactor *= 0.9 + 0.2 * vnoise(vAp * 9.0);`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        // arrival: visible behind a travelling line of light (fingertips first)
        float shown = smoothstep(uScan - 0.2, uScan + 1.6, vAx);
        float front = exp(-pow((vAx - uScan) / 0.45, 2.0));
        // the cut at the elbow dissolves into the dark
        float elbow = smoothstep(${(ARM_X0 + 1).toFixed(1)}, ${(ARM_X0 + 8).toFixed(1)}, vAx);
        vec3 nV = normalize(vViewPosition);
        float rim = pow(1.0 - abs(dot(normalize(vNormal), -nV)), 2.5);
        // glass: the sensors see through you
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.02, 0.03, 0.03) + uGlow * (0.25 + rim), uGlass);
        gl_FragColor.rgb += vec3(1.0, 0.97, 0.93) * front * 1.4;
        gl_FragColor.rgb *= mix(1.0, elbow, 0.85);
        float a = shown * elbow * uAlpha;
        gl_FragColor.a *= mix(a, a * (0.16 + 0.8 * rim), uGlass);`,
      )
  }
  return m
}

const tint = new THREE.Color()
const green = new THREE.Color('#9dffc4')
const ink = new THREE.Color('#d9dee6')

export function Wrist() {
  const R = useMemo(() => {
    // contour loops only around the forearm and wrist (the fingers are real geometry now)
    const loops = armLoops(layout.mobile ? { step: 0.8, pts: 72, thumbPts: 36 } : { step: 0.55 }).filter((l) => l.part === 'arm' && l.x > -15 && l.x < 3.5)
    const f = new LineField({ lines: loops.length, points: layout.mobile ? 72 : 96, renderOrder: 6 })
    loops.forEach((l, i) => {
      f.points(i, l.pts, true)
      f.style(i, { color: ink, alpha: 0, width: 1, glow: 0 })
    })
    const geo = buildHand(layout.mobile ? { cell: 0.24 } : { cell: 0.2 })
    const mat = skinMaterial()
    const skin = new THREE.Mesh(geo, mat)
    skin.matrixAutoUpdate = false
    skin.frustumCulled = false
    skin.renderOrder = 1
    return { loops, f, skin, mat }
  }, [])

  useFrame(({ gl, size }) => {
    const A = S.arm
    const on = A.alpha > 0.002
    R.f.mesh.visible = on
    R.skin.visible = on
    if (!on) return
    const time = film.time
    R.skin.matrix.copy(A.matrix)
    R.skin.matrixWorldNeedsUpdate = true
    const u = R.mat.userData.u
    // the line of light runs from beyond the fingertips back to the elbow
    u.uScan.value = lerp(ARM_X1 + 1.5, ARM_X0 - 2, A.scan)
    if (A.scan >= 1) u.uScan.value = -99
    const glass = clamp(1 - A.solid)
    u.uGlass.value = glass
    u.uAlpha.value = A.alpha
    u.uGlow.value.copy(green).multiplyScalar(0.35 * A.tint)
    const opaque = glass < 0.4 && A.alpha > 0.98
    if (R.mat.depthWrite !== opaque) R.mat.depthWrite = opaque

    tint.copy(ink).lerp(green, A.tint)
    R.loops.forEach((l, i) => {
      R.f.matrix(i, A.matrix)
      R.f.style(i, { color: tint })
      const edge = smooth(clamp((l.x + 15) / 5)) * (1 - smooth(clamp((l.x - 1) / 2.5)))
      // where the band sits the skin reads brighter (contact), and in the sensor shot the whole wrist carries the signal
      const contact = Math.exp(-(((l.x - WRIST_X) / 2.2) ** 2)) * A.contact
      R.f.alpha(i, A.alpha * edge * glass * (0.38 + 0.3 * contact))
      // heart rate travels from the sensor along the wrist (repeating pulses on distance from the band)
      R.f.pulse(i, time * 0.8, 0.06, 3.2 * A.pulse, 3, 4)
      R.f.depthFade(i, 0)
    })
    R.f.flush(gl, size)
  })

  return (
    <>
      <primitive object={R.skin} />
      <primitive object={R.f.mesh} />
    </>
  )
}
