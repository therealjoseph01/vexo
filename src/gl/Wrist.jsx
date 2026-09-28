import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { clamp, smooth, lerp } from '../film/timeline'
import { LineField } from './LineField'
import { armLoops, ARM_X0, ARM_X1, WRIST_X } from './armGeometry'
import { buildHandAsync, handAsset } from './handMesh'

/*
  The wearer's forearm and hand: skin under the studio lights.
  It arrives fingertips-first, drawn out of the dark by a thin line of light. For the sensor scene the
  skin turns glassy so the band's underside shows through, with contour lines carrying the pulse.

  Skin shading, on top of three's physical material:
    · albedo per vertex (knuckles and fingertips redder, the inner forearm paler, faint veins)
    · light that wraps past the terminator, red-shifted, the way it scatters under skin
    · light through thin flesh (fingers, the web of the hand) when it comes from behind
    · fine relief: pores, and creases across the finger joints
    · nails: paler, smoother, glossier
*/
export const HAND_OPTS = () => (layout.mobile ? { cell: 0.2 } : { cell: 0.14 })

function skinMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.52,
    metalness: 0,
    sheen: 0.22,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#ffc7b0'),
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    specularIntensity: 0.5,
    transparent: true,
    depthWrite: true,
    envMapIntensity: 0.4,
  })
  const u = {
    uScan: { value: 99 },
    uAlpha: { value: 1 },
    uGlass: { value: 0 },
    uGlow: { value: new THREE.Color(0, 0, 0) },
    uSSS: { value: 1 },
  }
  m.userData.u = u
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u)
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aNail;\nattribute float aThin;\nattribute vec2 aCrease;\nvarying float vAx;\nvarying float vNail;\nvarying float vThin;\nvarying vec2 vCrease;\nvarying vec3 vAp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAx = position.x;\nvNail = aNail;\nvThin = aThin;\nvCrease = aCrease;\nvAp = position;')
    const skinDiffuse = /* glsl */ `
      {
        // skin: light wraps past the terminator (red most, blue least), and thin flesh glows when backlit
        float nl = dot( geometryNormal, directLight.direction );
        vec3 wrapW = vec3( 0.45, 0.2, 0.12 ) * uSSS;
        vec3 wrapNL = clamp( ( vec3( nl ) + wrapW ) / ( 1.0 + wrapW ), 0.0, 1.0 );
        vec3 hv = normalize( directLight.direction + geometryNormal * 0.35 );
        float back = pow( saturate( dot( geometryViewDir, -hv ) ), 3.0 ) * vThin * uSSS;
        vec3 skinIrr = ( wrapNL + back * vec3( 1.0, 0.3, 0.16 ) * 0.7 ) * directLight.color;
        reflectedLight.directDiffuse += skinIrr * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
      }`
    const pars = THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );',
      skinDiffuse,
    )
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uScan, uAlpha, uGlass, uSSS;
        uniform vec3 uGlow;
        varying float vAx;
        varying float vNail;
        varying float vThin;
        varying vec2 vCrease;
        varying vec3 vAp;
        float hsh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vnoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hsh(i), hsh(i + vec3(1,0,0)), f.x), mix(hsh(i + vec3(0,1,0)), hsh(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hsh(i + vec3(0,0,1)), hsh(i + vec3(1,0,1)), f.x), mix(hsh(i + vec3(0,1,1)), hsh(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`,
      )
      .replace('#include <lights_physical_pars_fragment>', pars)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // a faint, even mottling so the skin never reads as plastic
        float mott = vnoise(vAp * 1.6) * 0.55 + vnoise(vAp * 4.7) * 0.45;
        diffuseColor.rgb *= 0.95 + 0.08 * mott;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          float px = length(fwidth(vAp));
          float nailK = smoothstep(0.2, 0.8, vNail);
          // pores and fine skin texture
          float hb = (vnoise(vAp * 30.0) * 0.6 + vnoise(vAp * 11.0) * 0.4) * 0.0018 * (1.0 - smoothstep(0.02, 0.07, px));
          // creases across the finger joints: a few fine lines, only right over the joint, only up close
          float cr = vCrease.x * vCrease.x * (1.0 - nailK);
          hb += cr * 0.006 * pow(0.5 + 0.5 * cos(vCrease.y * 48.0), 4.0) * (1.0 - smoothstep(0.015, 0.045, px));
          hb *= 1.0 - nailK;
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
        roughnessFactor = mix(roughnessFactor * (0.9 + 0.2 * vnoise(vAp * 9.0)), 0.2, smoothstep(0.2, 0.8, vNail));
        // the creases hold a little less shine
        roughnessFactor = min(1.0, roughnessFactor + vCrease.x * 0.08);`,
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
        float ndv = abs(dot(normalize(vNormal), -nV));
        float rim = pow(1.0 - ndv, 2.5);
        // skin falls off towards the silhouette (light scattered sideways, the curve turning away): form, not a flat cut-out
        gl_FragColor.rgb *= mix(0.74, 1.0, smoothstep(0.05, 0.75, ndv)) * (1.0 - uGlass) + uGlass;
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
  const [geo, setGeo] = useState(handAsset.geo)
  useEffect(() => {
    let live = true
    buildHandAsync(HAND_OPTS()).then((g) => live && setGeo(g))
    return () => {
      live = false
    }
  }, [])

  const R = useMemo(() => {
    // contour loops only around the forearm and wrist (for the sensor scene)
    const loops = armLoops(layout.mobile ? { step: 0.8, pts: 72, thumbPts: 36 } : { step: 0.55 }).filter((l) => l.part === 'arm' && l.x > -15 && l.x < 3.5)
    const f = new LineField({ lines: loops.length, points: layout.mobile ? 72 : 96, renderOrder: 6 })
    loops.forEach((l, i) => {
      f.points(i, l.pts, true)
      f.style(i, { color: ink, alpha: 0, width: 1, glow: 0 })
    })
    return { loops, f }
  }, [])

  const skin = useMemo(() => {
    if (!geo) return null
    const mat = skinMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.matrixAutoUpdate = false
    mesh.frustumCulled = false
    mesh.renderOrder = 1
    return { mesh, mat }
  }, [geo])

  useFrame(({ gl, size }) => {
    const A = S.arm
    const on = A.alpha > 0.002
    R.f.mesh.visible = on
    if (skin) skin.mesh.visible = on
    if (!on) return
    const time = film.time
    const glass = clamp(1 - A.solid)
    if (skin) {
      skin.mesh.matrix.copy(A.matrix)
      skin.mesh.matrixWorldNeedsUpdate = true
      const u = skin.mat.userData.u
      // the line of light runs from beyond the fingertips back to the elbow
      u.uScan.value = A.scan >= 1 ? -99 : lerp(ARM_X1 + 1.5, ARM_X0 - 2, A.scan)
      u.uGlass.value = glass
      u.uAlpha.value = A.alpha
      u.uGlow.value.copy(green).multiplyScalar(0.35 * A.tint)
      const opaque = glass < 0.4 && A.alpha > 0.98
      if (skin.mat.depthWrite !== opaque) skin.mat.depthWrite = opaque
    }

    tint.copy(ink).lerp(green, A.tint)
    R.loops.forEach((l, i) => {
      R.f.matrix(i, A.matrix)
      R.f.style(i, { color: tint })
      const edge = smooth(clamp((l.x + 15) / 5)) * (1 - smooth(clamp((l.x - 1) / 2.5)))
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
      {skin && <primitive object={skin.mesh} />}
      <primitive object={R.f.mesh} />
    </>
  )
}
