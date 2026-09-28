import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { S, layout } from '../film/director'
import { film } from '../film/store'
import { ENV } from './studio'

/*
  Dust in the light. It exists for two reasons only:
  in Scene 01 it gives the darkness depth and catches the travelling light (forward scatter),
  and in Scene 02 it *is* the motion signal — it is kicked by the speed of your own scroll.
*/
const vert = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime, uKick, uSize, uPR, uBase;
  uniform vec3 uLight;
  varying float vA;
  void main() {
    vec3 p = position;
    p += 0.18 * vec3(sin(uTime * 0.07 + aSeed.x * 40.0), sin(uTime * 0.05 + aSeed.y * 31.0), sin(uTime * 0.06 + aSeed.z * 23.0));
    vec3 kd = normalize(aSeed - 0.5);
    p += kd * uKick * (0.4 + aSeed.x);
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vec3 toP = normalize(wp.xyz - cameraPosition);
    // only motes inside the beam, between you and the light, are visible (forward scatter)
    float fwd = pow(max(dot(toP, uLight), 0.0), 14.0);
    // during 02 (motion) a faint field is visible everywhere so your scroll can shove it
    vA = (uBase + 1.4 * fwd) * (0.3 + 0.7 * aSeed.y) * step(0.5, aSeed.z);
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPR * (0.5 + aSeed.z) / -mv.z;
  }
`
const frag = /* glsl */ `
  uniform float uA;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.05, length(c));
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.93), a * vA * uA);
    if (gl_FragColor.a < 0.002) discard;
  }
`

export function Dust() {
  const ref = useRef()
  const N = layout.mobile ? 500 : 1100
  const geo = useMemo(() => {
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 1.6 + Math.pow(rnd(), 0.7) * 7
      const a = rnd() * Math.PI * 2
      pos[i * 3] = Math.cos(a) * r
      pos[i * 3 + 1] = (rnd() - 0.5) * 7
      pos[i * 3 + 2] = Math.sin(a) * r * 0.8 - 1
      seed[i * 3] = rnd()
      seed[i * 3 + 1] = rnd()
      seed[i * 3 + 2] = rnd()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30)
    return g
  }, [N])
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uBase: { value: 0 }, uTime: { value: 0 }, uKick: { value: 0 }, uSize: { value: 26 }, uPR: { value: 1 }, uA: { value: 0 }, uLight: { value: new THREE.Vector3(0, 0, -1) } },
      }),
    [],
  )
  const kick = useRef(0)
  useFrame((state, dt) => {
    const u = mat.uniforms
    u.uTime.value = film.reduced ? 0 : state.clock.elapsedTime
    u.uPR.value = state.gl.getPixelRatio()
    u.uA.value = S.dust + S.dustKick * 0.8
    u.uBase.value = 0.22 * S.dustKick
    // motion: scroll velocity → a physical shove, which decays
    const target = film.reduced ? 0 : Math.max(-1.2, Math.min(1.2, film.vel * 0.9)) * S.dustKick
    kick.current += (target - kick.current) * (1 - Math.exp(-dt * 6))
    u.uKick.value = kick.current
    u.uLight.value.copy(ENV.uBoxDir.value[0])
    ref.current.visible = u.uA.value > 0.002
  })
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
}
