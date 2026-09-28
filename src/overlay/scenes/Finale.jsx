import { useRef, useState } from 'react'
import { useFrameDom } from '../primitives'
import { Wordmark } from '../Wordmark'
import { ENV } from '../../gl/studio'
import { film } from '../../film/store'
import { smooth, range } from '../../film/timeline'
import { FINISHES, LINKS, SHOW_WAITLIST } from '../../config'

// 10 · The same ring as the opening shot — now we know what's inside it.
export function Finale() {
  const el = useRef()
  const live = useRef(false)
  const [finish, setFinish] = useState(film.finish)
  useFrameDom((S, t) => {
    const e = el.current
    const p = smooth(range(t, 35.0, 35.6))
    const w = smooth(range(t, 35.35, 36.1))
    const c = smooth(range(t, 35.75, 36.3))
    e.style.setProperty('--p', p.toFixed(4))
    e.style.setProperty('--w', w.toFixed(4))
    e.style.setProperty('--c', c.toFixed(4))
    const d = ENV.uBoxDir.value[0]
    e.style.setProperty('--sweep', `${(50 + (Math.atan2(d.x, d.z) / Math.PI) * 90).toFixed(1)}%`)
    e.style.visibility = p > 0.002 ? 'visible' : 'hidden'
    const on = c > 0.6
    if (on !== live.current) {
      live.current = on
      e.style.pointerEvents = on ? 'auto' : 'none'
      e.setAttribute('aria-hidden', on ? 'false' : 'true')
    }
  })
  const pick = (id) => {
    film.finish = id
    setFinish(id)
  }
  return (
    <section className="finale" ref={el} aria-label="Vexo Ring" aria-hidden="true">
      <h2 className="display metal finale-title">
        Your <em>sixth</em> sense
      </h2>
      <div className="finale-mark">
        <Wordmark strokeWidth={7} />
      </div>
      <div className="finale-cta">
        <a className="btn primary" href={LINKS.app} target="_blank" rel="noreferrer">
          Get the Vexo app
        </a>
        {SHOW_WAITLIST && (
          <a className="btn ghost" href={LINKS.waitlist}>
            Join the waitlist
          </a>
        )}
      </div>
      <div className="finish" role="radiogroup" aria-label="Finish">
        {FINISHES.map((f) => (
          <button key={f.id} role="radio" aria-checked={finish === f.id} className={finish === f.id ? 'on' : ''} onClick={() => pick(f.id)}>
            <i style={{ background: f.swatch }} />
            <span>{f.label}</span>
          </button>
        ))}
      </div>
      <a className="yc mono" href={LINKS.yc} target="_blank" rel="noreferrer">
        Backed by Y Combinator
      </a>
    </section>
  )
}
