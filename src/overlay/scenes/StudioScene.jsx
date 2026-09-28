import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { anchors } from '../../gl/anchors'
import { nodePos } from '../../gl/Network'
import { clamp, smooth, range, ease, lerp } from '../../film/timeline'

/*
  06 · Build an app by describing it — the signature moment.
  A spoken sentence pours into the ring; code spirals out of it; an app assembles in space,
  its parts flying out of the ring and locking into place, wired to the ring's live signals.
  All DOM (crisp, selectable text), anchored every frame to the ring's projected position.
*/
const PROMPT = 'Build me a marathon fuel planner.'
const CODE = [
  'const plan = fuelPlan({ race: "marathon", carbsPerHour: 60 })',
  'on("heart_rate", (bpm) => plan.pace(zoneFor(bpm)))',
  'on("sleep", (night) => plan.taper(night.duration))',
  'on("recovery", (r) => plan.ready(r.score))',
  'schedule(plan.gels, { every: "45 min" })',
  'screen("Race day", [Fuel, HeartRate, Sleep, Recovery])',
  'remind("Breakfast", { at: "06:30" })',
  'const zones = heartRateZones(profile.age)',
  'export default app("Fuel Planner")',
]
const WIRES = [
  { key: 'hr', label: 'heart rate', slot: 'w-hr', a: -0.42 },
  { key: 'sleep', label: 'sleep', slot: 'w-sleep', a: 0 },
  { key: 'rec', label: 'recovery', slot: 'w-rec', a: 0.42 },
]

const cv = new THREE.Vector3()
const rv = new THREE.Vector3()
const right = new THREE.Vector3()

// the ring's centre and radius on screen, this frame
function ringOnScreen(S, ctx) {
  const o = anchors.ringCenter
  if (!o) return null
  o.getWorldPosition(cv)
  right.set(1, 0, 0).applyQuaternion(ctx.camera.quaternion)
  rv.copy(cv).addScaledVector(right, 1.27 * S.ring.scale)
  const [x, y] = ctx.project(cv)
  const [x2, y2] = ctx.project(rv)
  return { x, y, r: Math.hypot(x2 - x, y2 - y) }
}

function Prompt() {
  const el = useRef()
  const chars = useRef([])
  const rest = useRef(null)
  const letters = useMemo(() => [...PROMPT], [])
  useFrameDom((S, t, ctx) => {
    const e = el.current
    const St = S.studio
    const p = smooth(range(t, 19.95, 20.7))
    const stream = St.stream
    const vis = p > 0 && stream < 1 && St.a > 0
    e.style.visibility = vis ? 'visible' : 'hidden'
    if (!vis) {
      rest.current = null
      return
    }
    e.style.setProperty('--p', p.toFixed(4))
    const ring = ringOnScreen(S, ctx)
    if (!ring) return
    // measure where each letter rests (once per layout)
    if (!rest.current || rest.current.vw !== ctx.vw) {
      const r0 = e.getBoundingClientRect()
      rest.current = { vw: ctx.vw, pos: chars.current.map((c) => (c ? { x: c.offsetLeft + c.offsetWidth / 2 + r0.left, y: c.offsetTop + c.offsetHeight / 2 + r0.top } : { x: 0, y: 0 })) }
    }
    const N = letters.length
    chars.current.forEach((c, i) => {
      if (!c) return
      const k = ease.in(clamp((stream - (i / N) * 0.45) / 0.55))
      if (k <= 0) {
        c.style.transform = ''
        c.style.opacity = ''
        return
      }
      const r = rest.current.pos[i]
      // spiral in: travel to the ring's centre along a slight curve
      const ang = (1 - k) * 0.9
      const dx = (ring.x - r.x) * k
      const dy = (ring.y - r.y) * k - Math.sin(k * Math.PI) * 40 * Math.cos(ang)
      c.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${(1 - 0.8 * k).toFixed(3)})`
      c.style.opacity = (1 - k * k).toFixed(3)
    })
  })
  let wi = 0
  return (
    <div ref={el} className="prompt">
      <div className="prompt-mic" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <p className="prompt-line" aria-label={PROMPT}>
        {PROMPT.split(' ').map((word, w) => {
          const span = (
            <span key={w} className="pw" style={{ '--i': w, '--n': 6 }}>
              {[...word].map((ch, j) => {
                const idx = wi++
                return (
                  <span key={j} className="pc" ref={(n) => (chars.current[idx] = n)}>
                    {ch}
                  </span>
                )
              })}
              {w < 5 && ' '}
            </span>
          )
          wi++ // the space
          return span
        })}
      </p>
    </div>
  )
}

function CodeSpiral() {
  const lines = useRef([])
  const counter = useRef()
  const counterN = useRef()
  useFrameDom((S, t, ctx) => {
    const St = S.studio
    const c = St.code
    const on = c > 0 && c < 1 && St.a > 0
    const ring = on ? ringOnScreen(S, ctx) : null
    lines.current.forEach((el, i) => {
      if (!el) return
      const k = clamp((c - i * 0.07) / 0.45)
      if (!ring || k <= 0 || k >= 1) {
        el.style.visibility = 'hidden'
        return
      }
      const a = i * 0.72 + k * 1.6 - 0.4
      const rad = ring.r * (0.3 + k * 1.9)
      const x = ring.x + Math.cos(a) * rad
      const y = ring.y + Math.sin(a) * rad * 0.62
      el.style.visibility = 'visible'
      el.style.opacity = (Math.sin(Math.PI * k) * 0.85).toFixed(3)
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${(Math.cos(a) * 6).toFixed(2)}deg)`
    })
    const cv2 = counter.current
    const vis = St.a > 0 && t > 21.4 && t < 22.9 && !(ctx.vw < 760 && St.build > 0.04)
    cv2.style.visibility = vis ? 'visible' : 'hidden'
    if (vis) {
      cv2.style.opacity = (smooth(range(t, 21.4, 21.6)) * (1 - smooth(range(t, 22.55, 22.9)))).toFixed(3)
      counterN.current.textContent = `${Math.round(smooth(c) * 100)}%`
    }
  })
  return (
    <>
      {CODE.map((l, i) => (
        <code key={i} className="code-line" ref={(n) => (lines.current[i] = n)} aria-hidden="true">
          {l}
        </code>
      ))}
      <div className="code-counter" ref={counter}>
        <span className="eyebrow">The code you’ll never write</span>
        <span className="code-n" ref={counterN}>
          0%
        </span>
      </div>
    </>
  )
}

