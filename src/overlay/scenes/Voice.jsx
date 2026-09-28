import { useRef } from 'react'
import { Beat, Ln, Words, useFrameDom } from '../primitives'
import { range, smooth } from '../../film/timeline'
import { DEMO } from '../../config'

/*
  06 · Just say it. — Vexo's own demo: a spoken request flows into the microphone
  (no gesture: the site doesn't specify one), then "Listening" → "Creating live", and a
  four-slide deck is set up. Only slide 1's content is shown on vexoai.com, so only slide 1 has content here.
*/
function Said() {
  const el = useRef()
  const st = useRef()
  const lastS = useRef('')
  useFrameDom((S, t) => {
    const e = el.current
    const p = smooth(range(t, 20.6, 21.5))
    const out = smooth(range(t, 23.2, 23.6))
    e.style.setProperty('--p', p.toFixed(4))
    const o = Math.min(1, p * 4) * (1 - out)
    e.style.opacity = o.toFixed(3)
    e.style.visibility = o > 0.002 ? 'visible' : 'hidden'
    const s = t < 21.75 ? 'listen' : 'create'
    if (s !== lastS.current) {
      lastS.current = s
      st.current.dataset.state = s
    }
  })
  return (
    <div ref={el} className="said">
      <div className="said-state mono" ref={st} data-state="listen">
        <span className="said-listen">
          <i className="mic-bars" aria-hidden="true">
            <b />
            <b />
            <b />
            <b />
          </i>
          Listening
        </span>
        <span className="said-create">
          <i className="live-dot" aria-hidden="true" />
          Creating live
        </span>
      </div>
      <p className="said-q">
        <Words text={`“${DEMO.said}”`} />
      </p>
    </div>
  )
}

// four slides, set up one after another; the first carries the site's own demo slide
function Deck() {
  const el = useRef()
  useFrameDom((S, t) => {
    const e = el.current
    const p = range(t, 21.85, 23.1)
    const out = smooth(range(t, 23.3, 23.75))
    e.style.setProperty('--p', p.toFixed(4))
    e.style.setProperty('--q', out.toFixed(4))
    e.style.visibility = p > 0.001 && out < 0.999 ? 'visible' : 'hidden'
  })
  return (
    <div className="deck" ref={el} aria-label="After Hours, a demo slide deck">
      <div className="deck-meta mono">
        <span>After Hours · Pitch deck</span>
        <span className="deck-n">Slide 1 of 4</span>
      </div>
      <div className="deck-row">
        <figure className="slide s1" style={{ '--i': 0 }}>
          <span className="slide-k mono">After hours · The concept</span>
          <span className="slide-t">
            after <em>hours.</em>
          </span>
          <span className="slide-l">{DEMO.line}</span>
          <span className="slide-f mono">
            <span>{DEMO.kicker}</span>
            <span>01 — 04</span>
          </span>
        </figure>
        {[2, 3, 4].map((n) => (
          <figure key={n} className="slide ghost" style={{ '--i': n - 1 }}>
            <span className="slide-k mono">0{n}</span>
            <span className="slide-skel" />
            <span className="slide-skel short" />
          </figure>
        ))}
      </div>
      <div className="deck-meta mono dim">Setting the canvas</div>
    </div>
  )
}

export function Voice() {
  return (
    <>
      <Beat at={[19.95, 20.25, 20.6, 20.85]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Just say it.</Ln>
          </h2>
          <p className="lede center">Built-in microphone. For the things you want to say.</p>
        </div>
      </Beat>
      <Said />
      <Deck />
      <Beat at={[22.2, 22.5, 23.3, 23.7]} className="full a-bottom">
        <div className="block center">
          <span className="eyebrow">Vexo Intelligence</span>
        </div>
      </Beat>
    </>
  )
}
