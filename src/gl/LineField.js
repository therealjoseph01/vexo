import * as THREE from 'three'

/*
  LineField — the film's single visual language: a luminous hairline.
  One draw call renders every line in a field. Lines are screen-space ribbons (constant pixel
  width, anti-aliased, optional glow) whose points are either:
    STATIC  — read from a float texture (contours, glyphs), transformed per line
    ORBIT   — a circle evaluated in the shader, carrying a biometric waveform
    BEZIER  — a cubic curve between four points (threads, arcs, data paths)
    WAVE    — a travelling transverse waveform along a line (voice)
  Per-line parameters live in a tiny float texture updated each frame; geometry never changes.
*/

export const KIND = { STATIC: 0, ORBIT: 1, BEZIER: 2, WAVE: 3 }
export const WAVE = { NONE: 0, PPG: 1, TICKS: 2, SINE: 3, HYPNO: 4, THERMAL: 5, NOISE: 6, SPO2: 7 }
const PW = 12

const vert = /* glsl */ `
  precision highp float;
  precision highp sampler2D;
  uniform sampler2D uPos;
  uniform sampler2D uPar;
  uniform vec2 uRes;
  uniform float uPR;
  uniform float uTime;
  attribute float aLine;
  attribute float aI;
  attribute float aSide;
  varying float vU;
  varying float vW;
  varying float vSide;
  varying float vHalf;
  varying float vCore;
  varying float vGlowW;
  varying vec4 vColor;
  varying vec4 vWin;   // head, tail, feather, glowAmt
  varying vec4 vPulse; // c, w, gain, mode
  varying vec3 vRep;   // pulse freq, dash freq, depth fade
  varying float vFace; // local z (static shapes): back of a contour fades

  int L;
  vec4 par(int k) { return texelFetch(uPar, ivec2(k, L), 0); }

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float sq(float x) { return x * x; } // pow(x, 2.0) is undefined for x < 0 on some GPUs

  float waveform(float type, float x, float extra) {
    if (type < 0.5) return 0.0;
    if (type < 1.5) { // PPG — systolic upstroke, dicrotic notch
      float p = fract(x);
      return exp(-sq((p - 0.14) / 0.05)) + 0.32 * exp(-sq((p - 0.36) / 0.075)) - 0.12;
    }
    if (type < 2.5) { // TICKS — R-peaks with beat-to-beat variability
      float k = floor(x);
      float p = fract(x);
      float j = (hash(k) - 0.5) * 0.36;
      return exp(-sq((p - 0.5 - j) / 0.022)) - 0.06;
    }
    if (type < 3.5) return sin(6.28318 * x); // SINE — breath
    if (type < 4.5) { // HYPNO — sleep stages, stepped
      float k = floor(x);
      float p = fract(x);
      float a = floor(hash(k) * 4.0) / 3.0;
      float b = floor(hash(k + 1.0) * 4.0) / 3.0;
      return mix(a, b, smoothstep(0.86, 0.98, p)) * 2.0 - 1.0;
    }
    if (type < 5.5) { // THERMAL — slow drift
      return 0.6 * sin(6.28318 * x) + 0.3 * sin(6.28318 * x * 2.3 + 1.7) + 0.1 * sin(6.28318 * x * 5.1);
    }
    if (type < 6.5) { // NOISE — motion
      return (sin(x * 41.0) * 0.5 + sin(x * 97.0 + 2.0) * 0.3 + sin(x * 173.0 + 5.0) * 0.2) * extra;
    }
    // SPO2 — near-flat, gently breathing band
    return 0.35 * sin(6.28318 * x) + 0.08 * sin(6.28318 * x * 7.0);
  }

  vec3 local(float kind, float i, float count, float closed, out float w) {
    w = 0.0;
    float u = count > 1.0 ? i / (count - 1.0) : 0.0;
    if (kind < 0.5) {
      float ii = clamp(i, 0.0, count - 1.0);
      vec4 p = texelFetch(uPos, ivec2(int(ii + 0.5), L), 0);
      w = p.w;
      return p.xyz;
    }
    if (kind < 1.5) {
      vec4 A = par(7); // R, span, start, amp
      vec4 B = par(8); // waveType, freq, phase, zAmp
      float th = A.z + u * A.y * 6.28318;
      // the waveform is fixed to the circle's angle (integer freq → seamless), and flows with phase
      float f = waveform(B.x, th / 6.28318 * B.y + B.z, B.w);
      float r = A.x + A.w * f;
      w = f;
      return vec3(cos(th) * r, sin(th) * r, A.w * f * 0.0);
    }
    if (kind < 2.5) {
      vec3 p0 = par(7).xyz;
      vec3 p1 = par(8).xyz;
      vec3 p2 = par(10).xyz;
      vec3 p3 = par(11).xyz;
      float t = clamp(u, 0.0, 1.0);
      float mt = 1.0 - t;
      w = t;
      return mt * mt * mt * p0 + 3.0 * mt * mt * t * p1 + 3.0 * mt * t * t * p2 + t * t * t * p3;
    }
    // WAVE — along local x in [-len, len]
    vec4 A = par(7); // halfLen, amp, freq, phase
    vec4 B = par(8); // envC, envW, freq2, speech
    float x = mix(-A.x, A.x, u);
    float e = exp(-sq((u - B.x) / max(B.y, 0.001)));
    float syl = mix(1.0, 0.35 + 0.65 * pow(abs(sin(u * 19.0 - A.w * 0.9)), 1.5), B.w);
    float y = A.y * e * syl * (0.62 * sin(6.28318 * A.z * u - A.w) + 0.38 * sin(6.28318 * B.z * u - A.w * 1.63));
    w = e;
    return vec3(x, y, 0.0);
  }

  vec3 world(float kind, float i, float count, float closed, out float w) {
    vec3 p = local(kind, i, count, closed, w);
    vec4 r0 = par(4);
    vec4 r1 = par(5);
    vec4 r2 = par(6);
    return vec3(dot(r0.xyz, p) + r0.w, dot(r1.xyz, p) + r1.w, dot(r2.xyz, p) + r2.w);
  }

  void main() {
    L = int(aLine + 0.5);
    vec4 c0 = par(0);
    vec4 c1 = par(1);
    float count = c1.y;
    if (c0.a <= 0.0005 || aI >= count) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 c2 = par(2);
    vec4 c3 = par(3);
    vec4 c9 = par(9);
    float kind = c1.w;
    float closed = c1.z;
    float i = aI;
    float w, w0, w1;
    vec3 p = world(kind, i, count, closed, w);
    float ip;
    float inx;
    if (kind < 0.5 && closed > 0.5) {
      // closed static loops store a duplicate of point 0 at the end
      ip = i < 0.5 ? count - 2.0 : i - 1.0;
      inx = i > count - 1.5 ? 1.0 : i + 1.0;
    } else if (closed > 0.5) {
      ip = i - 1.0;
      inx = i + 1.0;
    } else {
      ip = max(i - 1.0, 0.0);
      inx = min(i + 1.0, count - 1.0);
    }
    vec3 pp = world(kind, ip, count, closed, w0);
    vec3 pn = world(kind, inx, count, closed, w1);

    mat4 vp = projectionMatrix * viewMatrix;
    vec4 cc = vp * vec4(p, 1.0);
    vec4 cp = vp * vec4(pp, 1.0);
    vec4 cn = vp * vec4(pn, 1.0);
    if (cc.w < 0.02) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    cp.w = max(cp.w, 0.02);
    cn.w = max(cn.w, 0.02);
    vec2 half_ = uRes * 0.5;
    vec2 sc = cc.xy / cc.w * half_;
    vec2 sp = cp.xy / cp.w * half_;
    vec2 sn = cn.xy / cn.w * half_;
    vec2 dir = sn - sp;
    if (dot(dir, dir) < 1e-8) dir = vec2(1.0, 0.0);
    dir = normalize(dir);
    vec2 nrm = vec2(-dir.y, dir.x);

    float core = c1.x * uPR;
    float glowW = c2.w * uPR;
    float halfW = core * 0.5 + glowW * 1.6 + 1.0;
    sc += nrm * aSide * halfW;
    gl_Position = vec4(sc / half_ * cc.w, cc.z, cc.w);

    vU = count > 1.0 ? i / (count - 1.0) : 0.0;
    vW = w;
    vSide = aSide;
    vHalf = halfW;
    vCore = core;
    vGlowW = glowW;
    vColor = c0;
    vWin = vec4(c2.x, c2.y, c2.z, c9.x);
    vPulse = c3;
    vRep = vec3(c9.y, c9.z, c9.w);
    vFace = 0.0;
    if (c9.w > 0.0) { float wt; vFace = local(kind, i, count, closed, wt).z; }
  }
`

