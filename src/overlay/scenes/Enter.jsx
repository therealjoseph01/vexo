import { Beat, Ln, Tag, fromAnchor } from '../primitives'
import { ORBITS, orbitPoint } from '../../gl/Signals'
import { READINGS } from '../../config'
import { env } from '../../film/timeline'
import { film } from '../../film/store'

const VALUES = {
  hr: (S) => `${S.hrLive} bpm`,
  hrv: () => `${READINGS.hrv} ms`,
  spo2: () => `${READINGS.spo2}%`,
  resp: () => `${READINGS.resp} /min`,
  temp: () => READINGS.temp,
  sleep: () => READINGS.sleep,
  motion: () => {
    const v = Math.max(-1, Math.min(1, film.vel * 0.35))
    return `${(0.02 + v * 0.1).toFixed(2)} ${(0.1 + v).toFixed(2)} ${(0.99 - Math.abs(v) * 0.2).toFixed(2)} g`
  },
}

// 02 · Enter the ring — the sensors wake, then every signal joins the orbit.
export function Enter() {
  return (
    <>
      <Beat at={[3.95, 4.3, 5.35, 5.75]} className="full a-top-left">
        <div className="eyebrow">The side that touches your skin</div>
      </Beat>
      <Tag
        at={[4.5, 4.72, 5.45, 5.8]}
        anchor={fromAnchor('ledG')}
        dx={[150, 40]}
        dy={[-110, -120]}
        k="Heart rate"
        className="tag-green"
        live={(S) => `${S.hrLive} bpm`}
      />
      <Tag at={[5.0, 5.22, 5.45, 5.8]} anchor={fromAnchor('ledR')} dx={[210, 40]} dy={[70, 70]} k="Blood oxygen" className="tag-red" value={`${READINGS.spo2}%`} />

      <Beat at={[6.0, 6.45, 7.95, 8.3]} className="full a-top-left">
        <div className="block">
          <h2 className="headline">
            <Ln>The signals</Ln>
            <Ln i={1}>that matter.</Ln>
          </h2>
          <p className="lede">Measured every second, so nothing about you goes unnoticed.</p>
        </div>
      </Beat>

      {ORBITS.map((o, i) => (
        <Tag
          key={o.key}
          at={(t, S) => {
            const p = S.sig[o.key]
            if (p <= 0) return 0
            const drawing = p < 1 ? 1 : 0.62
            return Math.min(1, p * 5) * drawing * env(t, 5.75, 5.95, 8.05, 8.4)
          }}
          anchor={(out) => orbitPoint(i, out)}
          dx={[64, 18]}
          dy={[-10, -10]}
          col={[0.755, 0.06]}
          row={[null, 0.6 + i * 0.047]}
          leader={[true, false]}
          k={o.label}
          className={`tag-orbit tag-${o.key}`}
          live={VALUES[o.key]}
        />
      ))}
    </>
  )
}
