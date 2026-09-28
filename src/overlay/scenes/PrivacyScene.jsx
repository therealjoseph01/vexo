import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { privacyLayout } from '../../gl/Privacy'
import { clamp, smooth } from '../../film/timeline'

// Wording checked against vexoai.com/privacy (updated Aug 16 2026) and /terms §09.
const PERMS = [
  { k: 'Latest vitals', v: 'Allowed', state: 'on' },
  { k: 'Read captures', v: 'Not granted', state: 'off' },
  { k: 'External AI (MCP)', v: 'Off by default', state: 'off' },
  { k: 'Voice audio', v: 'Stays on your phone', state: 'local' },
  { k: 'Location', v: 'Not collected', state: 'none' },
]

function Permissions() {
  const rows = useRef([])
  const root = useRef()
  useFrameDom((S) => {
    const P = S.priv
    const vis = P.a > 0.001 && P.perms > 0
    root.current.style.visibility = vis ? 'visible' : 'hidden'
    if (!vis) return
    root.current.style.opacity = (P.a * (1 - P.out)).toFixed(3)
    rows.current.forEach((r, i) => {
      const k = smooth(clamp((P.perms - i * 0.14) / 0.3))
      r.style.setProperty('--k', k.toFixed(3))
      r.dataset.set = k > 0.8 ? '1' : '0'
    })
  })
  return (
    <div className="perms" ref={root} aria-label="Permissions">
      <div className="eyebrow">What leaves your phone</div>
      <ul>
        {PERMS.map((p, i) => (
          <li key={p.k} ref={(n) => (rows.current[i] = n)} data-state={p.state}>
            <span className="perm-k">{p.k}</span>
            <span className="perm-v mono">{p.v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// small captions pinned to the ring, the phone and the cloud line
function Pins() {
  const a = useRef()
  const b = useRef()
  const c = useRef()
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrameDom((S, t, ctx) => {
    const P = S.priv
    const vis = P.a > 0.001 && P.boundary > 0.3
    for (const r of [a, b, c]) r.current.style.visibility = vis ? 'visible' : 'hidden'
    if (!vis) return
    const L = privacyLayout()
    const o = (P.a * (1 - P.out)).toFixed(3)
    const m = ctx.vw < 760
    // under the ring
    v.copy(S.ring.pos)
    v.y -= 1.55 * S.ring.scale
    let [x, y] = ctx.project(v)
    a.current.style.opacity = (smooth(clamp((P.boundary - 0.3) / 0.3)) * o).toFixed(3)
    a.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`
    // beside the phone
    v.copy(L.phone)
    if (m) v.x += 0.75 * L.phoneS
    else v.y -= 1.35 * L.phoneS
    ;[x, y] = ctx.project(v)
    b.current.style.opacity = (smooth(clamp((P.voice - 0.75) / 0.25)) * o).toFixed(3)
    b.current.style.transform = m ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(0, -50%)` : `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, 0)`
    // on the dashed line out
    v.copy(L.phone)
    if (m) v.y -= 1.6 * L.phoneS
    else v.x += 1.55
    ;[x, y] = ctx.project(v)
    c.current.style.opacity = (smooth(clamp((P.perms - 0.35) / 0.3)) * o).toFixed(3)
    c.current.style.transform = m ? `translate3d(${(x + 14).toFixed(1)}px, ${y.toFixed(1)}px, 0)` : `translate3d(${x.toFixed(1)}px, ${(y - 42).toFixed(1)}px, 0)`
  })
  return (
    <>
      <div className="pin mono" ref={a}>
        Your ring
      </div>
      <div className="pin" ref={b}>
        <span className="mono">Your iPhone</span>
        <span className="pin-d">Speech becomes text here. The audio never leaves.</span>
      </div>
      <div className="pin pin-cloud" ref={c}>
        <span className="mono">Only if you sync</span>
        <span className="pin-d">Text and numbers, encrypted in transit, readable only by your account.</span>
      </div>
    </>
  )
}

// 08 · Yours alone.
export function PrivacyScene() {
  return (
    <>
      <Beat at={[28.15, 28.6, 30.35, 30.75]} className="full a-top-left priv-head">
        <div className="block">
          <h2 className="headline">
            <Ln>Your data</Ln>
            <Ln i={1}>belongs to you.</Ln>
          </h2>
          <p className="lede">Every insight is computed on your phone. No feeds, no ads, nothing sold.</p>
        </div>
      </Beat>
      <Pins />
      <Permissions />
    </>
  )
}
