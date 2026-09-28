import { useRef, useState } from 'react'
import { useFrameDom } from '../primitives'
import { film } from '../../film/store'
import { smooth, range } from '../../film/timeline'
import { FINISHES, LINKS, PRICE } from '../../config'

// 09 · Make it yours — the band off the wrist, back in the light it came from. Finishes switch on the model.
export function Finale() {
  const el = useRef()
  const live = useRef(false)
  const [finish, setFinish] = useState(film.finish)
  useFrameDom((S, t) => {
    const e = el.current
    const p = smooth(range(t, 33.0, 33.6))
    const c = smooth(range(t, 33.6, 34.2))
    e.style.setProperty('--p', p.toFixed(4))
    e.style.setProperty('--c', c.toFixed(4))
    e.style.setProperty('--sweep', `${(-10 + smooth(range(t, 32.8, 34.6)) * 120).toFixed(1)}%`)
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
  const f = FINISHES.find((x) => x.id === finish) || FINISHES[0]
  return (
    <section className="finale" ref={el} aria-label="Vexo Band" aria-hidden="true">
      <h2 className="display metal finale-title">Already on it.</h2>
      <p className="finale-sub">
        Vexo Band <span className="dot" /> {PRICE}
      </p>
      <div className="finale-cta">
        <a className="btn primary" href={LINKS.finish(f.id)}>
          Buy Band
        </a>
      </div>
      <div className="finish" role="radiogroup" aria-label="Finish">
        {FINISHES.map((x) => (
          <button key={x.id} role="radio" aria-checked={finish === x.id} className={finish === x.id ? 'on' : ''} onClick={() => pick(x.id)}>
            <i style={{ background: x.swatch }} />
            <span>{x.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
