import { useState } from 'react'
import { LINKS, PHOTOS, SHOW_WAITLIST } from './config'
import { Wordmark } from './overlay/Wordmark'

function Photo({ p, className = '', loading = 'lazy' }) {
  const [ok, setOk] = useState(true)
  return (
    <figure className={`ph ${className} ${ok ? '' : 'ph-missing'}`} style={{ aspectRatio: `${p.w} / ${p.h}` }}>
      {ok && <img src={p.src} alt={p.alt} loading={loading} decoding="async" crossOrigin="anonymous" onError={() => setOk(false)} />}
    </figure>
  )
}

function Film() {
  const [play, setPlay] = useState(false)
  return (
    <div className="film">
      {play ? (
        <video src={PHOTOS.film.src} poster={PHOTOS.film.poster} controls autoPlay playsInline preload="none" />
      ) : (
        <button className="film-poster" onClick={() => setPlay(true)} aria-label="Play A Day With Vexo, with sound">
          <img src={PHOTOS.film.poster} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span className="film-play" aria-hidden="true">
            <i />
          </span>
          <span className="film-t">
            <span className="eyebrow">Watch with sound</span>
            <span className="film-name">A Day With Vexo</span>
          </span>
        </button>
      )}
    </div>
  )
}

const SPECS = [
  ['Signals', 'Heart rate, HRV, blood oxygen, respiratory rate, skin temperature, sleep and activity. Measured every second.'],
  ['Sensors', 'Optical heart-rate sensor, skin-temperature sensor, accelerometer and gyroscope.'],
  ['Voice', 'A microphone on the ring. Double tap to speak. Transcribed on your iPhone; the audio never leaves it.'],
  ['Haptics', 'Silent. Alarms, nudges and gentle check-ins, felt by you and no one else.'],
  ['Battery', 'Five days on one charge. An hour on the dock and it’s ready again.'],
  ['Body', 'Aerospace titanium. 2.4 grams.'],
  ['Everyday', 'Hand washing, sweat, a caught-out shower. It keeps reading.'],
  ['Apps', 'Stride, Matchday, Rally, Still, Plate, Dose, Lift, Goals and 100+ more — or describe your own to Vexo Studio.'],
  ['Platform', 'MCP for the AI assistants you choose, scoped OAuth 2.1 for developers. Off by default, revocable any time.'],
]

// After the film: the object in real light, the details, the film, the footer. Typographic, not cards.
export function Coda() {
  return (
    <main className="coda" id="after">
      <section className="coda-intro">
        <div className="coda-copy">
          <h2 className="coda-h">
            Barely <em>there.</em>
          </h2>
          <p className="coda-p">Aerospace titanium. 2.4 grams. Worn day and night, it learns what normal feels like for you.</p>
        </div>
        <Photo p={PHOTOS.hand} className="ph-hand" />
      </section>

      <section className="coda-pair">
        <div>
          <Photo p={PHOTOS.gold} />
          <p className="cap">
            <span className="cap-k">Everyday-ready.</span> Hand washing, sweat, a caught-out shower. It keeps reading.
          </p>
        </div>
        <div>
          <Photo p={PHOTOS.night} />
          <p className="cap">
            <span className="cap-k">Silent haptics.</span> A gentle tap only you can feel.
          </p>
        </div>
      </section>

      <section className="coda-specs" aria-label="Vexo Ring at a glance">
        <div className="eyebrow">Vexo Ring</div>
        <dl>
          {SPECS.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="coda-film">
        <Film />
      </section>

      <section className="coda-women">
        <Photo p={PHOTOS.women} />
        <div className="coda-women-t">
          <h3 className="coda-h3">The ins and outs of women’s health.</h3>
          <p className="coda-p">Vexo reads your cycle off your finger and moves your training, sleep and recovery with it.</p>
          <a className="link" href={LINKS.women}>
            Explore women’s health <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section className="coda-last">
        <Photo p={PHOTOS.moss} className="ph-moss" />
        <p className="coda-quote">A quiet instrument for the signals your body is already sending.</p>
        <div className="finale-cta static">
          <a className="btn primary" href={LINKS.app} target="_blank" rel="noreferrer">
            Get the Vexo app
          </a>
          {SHOW_WAITLIST && (
            <a className="btn ghost" href={LINKS.waitlist}>
              Join the waitlist
            </a>
          )}
        </div>
      </section>

      <footer className="foot">
        <div className="foot-mark">
          <Wordmark />
        </div>
        <nav className="foot-col" aria-label="Product">
          <div className="eyebrow">Product</div>
          <a href={LINKS.women}>Women’s Health</a>
          <a href={LINKS.app} target="_blank" rel="noreferrer">
            Vexo app
          </a>
          {SHOW_WAITLIST && <a href={LINKS.waitlist}>Waitlist</a>}
        </nav>
        <nav className="foot-col" aria-label="Company">
          <div className="eyebrow">Company</div>
          <a href={LINKS.privacy}>Privacy</a>
          <a href={LINKS.terms}>Terms</a>
          <a href={LINKS.hackathon}>Hackathon</a>
        </nav>
        <div className="foot-col">
          <div className="eyebrow">Contact</div>
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
        <p className="foot-legal">
          Vexo is a general wellness product, not a medical device. It is not intended to diagnose, treat, cure or prevent any condition. Readings are estimates from consumer sensors.
        </p>
        <p className="foot-legal mono">
          © 2026 VexoAI, Inc. · <a href={LINKS.yc}>Backed by Y Combinator</a>
        </p>
      </footer>
    </main>
  )
}