const frag = /* glsl */ `
  precision highp float;
  varying float vU;
  varying float vW;
  varying float vSide;
  varying float vHalf;
  varying float vCore;
  varying float vGlowW;
  varying vec4 vColor;
  varying vec4 vWin;
  varying vec4 vPulse;
  varying vec3 vRep;
  varying float vFace;
  void main() {
    float d = abs(vSide) * vHalf;
    float core = clamp(vCore * 0.5 + 0.5 - d, 0.0, 1.0);
    float glow = vGlowW > 0.0 ? exp(-(d * d) / (vGlowW * vGlowW)) * vWin.w : 0.0;
    float a = core + glow;
    // draw window [tail, head]
    float f = max(vWin.z, 0.0001);
    a *= smoothstep(vWin.y - f, vWin.y, vU) * (1.0 - smoothstep(vWin.x, vWin.x + f, vU));
    // pulses
    float x = vPulse.w > 0.5 && (vPulse.w < 1.5 || vPulse.w > 2.5) ? vW : vU;
    float px = vPulse.w > 1.5 ? fract(x * max(vRep.x, 1.0) - vPulse.x) : x - vPulse.x;
    if (vPulse.w > 1.5) px = min(px, 1.0 - px);
    float pl = vPulse.z * exp(-(px * px) / (vPulse.y * vPulse.y + 1e-6));
    a *= 1.0 + pl;
    vec3 col = vColor.rgb * (1.0 + pl * 0.6);
    if (vRep.y > 0.5) a *= smoothstep(0.3, 0.55, abs(fract(vU * vRep.y) - 0.5) * 2.0);
    if (vRep.z > 0.0) a *= mix(1.0, 0.18 + 0.82 * smoothstep(-0.14, 0.16, vFace), vRep.z);
    a *= vColor.a;
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`

