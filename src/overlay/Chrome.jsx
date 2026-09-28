import { useRef, useState } from 'react'
import { useFrameDom } from './primitives'
import { SCENES, TOTAL, SCROLL_TOTAL, sceneIndexAt, range, unwarp } from '../film/timeline'
import { film } from '../film/store'
import { LINKS } from '../config'
import { Wordmark } from './Wordmark'

// jump to a moment in story time
export function jumpTo(t) {
  const y = unwarp(t) * film.vh
  const lenis = film.lenis
  if (lenis) {
    const dist = Math.abs(y - lenis.scroll) / film.vh
    lenis.scrollTo(y, { duration: film.reduced ? 0 : Math.min(3.4, 1 + dist * 0.1), easing: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) })
  } else window.scrollTo({ top: y, behavior: 'smooth' })
}

// Film chrome: wordmark, waitlist, scene index, progress. Quiet until the film starts.
export function Chrome() {
  const [active, setActive] = useState(0)
  const activeRef = useRef(0)
  const bar = useRef()
  const root = useRef()
  const lastState = useRef('')

  useFrameDom((S, t) => {
    const i = sceneIndexAt(t)
    if (i !== activeRef.current) {
      activeRef.current = i
      setActive(i)
    }
    bar.current.style.transform = `scaleX(${(t / TOTAL).toFixed(4)})`
    const past = range(window.scrollY / film.vh, SCROLL_TOTAL + 0.05, SCROLL_TOTAL + 0.6)
    const intro = range(t, 0.08, 0.5)
    const st = `${intro > 0.5 ? 'on' : 'off'} ${past > 0.5 ? 'coda' : 'film'}`
    root.current.style.setProperty('--intro', intro.toFixed(3))
    root.current.style.setProperty('--past', past.toFixed(3))
    if (st !== lastState.current) {
      lastState.current = st
      root.current.dataset.state = st
      film.inCoda = past > 0.5
    }
  })

  const sc = SCENES[active]
  return (
    <div className="chrome" ref={root} data-state="off film">
      <header className="nav">
        <a className="nav-mark" href={LINKS.home} aria-label="Vexo">
          <Wordmark />
        </a>
        <a className="nav-cta" href={LINKS.app} target="_blank" rel="noreferrer">
          Get the app
        </a>
      </header>

      <div className="hud">
        <div className="hud-scene mono" aria-live="polite">
          <span className="hud-n">{sc.n}</span>
          <span className="hud-sep" />
          <span className="hud-name">{sc.name}</span>
        </div>
        <nav className="index" aria-label="Scenes">
          {SCENES.map((s, i) => (
            <button key={s.id} className={i === active ? 'on' : ''} onClick={() => jumpTo(s.jump)} aria-label={`Scene ${s.n}: ${s.name}`}>
              <span className="index-name">{s.name}</span>
              <i />
            </button>
          ))}
        </nav>
        <button className="hud-skip mono" onClick={() => jumpTo(SCENES[SCENES.length - 1].jump)}>
          Skip to the end
        </button>
        <div className="progress">
          <i ref={bar} />
        </div>
      </div>
    </div>
  )
}
