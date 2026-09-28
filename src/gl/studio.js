import * as THREE from 'three'

/*
  THE STUDIO
  ----------
  Polished titanium is almost entirely reflection, so the lighting *is* the environment.
  Instead of rendering a cube map every frame, the environment is analytic: a dark gradient
  "room" plus up to six rounded-rect softboxes, evaluated per pixel along the reflection
  vector. Every light can move every frame at no cost — which is what lets a single strip
  of light travel around the ring's circumference in Scene 01.
*/

export const NB = 6

export const ENV = {
  uEnvTop: { value: new THREE.Color(0, 0, 0) },
  uEnvBot: { value: new THREE.Color(0, 0, 0) },
  uEnvFloor: { value: new THREE.Color(0, 0, 0) },
  uBoxDir: { value: Array.from({ length: NB }, () => new THREE.Vector3(0, 0, 1)) },
  uBoxUp: { value: Array.from({ length: NB }, () => new THREE.Vector3(0, 1, 0)) },
  uBoxSize: { value: Array.from({ length: NB }, () => new THREE.Vector2(0.1, 0.1)) },
  uBoxCol: { value: Array.from({ length: NB }, () => new THREE.Color(0, 0, 0)) },
  uBoxSoft: { value: new Array(NB).fill(0.05) },
  uTime: { value: 0 },
  uBeat: { value: 0 }, // heartbeat pulse 0..1
  uThermal: { value: 0 }, // skin-temperature visual 0..1
  uHaptic: { value: 0 }, // haptic response glow 0..1
  uHapticP: { value: 0 }, // haptic band travel 0..1
  uRipA: { value: new THREE.Vector4(0, 0, 99, 0) }, // (theta, y, age, amp) on the band surface
  uRipB: { value: new THREE.Vector4(0, 0, 99, 0) },
  uRingR: { value: 1.27 },
  uSpill: { value: new THREE.Color(0, 0, 0) }, // LED light spilling onto the inner titanium
  uSpillPos: { value: new THREE.Vector3(0, 0.12, 0.98) }, // ring-local
}

