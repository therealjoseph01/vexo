import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { updaters } from '../film/store'
import { range, smooth, env } from '../film/timeline'
import { anchors } from '../gl/anchors'

// Register a per-frame DOM updater (runs inside the WebGL frame, after 3D transforms are applied).
export function useFrameDom(fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const f = (...a) => ref.current(...a)
    updaters.add(f)
    return () => updaters.delete(f)
  }, [])
}

/*
  <Beat at={[inStart, inEnd, outStart, outEnd]}> — typography that exists only inside its window.
  CSS reads --p (arrival 0→1) and --q (departure 0→1).
*/
export function Beat({ at, className = '', style, children, as: Tag = 'div', onFrame, live, ...rest }) {
  const el = useRef()
  const last = useRef([-1, -1])
  useFrameDom((S, t, ctx) => {
    const p = smooth(range(t, at[0], at[1]))
    const q = smooth(range(t, at[2], at[3]))
    const e = el.current
    if (!e) return
    if (onFrame) onFrame(e, p * (1 - q), S, t, ctx)
    const L = last.current
    if (Math.abs(p - L[0]) < 0.0005 && Math.abs(q - L[1]) < 0.0005) return
    L[0] = p
    L[1] = q
    e.style.setProperty('--p', p.toFixed(4))
    e.style.setProperty('--q', q.toFixed(4))
    const vis = p * (1 - q) > 0.002
    e.style.visibility = vis ? 'visible' : 'hidden'
    if (live !== undefined) e.setAttribute('aria-hidden', vis ? 'false' : 'true')
  })
  return (
    <Tag ref={el} className={`beat ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  )
}

// A masked line that slides up into place; `i` staggers it within its beat.
export const Ln = ({ i = 0, children, className = '' }) => (
  <span className={`ln ${className}`} style={{ '--i': i }}>
    <span>{children}</span>
  </span>
)

// Words that arrive one at a time as the beat's --p advances (for spoken lines).
export function Words({ text, className = '' }) {
  const words = text.split(' ')
  return (
    <span className={`words ${className}`} style={{ '--n': words.length }}>
      {words.map((wd, i) => (
        <span key={i} className="wd" style={{ '--i': i }}>
          {wd}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

export const fromAnchor = (name) => (out) => {
  const o = anchors[name]
  if (!o) return false
  o.getWorldPosition(out)
}

// a named point on the band (world, follows the exploded view)
export const fromBand = (name) => (out, S) => {
  const p = S.pts[name]
  if (!p) return false
  out.copy(p)
}

/*
  <Pin> — any DOM element held to a point in 3D. anchor(out, S) writes the point; at(t, S) → 0..1
  visibility (also exposed to CSS as --o); dx/dy = [desktop, mobile] pixel offsets;
  align = 'left' | 'right' | 'center' (or [desktop, mobile]) says which edge of the element sits on the point.
*/
export function Pin({ anchor, at, dx = [0, 0], dy = [0, 0], align = 'left', className = '', children, onFrame, lift = 8 }) {
  const el = useRef()
  const vec = useMemo(() => new THREE.Vector3(), [])
  const last = useRef({ o: -1, vis: null, al: '' })
  useFrameDom((S, t, ctx) => {
    const e = el.current
    if (!e) return
    const o = at(t, S)
    const L = last.current
    if (o < 0.002) {
      if (L.vis !== false) {
        e.style.visibility = 'hidden'
        L.vis = false
        L.o = -1
      }
      return
    }
    if (anchor(vec, S) === false) return
    const [x, y, ok] = ctx.project(vec)
    const mob = ctx.vw < 760 ? 1 : 0
    const al = Array.isArray(align) ? align[mob] : align
    if (L.al !== al) {
      L.al = al
      e.dataset.align = al
    }
    const shift = al === 'right' ? ' translateX(-100%)' : al === 'center' ? ' translateX(-50%)' : ''
    e.style.transform = `translate3d(${(x + dx[mob]).toFixed(1)}px, ${(y + dy[mob] + (1 - o) * lift).toFixed(1)}px, 0)${shift}`
    if (Math.abs(o - L.o) > 0.001) {
      L.o = o
      e.style.opacity = o.toFixed(3)
      e.style.setProperty('--o', o.toFixed(3))
    }
    const vis = ok
    if (L.vis !== vis) {
      L.vis = vis
      e.style.visibility = vis ? 'visible' : 'hidden'
    }
    if (onFrame) onFrame(e, o, S, t, ctx)
  })
  return (
    <div ref={el} className={`pin ${className}`}>
      {children}
    </div>
  )
}

/*
  <Tag> — a label pinned to a point in 3D space, with an optional hairline leader.
  anchor(outVec3, S) writes the world position; dx/dy = [desktop, mobile] pixel offsets;
  col/row pin the label to a fixed viewport column/row (fractions) while the leader follows the anchor.
*/
export function Tag({ at, anchor, dx = [90, 40], dy = [-24, -20], col, row, side = 'right', k, title, value, live, children, className = '', leader = true }) {
  const wrap = useRef()
  const lead = useRef()
  const dot = useRef()
  const val = useRef()
  const lastLive = useRef('')
  const vec = useMemo(() => new THREE.Vector3(), [])
  useFrameDom((S, t, ctx) => {
    const o = typeof at === 'function' ? at(t, S) : env(t, at[0], at[1], at[2], at[3])
    const e = wrap.current
    if (!e) return
    if (o < 0.002) {
      if (e.style.visibility !== 'hidden') {
        e.style.visibility = 'hidden'
        if (lead.current) lead.current.style.visibility = 'hidden'
        if (dot.current) dot.current.style.visibility = 'hidden'
      }
      return
    }
    if (anchor(vec, S) === false) return
    const [x, y, ok] = ctx.project(vec)
    const m = ctx.vw < 760 ? 1 : 0
    const cx = col ? col[m] : null
    const ry = row ? row[m] : null
    const sd = Array.isArray(side) ? side[m] : side
    const flip = sd === 'left'
    const lx = cx != null ? cx * ctx.vw : x + (flip ? -1 : 1) * Math.abs(dx[m])
    const ly = ry != null ? ry * ctx.vh : y + dy[m]
    const showLead = Array.isArray(leader) ? leader[m] : leader
    if (e.dataset.side !== sd) {
      e.dataset.side = sd
      e.classList.toggle('left', flip)
      e.classList.toggle('right', !flip)
    }
    e.style.visibility = ok ? 'visible' : 'hidden'
    e.style.opacity = o.toFixed(3)
    e.style.transform = `translate3d(${lx.toFixed(1)}px, ${(ly + (1 - o) * 8).toFixed(1)}px, 0)${flip ? ' translateX(-100%)' : ''}`
    if (live && val.current) {
      const s = live(S, t)
      if (s !== lastLive.current) {
        lastLive.current = s
        val.current.textContent = s
      }
    }
    if (lead.current) {
      if (!showLead) {
        lead.current.style.visibility = 'hidden'
        dot.current.style.visibility = 'hidden'
      } else {
        const ex = lx + (flip ? 6 : -6)
        const ey = ly + 9
        const len = Math.hypot(ex - x, ey - y) * Math.min(1, o * 1.3)
        const ang = Math.atan2(ey - y, ex - x)
        lead.current.style.visibility = ok ? 'visible' : 'hidden'
        lead.current.style.opacity = o.toFixed(3)
        lead.current.style.width = `${len.toFixed(1)}px`
        lead.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${ang.toFixed(4)}rad)`
        dot.current.style.visibility = ok ? 'visible' : 'hidden'
        dot.current.style.opacity = o.toFixed(3)
        dot.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
    }
  })
  return (
    <>
      {leader && <div ref={lead} className="lead" />}
      {leader && <div ref={dot} className="lead-dot" />}
      <div ref={wrap} className={`tag ${Array.isArray(side) ? side[0] : side} ${className}`}>
        {k && <div className="tag-k">{k}</div>}
        {title && <div className="tag-t">{title}</div>}
        {(live || value) && (
          <div className="tag-v" ref={val}>
            {value}
          </div>
        )}
        {children && <div className="tag-d">{children}</div>}
      </div>
    </>
  )
}
