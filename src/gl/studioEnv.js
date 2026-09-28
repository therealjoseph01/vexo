import * as THREE from 'three'

/*
  The studio the band is photographed in, baked once into a PMREM environment:
  a dark room with long strip softboxes (for the titanium edges) and one broad key
  (so the weave reads as fabric, not plastic). Moving light comes from real lights
  in the scene; this only provides reflections and soft fill.
*/
export function buildStudioEnv(gl) {
  const scene = new THREE.Scene()
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vP; void main(){ float y = vP.y; vec3 c = mix(vec3(0.004), vec3(0.03, 0.031, 0.034), smoothstep(-0.3, 0.9, y)); c += vec3(0.01) * smoothstep(-0.2, -0.9, y); gl_FragColor = vec4(c, 1.0); }`,
    }),
  )
  scene.add(room)
  const box = (w, h, color, intensity, pos, look = [0, 0, 0]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }))
    m.position.set(...pos)
    m.lookAt(...look)
    scene.add(m)
  }
  box(14, 8, '#fff3e6', 2.2, [-12, 10, 12]) // broad warm key, high left
  box(2.2, 26, '#ffffff', 5.0, [18, 3, -8]) // tall strip, back right (rim on titanium)
  box(2.0, 24, '#e8eef7', 3.2, [-20, 2, -10]) // tall strip, back left
  box(26, 3, '#dfe7f1', 1.6, [0, -9, 16]) // low front fill strip
  box(18, 18, '#f2f4f7', 1.1, [0, 22, 0]) // overhead
  box(6, 6, '#ffffff', 2.0, [10, 6, 18]) // small front-right kicker
  const pmrem = new THREE.PMREMGenerator(gl)
  const rt = pmrem.fromScene(scene, 0.035)
  pmrem.dispose()
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) o.material.dispose()
  })
  return rt.texture
}
