import { Coda } from './Coda'
import { PHOTOS, LINKS } from './config'
import { Wordmark } from './overlay/Wordmark'

// Without WebGL2 (or if the model can't load), the same story as a quiet, photographic page.
const STORY = [
  ['Every AI today waits for a prompt.', 'Vexo already has the context. It turns what it hears into private memories and acts on them: booking the table, sending the follow-up, ordering the groceries, through the apps you already use.'],
  ['Just say it.', 'Built-in microphone. For the things you want to say.'],
  ['In tune with you.', 'Health sensors beneath: heart rate, skin temperature and motion.'],
  ['A gentle tap, just for you.', 'Quiet haptics. No screen, and nothing to open.'],
  ['Private by design.', 'Vexo never keeps your audio. Only you can see your memories, and you can delete them anytime.'],
]

export function Fallback() {
  return (
    <>
      <header className="fb-nav">
        <a href={LINKS.home} aria-label="Vexo">
          <Wordmark />
        </a>
        <a className="nav-cta" href={LINKS.buy}>
          Buy Band
        </a>
      </header>
      <section className="fb-hero">
        <img src={PHOTOS.intro.src} alt={PHOTOS.intro.alt} />
        <h1 className="display">Already on it.</h1>
        <p className="lede">Your AI. On your wrist.</p>
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
