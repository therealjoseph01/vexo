import { useRef } from 'react'
import { Beat, Ln, Words, useFrameDom } from '../primitives'
import { pulse, range, smooth } from '../../film/timeline'

// A voice note (double tap to capture). Routing to Reminders needs a tap in the app, so the film stops at the note.
const UTTERANCE = 'Note to self: stretch after this run.'

// TAP · TAP — two dots that flash in sync with the ripples on the metal
function Taps() {
  const a = useRef()
  const b = useRef()
  useFrameDom((S, t) => {
    a.current.style.setProperty('--k', pulse(t, 12.47, 0.05).toFixed(3))
    a.current.style.setProperty('--on', (t > 12.45 ? 1 : 0).toString())
    b.current.style.setProperty('--k', pulse(t, 12.72, 0.05).toFixed(3))
    b.current.style.setProperty('--on', (t > 12.7 ? 1 : 0).toString())
  })
  return (
    <div className="taps" aria-hidden="true">
      <i ref={a} />
      <i ref={b} />
    </div>
  )
}

/*
  The spoken line rides the waveform: words arrive as the wave front passes under them.
  Once it's understood, the same line becomes the transcript — then it's saved.
*/
function Spoken() {
  const el = useRef()
  const note = useRef()
  const saved = useRef()
  useFrameDom((S, t) => {
    const e = el.current
    const p = smooth(range(t, 12.95, 13.85))
    const out = smooth(range(t, 14.85, 15.15))
    e.style.setProperty('--p', p.toFixed(4))
    e.style.opacity = ((p > 0 ? 1 : 0) * (1 - out)).toFixed(3)
    e.style.visibility = p > 0 && out < 1 ? 'visible' : 'hidden'
    note.current.style.opacity = smooth(range(t, 13.9, 14.1)).toFixed(3)
    saved.current.style.opacity = smooth(range(t, 14.28, 14.42)).toFixed(3)
  })
  return (
    <div ref={el} className="spoken">
      <span className="spoken-q">
        <Words text={`“${UTTERANCE}”`} />
      </span>
      <span className="spoken-meta">
        <span className="eyebrow" ref={note}>
          Transcribed on your iPhone
        </span>
        <span className="saved" ref={saved}>
          <i />
          <span className="eyebrow">Saved as a note</span>
        </span>
      </span>
    </div>
  )
}

// 04 · Double tap to speak → speak → understood → a tap only you can feel.
export function VoiceScene() {
  return (
    <>
      <Beat at={[11.85, 12.2, 12.9, 13.1]} className="full a-bottom">
        <div className="block center">
          <Taps />
          <h2 className="headline">
            <Ln>Double tap to speak.</Ln>
          </h2>
          <p className="lede center">Mid run, mid meal, mid thought. Say it before the moment goes away.</p>
        </div>
      </Beat>
      <Spoken />
      <Beat at={[14.35, 14.65, 15.1, 15.4]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Feel what it knows.</Ln>
          </h2>
          <p className="lede center">A gentle tap only you can feel.</p>
        </div>
      </Beat>
    </>
  )
}
