import * as THREE from 'three'

// The VΞXO wordmark (from vexo-wordmark-rounded.svg, viewBox 272×88, stroke 9, round caps).
export const WORDMARK = {
  w: 272,
  h: 88,
  glyphs: [
    { x0: 10, x1: 58, d: 'M10 14 L29 65 Q34 79 39 65 L58 14' },
    { x0: 78, x1: 126, d: 'M78 14 H126 M78 43 H126 M78 72 H126' },
    { x0: 146, x1: 194, d: 'M146 14 L194 72 M194 14 L146 72' },
    { x0: 214, x1: 260, d: 'M260 43 A23 29 0 1 1 214 43 A23 29 0 1 1 260 43' },
  ],
}

function canvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

// Draw the wordmark with extra tracking (in wordmark units) into a 2D context.
export function drawWordmark(g, x, y, scale, tracking = 0, width = 9) {
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = width
  WORDMARK.glyphs.forEach((gl, i) => {
    g.save()
    g.translate(x + i * tracking * scale, y)
    g.scale(scale, scale)
    g.stroke(new Path2D(gl.d))
    g.restore()
  })
  g.restore()
}

// VΞXO engraved on the inner face (alpha = engraving)
export function engravingTexture() {
  const [c, g] = canvas(1024, 160)
  g.clearRect(0, 0, 1024, 160)
  g.strokeStyle = '#fff'
  const s = 1.25
  const tracking = 62
  const total = (272 + tracking * 3) * s
  drawWordmark(g, (1024 - total) / 2, (160 - 88 * s) / 2, s, tracking, 7)
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  t.colorSpace = THREE.NoColorSpace
  return t
}

// Microphone grille: a fine hex grid of holes
export function grilleTexture() {
  const S = 256
  const [c, g] = canvas(S, S)
  g.clearRect(0, 0, S, S)
  g.fillStyle = '#fff'
  const step = 15
  for (let row = -1; row < S / (step * 0.866) + 1; row++) {
    for (let col = -1; col < S / step + 1; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0)
      const y = row * step * 0.866
      const d = Math.hypot(x - S / 2, y - S / 2)
      if (d > S * 0.47) continue
      g.beginPath()
      g.arc(x, y, 4.2, 0, Math.PI * 2)
      g.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 4
  return t
}

// Printed wordmark for the dock's top face
export function dockPrintTexture() {
  const [c, g] = canvas(1024, 256)
  g.clearRect(0, 0, 1024, 256)
  g.strokeStyle = '#fff'
  const s = 1.6
  const tracking = 70
  const total = (272 + tracking * 3) * s
  drawWordmark(g, (1024 - total) / 2, (256 - 88 * s) / 2, s, tracking, 6.5)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.anisotropy = 8
  return t
}

export function glowTexture() {
  const S = 128
  const [c, g] = canvas(S, S)
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.2, 'rgba(255,255,255,0.5)')
  grd.addColorStop(0.55, 'rgba(255,255,255,0.08)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