export class LineField {
  constructor({ lines = 64, points = 256, depthTest = true, renderOrder = 10, blending = THREE.AdditiveBlending } = {}) {
    this.L = lines
    this.P = points
    this.posData = new Float32Array(points * lines * 4)
    this.posTex = new THREE.DataTexture(this.posData, points, lines, THREE.RGBAFormat, THREE.FloatType)
    this.posTex.minFilter = this.posTex.magFilter = THREE.NearestFilter
    this.posTex.needsUpdate = true
    this.parData = new Float32Array(PW * lines * 4)
    this.parTex = new THREE.DataTexture(this.parData, PW, lines, THREE.RGBAFormat, THREE.FloatType)
    this.parTex.minFilter = this.parTex.magFilter = THREE.NearestFilter
    this.next = 0
    this.dirtyPos = false

    const nV = lines * points * 2
    const aLine = new Float32Array(nV)
    const aI = new Float32Array(nV)
    const aSide = new Float32Array(nV)
    let k = 0
    for (let l = 0; l < lines; l++)
      for (let i = 0; i < points; i++)
        for (let s = 0; s < 2; s++) {
          aLine[k] = l
          aI[k] = i
          aSide[k] = s ? 1 : -1
          k++
        }
    const idx = new (nV > 65535 ? Uint32Array : Uint16Array)(lines * (points - 1) * 6)
    let j = 0
    for (let l = 0; l < lines; l++)
      for (let i = 0; i < points - 1; i++) {
        const a = (l * points + i) * 2
        idx[j++] = a
        idx[j++] = a + 1
        idx[j++] = a + 2
        idx[j++] = a + 1
        idx[j++] = a + 3
        idx[j++] = a + 2
      }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nV * 3), 3))
    g.setAttribute('aLine', new THREE.BufferAttribute(aLine, 1))
    g.setAttribute('aI', new THREE.BufferAttribute(aI, 1))
    g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1))
    g.setIndex(new THREE.BufferAttribute(idx, 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4)

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest,
      blending,
      side: THREE.DoubleSide, // ribbons are built in screen space; winding depends on direction of travel
      toneMapped: false,
      uniforms: {
        uPos: { value: this.posTex },
        uPar: { value: this.parTex },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPR: { value: 1 },
        uTime: { value: 0 },
      },
    })
    this.mesh = new THREE.Mesh(g, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = renderOrder
    // identity transforms & sane defaults
    for (let l = 0; l < lines; l++) {
      this.matrix(l, null)
      this.style(l, { alpha: 0 })
      this.window(l, 1.01, -0.01, 0.001)
    }
  }

  alloc(n = 1) {
    const id = this.next
    this.next += n
    if (this.next > this.L) throw new Error('LineField: out of lines')
    return id
  }

  _t(l, k) {
    return (l * PW + k) * 4
  }

  style(l, { color, alpha, width, glow, glowAmt } = {}) {
    const d = this.parData
    let o = this._t(l, 0)
    if (color) {
      d[o] = color.r
      d[o + 1] = color.g
      d[o + 2] = color.b
    }
    if (alpha !== undefined) d[o + 3] = alpha
    o = this._t(l, 1)
    if (width !== undefined) d[o] = width
    o = this._t(l, 2)
    if (glow !== undefined) d[o + 3] = glow
    o = this._t(l, 9)
    if (glowAmt !== undefined) d[o] = glowAmt
    return this
  }

  alpha(l, a) {
    this.parData[this._t(l, 0) + 3] = a
    return this
  }

  shape(l, kind, count, closed = false) {
    const o = this._t(l, 1)
    this.parData[o + 1] = Math.min(count, this.P)
    this.parData[o + 2] = closed ? 1 : 0
    this.parData[o + 3] = kind
    return this
  }

  window(l, head, tail = 0, feather = 0.02) {
    const o = this._t(l, 2)
    this.parData[o] = head
    this.parData[o + 1] = tail
    this.parData[o + 2] = feather
    return this
  }

  pulse(l, c, wdt = 0.05, gain = 0, mode = 0, freq = 1) {
    const o = this._t(l, 3)
    this.parData[o] = c
    this.parData[o + 1] = wdt
    this.parData[o + 2] = gain
    this.parData[o + 3] = mode
    this.parData[this._t(l, 9) + 1] = freq
    return this
  }

  dash(l, freq) {
    this.parData[this._t(l, 9) + 2] = freq
    return this
  }

  // static shapes: fade the far side of each loop (0..1), so contours read as volume
  depthFade(l, k) {
    this.parData[this._t(l, 9) + 3] = k
    return this
  }

  // m: THREE.Matrix4 or null (identity)
  matrix(l, m) {
    const d = this.parData
    const e = m ? m.elements : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    let o = this._t(l, 4)
    d[o] = e[0]
    d[o + 1] = e[4]
    d[o + 2] = e[8]
    d[o + 3] = e[12]
    o = this._t(l, 5)
    d[o] = e[1]
    d[o + 1] = e[5]
    d[o + 2] = e[9]
    d[o + 3] = e[13]
    o = this._t(l, 6)
    d[o] = e[2]
    d[o + 1] = e[6]
    d[o + 2] = e[10]
    d[o + 3] = e[14]
    return this
  }

  A(l, a = 0, b = 0, c = 0, e = 0) {
    const o = this._t(l, 7)
    const d = this.parData
    d[o] = a
    d[o + 1] = b
    d[o + 2] = c
    d[o + 3] = e
    return this
  }

  B(l, a = 0, b = 0, c = 0, e = 0) {
    const o = this._t(l, 8)
    const d = this.parData
    d[o] = a
    d[o + 1] = b
    d[o + 2] = c
    d[o + 3] = e
    return this
  }

  bezier(l, p0, p1, p2, p3) {
    const d = this.parData
    const put = (k, v) => {
      const o = this._t(l, k)
      d[o] = v.x
      d[o + 1] = v.y
      d[o + 2] = v.z
    }
    put(7, p0)
    put(8, p1)
    put(10, p2)
    put(11, p3)
    return this
  }

  // pts: array of [x, y, z, w?] or flat Float32Array (stride 4). Closed loops get point 0 repeated at the end.
  points(l, pts, closed = false) {
    const d = this.posData
    const base = l * this.P * 4
    let n
    if (closed && !(pts instanceof Float32Array)) pts = [...pts.slice(0, this.P - 1), pts[0]]
    if (pts instanceof Float32Array) {
      n = Math.min(this.P, pts.length / 4)
      d.set(pts.subarray(0, n * 4), base)
    } else {
      n = Math.min(this.P, pts.length)
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        d[base + i * 4] = p[0]
        d[base + i * 4 + 1] = p[1]
        d[base + i * 4 + 2] = p[2]
        d[base + i * 4 + 3] = p[3] || 0
      }
    }
    this.shape(l, KIND.STATIC, n, closed)
    this.dirtyPos = true
    return this
  }

  flush(gl, size) {
    const u = this.material.uniforms
    if (gl) {
      u.uPR.value = gl.getPixelRatio()
      u.uRes.value.set(size.width * u.uPR.value, size.height * u.uPR.value)
    }
    this.parTex.needsUpdate = true
    if (this.dirtyPos) {
      this.posTex.needsUpdate = true
      this.dirtyPos = false
    }
  }

  hideAll(from = 0, to = this.L) {
    for (let l = from; l < to; l++) this.parData[this._t(l, 0) + 3] = 0
  }
}

// Resample a polyline (array of [x,y,z]) to n points, evenly by arclength.
export function resample(pts, n, closed = false) {
  const src = closed ? [...pts, pts[0]] : pts
  const acc = [0]
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1]
    const b = src[i]
    acc.push(acc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]))
  }
  const total = acc[acc.length - 1] || 1
  const out = []
  let j = 1
  const m = closed ? n : n - 1
  for (let i = 0; i < n; i++) {
    const s = (i / m) * total
    while (j < acc.length - 1 && acc[j] < s) j++
    const t = (s - acc[j - 1]) / (acc[j] - acc[j - 1] || 1)
    const a = src[j - 1]
    const b = src[j]
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] !== undefined ? a[3] + ((b[3] ?? a[3]) - a[3]) * t : 0])
  }
  return out
}
