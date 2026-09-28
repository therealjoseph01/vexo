import { useRef } from 'react'
import * as THREE from 'three'
import { useFrameDom } from './primitives'

const rgb = { r: 0, g: 0, b: 0 }
const toRGB = (c) => {
  c.getRGB(rgb, THREE.SRGBColorSpace)
  return `${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)}`
}

// The room behind the ring: a gradient, a soft pool of light, and a whisper of film grain.
export function Backdrop() {
  const sky = useRef()
  const glow = useRef()
  const cache = useRef({})
  useFrameDom((S) => {
    const c = cache.current
    const b = S.bg
    const s = `linear-gradient(180deg, rgb(${toRGB(b.top)}) 0%, rgb(${toRGB(b.bot)}) 100%)`
    if (c.sky !== s) {
      c.sky = s
      sky.current.style.background = s
    }
    const g = `radial-gradient(ellipse ${(b.glowR * 120).toFixed(1)}% ${(b.glowR * 100).toFixed(1)}% at ${(b.glowX * 100).toFixed(1)}% ${(b.glowY * 100).toFixed(1)}%, rgba(${toRGB(b.glow)}, ${b.glowA.toFixed(3)}) 0%, rgba(${toRGB(b.glow)}, 0) 70%)`
    if (c.glow !== g) {
      c.glow = g
      glow.current.style.background = g
    }
  })
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="sky" ref={sky} />
      <div className="glow" ref={glow} />
      <div className="grain" />
    </div>
  )
}
