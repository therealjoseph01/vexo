import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { NODES, nodePos, nodePresence } from '../../gl/Network'

function NodeLabel({ i }) {
  const el = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  const n = NODES[i]
  useFrameDom((S, t, ctx) => {
    const e = el.current
    const pr = nodePresence(i)
    if (pr < 0.01) {
      if (e.style.visibility !== 'hidden') e.style.visibility = 'hidden'
      return
    }
    nodePos(i, v)
    const [x, y, ok] = ctx.project(v)
    const m = ctx.vw < 760
    const left = !m && x < ctx.vw / 2
    e.classList.toggle('left', left)
    e.classList.toggle('under', m)
    e.style.visibility = ok ? 'visible' : 'hidden'
    e.style.opacity = pr.toFixed(3)
    if (m) {
      // keep the label on screen: centre it under the node, clamped to the gutters
      const half = Math.min(ctx.vw * 0.22, 95)
      const cx = Math.max(16 + half, Math.min(ctx.vw - 16 - half, x))
      e.style.transform = `translate3d(${cx.toFixed(1)}px, ${(y + 16).toFixed(1)}px, 0) translate(-50%, 0)`
    } else {
      const gap = 22
      e.style.transform = `translate3d(${(x + (left ? -gap : gap)).toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(${left ? '-100%' : '0'}, -50%)`
    }
  })
  return (
    <div ref={el} className="node-label">
      <div className="node-name">{n.name}</div>
      <div className="node-via mono">{n.via}</div>
      <div className="node-grant">
        <span className="mono">reads</span> {n.grant}
      </div>
    </div>
  )
}

// 07 · The body, as an API.
export function ApiScene() {
  return (
    <>
      {NODES.map((_, i) => (
        <NodeLabel key={i} i={i} />
      ))}
      <Beat at={[24.55, 25.0, 26.95, 27.3]} className="full a-top">
        <div className="block center">
          <h2 className="headline">
            <Ln>
              The body, <em>as an API.</em>
            </Ln>
          </h2>
          <p className="lede center">Every connection is scoped by you, and revocable at any time.</p>
        </div>
      </Beat>
      <Beat at={[25.2, 25.6, 26.95, 27.3]} className="full a-bottom">
        <ul className="protocols mono" aria-label="Platform">
          <li>MCP</li>
          <li>OAuth 2.1</li>
          <li>Scoped</li>
          <li>Revocable</li>
          <li>Deny by default</li>
        </ul>
      </Beat>
    </>
  )
}
