import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { appPos } from '../../gl/Ecosystem'
import { APPS } from '../../config'

// An app's name, hanging under its drawing. Depth dims and softens it.
function AppLabel({ i }) {
  const el = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  const app = APPS[i]
  useFrameDom((S, t, ctx) => {
    const e = el.current
    const k = appPos(i, v)
    if (k < 0.01) {
      if (e.style.visibility !== 'hidden') e.style.visibility = 'hidden'
      return
    }
    const [x, y, ok] = ctx.project(v)
    const depth = v.distanceTo(ctx.camera.position)
    const ref = ctx.camera.position.distanceTo(S.ring.pos)
    const dz = depth - ref
    const near = Math.max(0, -dz)
    const blur = Math.max(0, Math.abs(dz) - 1.2) * 0.9
    const scale = Math.max(0.7, Math.min(1.35, 1 - dz * 0.05))
    e.style.visibility = ok ? 'visible' : 'hidden'
    e.style.opacity = (k * Math.max(0.25, 1 - Math.max(0, dz) * 0.12) * (near > 5 ? 0 : 1)).toFixed(3)
    e.style.filter = blur > 0.3 ? `blur(${Math.min(4, blur).toFixed(1)}px)` : 'none'
    const drop = (ctx.vw < 760 ? 34 : 48) * scale
    e.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + drop).toFixed(1)}px, 0) translate(-50%, 0) scale(${scale.toFixed(3)})`
  })
  return (
    <div ref={el} className="app-label">
      <div className="app-name">{app.name}</div>
      <div className="app-kind">{app.kind}</div>
    </div>
  )
}

// 05 · Every app, one ring.
export function AppsScene() {
  return (
    <>
      {APPS.map((_, i) => (
        <AppLabel key={i} i={i} />
      ))}
      <Beat at={[15.55, 15.95, 17.55, 17.9]} className="full a-top">
        <div className="block center">
          <h2 className="headline">
            <Ln>Every app,</Ln>
            <Ln i={1}>one ring.</Ln>
          </h2>
          <p className="lede center">Sport, sleep, food, focus and care. Every one of them reads the same signals off the same finger.</p>
        </div>
      </Beat>
      <Beat at={[18.05, 18.4, 19.05, 19.35]} className="full a-bottom">
        <div className="block center">
          <p className="count">
            <span className="count-n">100+</span>
            <span className="count-t">more in the marketplace</span>
          </p>
          <p className="eyebrow">Find them in the Vexo app</p>
        </div>
      </Beat>
    </>
  )
}
