import { Coda } from './Coda'
import { PHOTOS, LINKS } from './config'
import { Wordmark } from './overlay/Wordmark'

// Devices without WebGL2 get the same story as a quiet, typographic page.
const STORY = [
  ['The signals that matter.', 'Heart rate, HRV, blood oxygen, respiratory rate, skin temperature, sleep and activity. Measured every second.'],
  ['Double tap to speak.', 'Mid run, mid meal, mid thought, say it before the moment goes away. It’s transcribed on your iPhone.'],
  ['Feel what it knows.', 'A quiet pulse against your skin. Alarms, nudges and gentle check-ins, felt by you and no one else.'],
  ['Every app, one ring.', 'Stride, Matchday, Rally, Still, Plate, Dose, Lift, Goals, and 100+ more in the marketplace.'],
  ['Describe the app you want.', 'Vexo Studio writes it for you: every line of code, the screens, and the wiring into your live ring data.'],
  ['The body, as an API.', 'MCP for the AI assistants you choose, scoped OAuth 2.1 for developers. Off by default, revocable at any time.'],
  ['Your data belongs to you.', 'Every insight is computed on your phone. No feeds, no ads, nothing sold.'],
  ['Five days. One charge.', 'Then an hour on the dock and it’s ready to go again.'],
]

export function Fallback() {
  return (
    <>
      <header className="fb-nav">
        <a href={LINKS.home} aria-label="Vexo">
          <Wordmark />
        </a>
        <a className="nav-cta" href={LINKS.app} target="_blank" rel="noreferrer">
          Get the app
        </a>
      </header>
      <section className="fb-hero">
        <img src={PHOTOS.moss.src} alt={PHOTOS.moss.alt} />
        <h1 className="display">
          Your <em>sixth</em> sense
        </h1>
        <p className="lede">Listens, remembers and acts before you ask.</p>
      </section>
      <section className="fb-story">
        {STORY.map(([h, p]) => (
          <div key={h}>
            <h2 className="headline">{h}</h2>
            <p className="lede">{p}</p>
          </div>
        ))}
      </section>
      <Coda />
    </>
  )
}