const vert = /* glsl */ `
  #ifdef USE_PART
  attribute float aPart;
  #endif
  varying vec3 vWPos;
  varying vec3 vWNorm;
  varying vec3 vOPos;
  varying vec2 vUv;
  varying float vPart;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWPos = wp.xyz;
    vWNorm = normalize(mat3(modelMatrix) * normal);
    vOPos = position;
    vUv = uv;
    #ifdef USE_PART
    vPart = aPart;
    #else
    vPart = -1.0;
    #endif
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const frag = /* glsl */ `
  #define NB ${NB}
  uniform vec3 uEnvTop, uEnvBot, uEnvFloor;
  uniform vec3 uBoxDir[NB];
  uniform vec3 uBoxUp[NB];
  uniform vec2 uBoxSize[NB];
  uniform vec3 uBoxCol[NB];
  uniform float uBoxSoft[NB];
  uniform float uTime, uBeat, uThermal, uHaptic, uHapticP, uRingR;
  uniform vec4 uRipA, uRipB;
  uniform vec3 uSpill, uSpillPos;

  uniform vec3 uBase;
  uniform float uRough, uMetal, uOpacity, uInnerAO, uFx;
  uniform vec3 uEmissive;
  #ifdef USE_MAP
  uniform sampler2D uMap;
  uniform vec3 uMapColor;
  uniform float uMapRough;
  #endif

  varying vec3 vWPos;
  varying vec3 vWNorm;
  varying vec3 vOPos;
  varying vec2 vUv;
  varying float vPart;

  vec3 envAt(vec3 R, float rough) {
    float y = R.y;
    vec3 c = mix(uEnvBot, uEnvTop, smoothstep(-0.25, 0.95, y));
    c = mix(c, uEnvFloor, smoothstep(-0.05, -0.6, y));
    float spread = 1.0 / (1.0 + rough * rough * 7.0);
    for (int i = 0; i < NB; i++) {
      vec3 col = uBoxCol[i];
      if (col.r + col.g + col.b < 0.0005) continue;
      vec3 d = uBoxDir[i];
      float z = dot(R, d);
      if (z <= 0.02) continue;
      vec3 rt = normalize(cross(d, uBoxUp[i]));
      vec3 up = cross(rt, d);
      vec2 p = vec2(dot(R, rt), dot(R, up)) / z;
      vec2 q = abs(p) - uBoxSize[i];
      float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
      float s = uBoxSoft[i] + rough * rough * 1.4 + 0.004;
      float m = 1.0 - smoothstep(-s, s, sd);
      c += col * m * spread * smoothstep(0.02, 0.2, z);
    }
    return c;
  }

  vec3 heatRamp(float x) {
    vec3 a = vec3(0.16, 0.02, 0.05);
    vec3 b = vec3(0.85, 0.16, 0.06);
    vec3 c = vec3(1.0, 0.55, 0.16);
    vec3 d = vec3(1.0, 0.86, 0.55);
    return x < 0.4 ? mix(a, b, x / 0.4) : x < 0.75 ? mix(b, c, (x - 0.4) / 0.35) : mix(c, d, (x - 0.75) / 0.25);
  }

  float ripple(vec4 r, float th, float y) {
    if (r.w <= 0.0001) return 0.0;
    float dth = atan(sin(th - r.x), cos(th - r.x));
    float d = length(vec2(dth * uRingR, y - r.y));
    float front = r.z * 2.4;
    float q = (d - front) / (0.05 + r.z * 0.12);
    float band = exp(-q * q);
    return band * r.w * exp(-r.z * 2.2);
  }

  void main() {
    vec3 N = normalize(vWNorm);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWPos);
    vec3 R = reflect(-V, N);
    float NdV = clamp(dot(N, V), 0.0, 1.0);

    vec3 base = uBase;
    float rough = uRough;
    float alpha = uOpacity;
    #ifdef USE_MAP
    vec4 tx = texture2D(uMap, vUv);
    float ta = max(tx.a * tx.r, 0.0);
    base = mix(base, uMapColor, ta);
    rough = mix(rough, uMapRough, ta);
    #ifdef MAP_ALPHA
    alpha *= ta;
    if (alpha < 0.003) discard;
    #endif
    #endif

    vec3 F0 = mix(vec3(0.04), base, uMetal);
    float fr = pow(1.0 - NdV, 5.0);
    vec3 F = F0 + (max(vec3(1.0 - rough), F0) - F0) * fr;
    vec3 spec = envAt(R, rough) * F;
    // cheap diffuse irradiance for dielectrics
    vec3 diff = (1.0 - uMetal) * base * envAt(N, 1.0) * 0.55;
    vec3 col = spec + diff;

    // the inside of a ring mostly sees more ring: darken, and add a soft self-reflection
    if (vPart > 1.5) {
      col *= uInnerAO;
      col += base * uMetal * 0.012;
    }

    float th = atan(vOPos.x, vOPos.z);
    float rr = length(vOPos.xz);

    if (uFx > 0.5) {
      // skin temperature: warmth blooms through the titanium, strongest on the skin side
      if (uThermal > 0.001) {
        // warmth soaks outward from the skin side; the outside barely blushes
        float inner = vPart > 1.5 ? 1.0 : (vPart > 0.5 ? 0.45 : 0.14);
        float flow = 0.5 + 0.5 * sin(th * 2.0 - uTime * 0.7 + vOPos.y * 3.0);
        float h = clamp(0.2 + 0.5 * flow + 0.15 * uBeat, 0.0, 1.0);
        vec3 heat = heatRamp(h);
        float k = uThermal * inner;
        col = mix(col, col * 0.55 + heat * 0.42, k * 0.7);
      }
      // taps & haptics: a wave of light across the band
      float rp = ripple(uRipA, th, vOPos.y) + ripple(uRipB, th, vOPos.y);
      col += vec3(0.85, 0.92, 1.0) * rp * 0.9;
      if (uHaptic > 0.001) {
        // a thin band of light that runs once around the circumference, both ways from the tap
        float d = abs(atan(sin(th - 3.14159), cos(th - 3.14159)));
        float q = (d - uHapticP * 3.3) / 0.22;
        float band = exp(-q * q);
        col += vec3(0.82, 0.9, 1.0) * uHaptic * band * 0.55 * (vPart < 0.5 ? 1.0 : 0.6);
      }
      col *= 1.0 + uBeat * 0.08;
      if (uSpill.r + uSpill.g + uSpill.b > 0.001) {
        float dd = distance(vOPos, uSpillPos);
        float k = exp(-dd * dd / 0.09) * (vPart > 1.5 ? 1.0 : 0.25);
        col += uSpill * k;
      }
    }

    col += uEmissive;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function studioMaterial({ base = '#d9d9d6', rough = 0.1, metal = 1, emissive = '#000000', opacity = 1, innerAO = 0.55, fx = false, part = false, map = null, mapColor = '#222', mapRough = 0.5, mapAlpha = false, transparent = false, side = THREE.FrontSide, depthWrite = true, polygonOffset = 0 } = {}) {
  const defines = {}
  if (part) defines.USE_PART = ''
  if (map) defines.USE_MAP = ''
  if (mapAlpha) defines.MAP_ALPHA = ''
  const m = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    defines,
    transparent,
    side,
    depthWrite,
    uniforms: {
      ...ENV,
      uBase: { value: new THREE.Color(base) },
      uRough: { value: rough },
      uMetal: { value: metal },
      uOpacity: { value: opacity },
      uInnerAO: { value: innerAO },
      uFx: { value: fx ? 1 : 0 },
      uEmissive: { value: new THREE.Color(emissive) },
      ...(map ? { uMap: { value: map }, uMapColor: { value: new THREE.Color(mapColor) }, uMapRough: { value: mapRough } } : {}),
    },
  })
  if (polygonOffset) {
    m.polygonOffset = true
    m.polygonOffsetFactor = -polygonOffset
    m.polygonOffsetUnits = -polygonOffset
  }
  return m
}

// Finish looks for the titanium (base reflectance, roughness)
export const FINISH_LOOK = {
  silver: { base: new THREE.Color('#e3e2de'), rough: 0.07, ao: 0.5 },
  gold: { base: new THREE.Color('#f0c98f'), rough: 0.08, ao: 0.5 },
  graphite: { base: new THREE.Color('#5a5b60'), rough: 0.2, ao: 0.62 },
}