// The app itself — its parts fly out of the ring and lock into the phone.
function FuelPlanner() {
  const root = useRef()
  const frame = useRef()
  const parts = useRef([])
  const wires = useRef([])
  const ports = useRef([])
  const slots = useRef({})
  const cache = useRef(null)
  const nv = useMemo(() => new THREE.Vector3(), [])

  useFrameDom((S, t, ctx) => {
    const St = S.studio
    const e = root.current
    const vis = St.a > 0 && St.build > 0 && St.shrink < 1
    e.style.visibility = vis ? 'visible' : 'hidden'
    if (!vis) {
      cache.current = null
      return
    }
    const ring = ringOnScreen(S, ctx)
    if (!ring) return
    // hand-off to Scene 07: the finished app shrinks into its node in the network
    let shrinkT = ''
    if (St.shrink > 0) {
      nodePos(0, nv)
      const [nx, ny] = ctx.project(nv)
      const r0 = frame.current.getBoundingClientRect()
      const cx = r0.left + r0.width / 2
      const cy = r0.top + r0.height / 2
      const k = ease.inOut(St.shrink)
      shrinkT = `translate(${((nx - cx) * k).toFixed(1)}px, ${((ny - cy) * k).toFixed(1)}px) scale(${lerp(1, 0.06, k).toFixed(3)})`
      e.style.opacity = (1 - smooth(clamp((St.shrink - 0.6) / 0.4))).toFixed(3)
    } else e.style.opacity = '1'
    e.style.transform = shrinkT
    e.style.setProperty('--frame', smooth(clamp(St.build / 0.25)).toFixed(3))

    // measure resting slots once per layout (untransformed)
    if (!cache.current || cache.current.vw !== ctx.vw) {
      const prev = e.style.transform
      e.style.transform = ''
      cache.current = {
        vw: ctx.vw,
        parts: parts.current.map((p) => {
          if (!p) return null
          const r = p.getBoundingClientRect()
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        }),
        slots: Object.fromEntries(
          Object.entries(slots.current).map(([k, n]) => {
            const r = n.getBoundingClientRect()
            return [k, { x: r.left, y: r.top + r.height / 2 }]
          }),
        ),
      }
      e.style.transform = prev
    }
    const N = parts.current.length
    parts.current.forEach((p, i) => {
      if (!p) return
      const k = ease.out(clamp((St.build - 0.12 - (i / N) * 0.62) / 0.3))
      const rest = cache.current.parts[i]
      if (!rest) return
      const dx = (ring.x - rest.x) * (1 - k)
      const dy = (ring.y - rest.y) * (1 - k)
      p.style.opacity = clamp(k * 3).toFixed(3)
      p.style.transform = k >= 1 ? '' : `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${(0.25 + 0.75 * k).toFixed(3)}) rotateX(${((1 - k) * 50).toFixed(1)}deg) rotateY(${((1 - k) * -28).toFixed(1)}deg)`
    })

    // wires: the ring's live signals → the parts that use them
    WIRES.forEach((wd, i) => {
      const path = wires.current[i]
      const port = ports.current[i]
      const slot = cache.current.slots[wd.slot]
      if (!path || !slot) return
      const k = smooth(clamp((St.wire - i * 0.18) / 0.55)) * (1 - St.shrink)
      const px = ring.x + Math.cos(wd.a) * ring.r * 1.02
      const py = ring.y + Math.sin(wd.a) * ring.r * 1.02
      const mx = (px + slot.x) / 2
      path.setAttribute('d', `M${px.toFixed(1)},${py.toFixed(1)} C${mx.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${slot.y.toFixed(1)} ${slot.x.toFixed(1)},${slot.y.toFixed(1)}`)
      path.style.strokeDashoffset = (1 - k).toFixed(4)
      path.style.opacity = k > 0 ? '1' : '0'
      port.style.opacity = k.toFixed(3)
      port.style.transform = `translate3d(${(px + 10).toFixed(1)}px, ${(py - 18).toFixed(1)}px, 0)`
    })
  })

  let pi = 0
  const P = (cls, children, slot) => {
    const i = pi++
    return (
      <div
        className={`fp-part ${cls}`}
        ref={(n) => {
          parts.current[i] = n
          if (slot && n) slots.current[slot] = n
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="studio-app" ref={root} aria-label="Fuel Planner, an app built with Vexo Studio">
      <svg className="wires" aria-hidden="true">
        {WIRES.map((wd, i) => (
          <path key={wd.key} ref={(n) => (wires.current[i] = n)} pathLength="1" />
        ))}
      </svg>
      {WIRES.map((wd, i) => (
        <span key={wd.key} className="port mono" ref={(n) => (ports.current[i] = n)}>
          {wd.label}
        </span>
      ))}
      <div className="phone" ref={frame}>
        <svg className="phone-outline" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0.5" y="0.5" width="99" height="199" rx="14" ry="7" pathLength="1" />
        </svg>
        <div className="phone-in">
          {P(
            'fp-head',
            <>
              <div className="fp-app">Fuel Planner</div>
              <div className="fp-built mono">Built just now</div>
            </>,
          )}
          {P(
            'fp-hero',
            <>
              <div className="fp-k mono">Sunday · Marathon</div>
              <div className="fp-big">Race-day fuel</div>
              <div className="fp-sub">60 g carbs an hour, one gel every 45 minutes</div>
            </>,
          )}
          {P(
            'fp-list',
            <>
              {[
                ['06:30', 'Breakfast', '90 g'],
                ['Start', 'Gel', '25 g'],
                ['Mile 10', 'Gel + water', '25 g'],
                ['Mile 20', 'Gel + electrolytes', '25 g'],
              ].map(([a, b, c]) => (
                <div className="fp-row" key={a}>
                  <span className="mono">{a}</span>
                  <span>{b}</span>
                  <span className="fp-g">{c}</span>
                </div>
              ))}
            </>,
          )}
          <div className="fp-widgets">
            {P(
              'fp-w',
              <>
                <div className="fp-k mono">Heart rate</div>
                <svg viewBox="0 0 60 18" className="fp-spark" aria-hidden="true">
                  <path d="M0 12 L8 11 L14 13 L20 8 L26 10 L32 6 L38 9 L44 7 L50 9 L60 5" />
                </svg>
                <div className="fp-v">
                  138<span> bpm</span>
                </div>
              </>,
              'w-hr',
            )}
            {P(
              'fp-w',
              <>
                <div className="fp-k mono">Sleep</div>
                <div className="fp-v">7h 12m</div>
              </>,
              'w-sleep',
            )}
            {P(
              'fp-w',
              <>
                <div className="fp-k mono">Recovery</div>
                <div className="fp-v">
                  78<span>%</span>
                </div>
              </>,
              'w-rec',
            )}
          </div>
          {P('fp-cta', <span>Start race-day plan</span>)}
        </div>
      </div>
    </div>
  )
}

function Steps() {
  const el = useRef()
  useFrameDom((S, t) => {
    const step = t < 20.85 ? 0 : t < 23.4 ? 1 : 2
    if (el.current.dataset.step !== String(step)) el.current.dataset.step = String(step)
  })
  return (
    <Beat at={[19.9, 20.2, 24.05, 24.35]} className="full a-top steps-wrap">
      <ol className="steps mono" ref={el} data-step="0">
        <li>Describe</li>
        <li>Vexo builds it</li>
        <li>On your ring</li>
      </ol>
    </Beat>
  )
}

export function StudioScene() {
  return (
    <>
      <Beat at={[19.3, 19.65, 19.95, 20.25]} className="full a-top">
        <div className="block center">
          <div className="eyebrow">Vexo Studio</div>
          <h2 className="headline">
            <Ln>What if the app</Ln>
            <Ln i={1}>doesn’t exist yet?</Ln>
          </h2>
        </div>
      </Beat>
      <Steps />
      <Prompt />
      <CodeSpiral />
      <FuelPlanner />
      <Beat at={[23.45, 23.8, 24.15, 24.45]} className="full a-bottom credit-wrap">
        <div className="credit">
          <span className="eyebrow">Created with Vexo Studio</span>
          <span className="credit-line">Describe it out loud. Vexo builds it, one shot.</span>
        </div>
      </Beat>
    </>
  )
}
