import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { READOUTS, readoutPos } from '../../gl/Body'
import { film } from '../../film/store'

// One reading hanging in space; farther readings are dimmer and softer (depth of field).
function Readout({ i }) {
  const el = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  const r = READOUTS[i]
  useFrameDom((S, t, ctx) => {
    const e = el.current
    const B = S.body
    const k = readoutPos(i, v, film.time)
    const o = Math.min(1, k * 2) * B.a * (1 - B.out)
    if (o < 0.003 || B.data <= 0) {
      if (e.style.visibility !== 'hidden') e.style.visibility = 'hidden'
      return
    }
    const [x, y, ok] = ctx.project(v)
    const depth = v.distanceTo(ctx.camera.position)
    const ref = S.ring.pos.distanceTo(ctx.camera.position)
    const dz = depth - ref // + = farther
    const blur = Math.max(0, Math.abs(dz) - 0.3) * 1.3
    e.style.visibility = ok ? 'visible' : 'hidden'
    e.style.opacity = (o * (dz > 0 ? 1 - Math.min(0.55, dz * 0.35) : 1)).toFixed(3)
    e.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none'
    e.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(1 - dz * 0.06).toFixed(3)})`
  })
  return (
    <div ref={el} className="readout">
      <div className="readout-k">{r.k}</div>
      <div className="readout-v">
        {r.v}
        {r.u && <span className="readout-u">{r.u}</span>}
      </div>
    </div>
  )
}

// 03 · The body is always speaking — Vexo listens.
export function BodyScene() {
  return (
    <>
      <Beat at={[8.55, 9.0, 9.65, 9.95]} className="full a-top">
        <h2 className="headline center">
          <Ln>Your body is</Ln>
          <Ln i={1}>always speaking.</Ln>
        </h2>
      </Beat>
      <Beat at={[9.85, 10.2, 10.95, 11.25]} className="full a-top">
        <h2 className="headline center">
          <Ln>
            <em>Vexo</em> listens.
          </Ln>
        </h2>
      </Beat>
      {READOUTS.map((_, i) => (
        <Readout key={i} i={i} />
      ))}
    </>
  )
}
