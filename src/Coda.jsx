import { useState } from 'react'
import { LINKS, PHOTOS, DETAILS, AGENTS, CONNECTORS_AVAILABLE, CONNECTORS_TOTAL, FINISHES, PRICE } from './config'
import { Wordmark } from './overlay/Wordmark'

function Photo({ p, className = '', loading = 'lazy' }) {
  const [ok, setOk] = useState(true)
  return (
    <figure className={`ph ${className} ${ok ? '' : 'ph-missing'}`} style={{ aspectRatio: `${p.w} / ${p.h}` }}>
      {ok && <img src={p.src} alt={p.alt} loading={loading} decoding="async" onError={() => setOk(false)} />}
    </figure>
  )
}

const WRISTS = [
  { id: 'graphite', p: PHOTOS.graphiteWrist },
  { id: 'pearl', p: PHOTOS.pearlWrist },
  { id: 'moss', p: PHOTOS.mossWrist },
]

// After the film: the band in real light, the details, and the footer. Typographic, not cards.
export function Coda() {
  const [wrist, setWrist] = useState('graphite')
  const cur = WRISTS.find((x) => x.id === wrist)
  return (
    <main className="coda" id="after">
      <section className="coda-intro">
        <div className="coda-copy">
          <span className="eyebrow">Vexo Band</span>
          <h2 className="coda-h">
            Woven comfort. <em>Thoughtfully connected.</em>
          </h2>
          <p className="coda-p">An AI bracelet that remembers your day and acts before you ask.</p>
          <div className="finish static" role="radiogroup" aria-label="Finish">
            {FINISHES.map((f) => (
              <button key={f.id} role="radio" aria-checked={wrist === f.id} className={wrist === f.id ? 'on' : ''} onClick={() => setWrist(f.id)}>
                <i style={{ background: f.swatch }} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
        <Photo key={cur.id} p={cur.p} className="ph-wrist" />
      </section>

      <section className="coda-pair">
        <div>
          <Photo p={PHOTOS.mic} />
          <p className="cap">
            <span className="cap-k">Just say it.</span> Built-in microphone.
          </p>
        </div>
        <div>
          <Photo p={PHOTOS.sensors} />
          <p className="cap">
            <span className="cap-k">In tune with you.</span> Health sensors.
          </p>
        </div>
      </section>

      <section className="coda-specs" aria-label="Band, in detail">
        <div className="eyebrow">Band, in detail</div>
        <dl>
          {DETAILS.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>Vexo Intelligence</dt>
            <dd>{AGENTS.join(', ')}.</dd>
          </div>
          <div>
            <dt>Your world</dt>
            <dd>
              {CONNECTORS_AVAILABLE.join(', ')} available now; {CONNECTORS_TOTAL - CONNECTORS_AVAILABLE.length} more coming soon. Choose what you connect in the Vexo app.
            </dd>
          </div>
          <div>
            <dt>Privacy</dt>
            <dd>Vexo never keeps your audio. Only you can see your memories, and you can delete them anytime.</dd>
          </div>
        </dl>
      </section>

      <section className="coda-finishes" aria-label="Finishes">
        {FINISHES.map((f) => (
          <a key={f.id} className="coda-finish" href={LINKS.finish(f.id)}>
            <Photo p={PHOTOS[f.id]} />
            <span className="cap">
              <span className="cap-k">{f.label}</span>
              {f.note ? ` ${f.note}` : ''}
            </span>
          </a>
        ))}
      </section>

      <section className="coda-last">
        <Photo p={PHOTOS.signature} className="ph-sig" />
        <h3 className="coda-h3">
          Make it <em>yours.</em>
        </h3>
        <div className="finale-cta static">
          <a className="btn primary" href={LINKS.buy}>
            Buy Band · {PRICE}
          </a>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-mark">
          <Wordmark />
        </div>
        <nav className="foot-col" aria-label="Product">
          <div className="eyebrow">Product</div>
          <a href={LINKS.buy}>Explore Band</a>
          <a href={LINKS.privacy}>Privacy</a>
          <a href={LINKS.terms}>Terms</a>
        </nav>
        <div className="foot-col">
          <div className="eyebrow">Get in touch</div>
          <a href={LINKS.email}>info@vexoai.com</a>
          <a href={LINKS.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href={LINKS.x} target="_blank" rel="noreferrer">
            X
          </a>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
        <p className="foot-legal mono">© 2026 VexoAI, Inc.</p>
      </footer>
    </main>
  )
}
