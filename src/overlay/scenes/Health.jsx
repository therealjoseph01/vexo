import { useRef } from 'react'
import { Beat, Ln, Pin, fromBand, useFrameDom } from '../primitives'
import { film } from '../../film/store'
import { range, smooth } from '../../film/timeline'

/*
  07 · In tune with you. — the sensor window, seen from beneath the wrist.
  Only the three signals Vexo claims for the band: heart rate, skin temperature and motion.
  The traces are drawn live (heart rate from the beat, motion from your own scroll); no numbers
  are shown, because the site publishes none.
*/
const N = 64
const ppg = (x) => {
  const p = x - Math.floor(x)
  return Math.exp(-(((p - 0.14) / 0.05) ** 2)) + 0.32 * Math.exp(-(((p - 0.36) / 0.075) ** 2))
}

function Trace({ kind }) {
  const path = useRef()
  const buf = useRef(new Float32Array(N))
  const acc = useRef(0)
  useFrameDom((S, t) => {
    if (S.health.a < 0.002) return
    const b = buf.current
    const time = film.time
    let v
    if (kind === 'hr') {
      // the whole window scrolls with time: ~62 beats a minute
      for (let i = 0; i < N; i++) b[i] = ppg(time * (62 / 60) - (N - 1 - i) * 0.035)
    } else if (kind === 'temp') {
      for (let i = 0; i < N; i++) {
        const x = time * 0.12 - (N - 1 - i) * 0.02
        b[i] = 0.5 + 0.22 * Math.sin(x * 6.28) + 0.08 * Math.sin(x * 17)
      }
    } else {
      // motion: your scroll is the movement
      acc.current += 1
      v = Math.min(1, Math.abs(film.vel) * 0.9)
      if (acc.current % 2 === 0) {
        b.copyWithin(0, 1)
        b[N - 1] = 0.5 + (Math.random() - 0.5) * v * 0.9
      }
    }
    let d = ''
    for (let i = 0; i < N; i++) d += `${i ? 'L' : 'M'}${((i / (N - 1)) * 120).toFixed(1)} ${(26 - (kind === 'hr' ? b[i] * 20 : b[i] * 26 - 0)).toFixed(1)}`
    path.current.setAttribute('d', d)
  })
  return (
    <svg className={`trace trace-${kind}`} viewBox="0 0 120 28" aria-hidden="true">
      <path ref={path} />
    </svg>
  )
}

function Signal({ kind, k, title, at, dx, dy, align }) {
  return (
    <Pin anchor={fromBand('sensor')} at={at} dx={dx} dy={dy} align={align} className={`sig sig-${kind}`}>
      <span className="sig-k mono">{k}</span>
      <Trace kind={kind} />
      {title && <span className="sig-t">{title}</span>}
    </Pin>
  )
}

export function Health() {
  const H = (key) => (t, S) => smooth(range(S.health[key], 0, 1)) * S.health.a
  return (
    <>
      <Beat at={[23.95, 24.25, 24.75, 25.0]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>In tune with you.</Ln>
          </h2>
          <p className="lede center">Health sensors, beneath.</p>
        </div>
      </Beat>
      <Signal kind="hr" k="Heart rate" at={H('hr')} dx={[-150, 0]} dy={[-150, -210]} align={['right', 'center']} />
      <Signal kind="temp" k="Skin temperature" at={H('temp')} dx={[150, 0]} dy={[-110, -130]} align={['left', 'center']} />
      <Signal kind="motion" k="Motion" title="Scroll, and it moves with you" at={H('motion')} dx={[-120, 0]} dy={[90, 120]} align={['right', 'center']} />
      <Beat at={[26.3, 26.6, 27.15, 27.45]} className="full a-bottom">
        <div className="block center">
          <span className="eyebrow">Health sensing</span>
          <p className="lede center big">Heart rate, skin temperature and motion.</p>
        </div>
      </Beat>
    </>
  )
}
