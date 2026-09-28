import { Beat } from '../primitives'
import { ENV } from '../../gl/studio'

// 01 · Your sixth sense — and, at the end, the same words again (Scene 10 reuses the treatment).
export function Sense() {
  // the same light that travels around the ring travels across the letters
  const sweep = (el) => {
    const d = ENV.uBoxDir.value[0]
    const a = Math.atan2(d.x, d.z) // -π..π
    el.style.setProperty('--sweep', `${(50 + (a / Math.PI) * 90).toFixed(1)}%`)
  }
  return (
    <>
      <Beat at={[-1, -1, 0.05, 0.3]} className="full a-bottom">
        <div className="cue">
          <span className="mono">Scroll</span>
          <i />
        </div>
      </Beat>
      <Beat at={[1.2, 1.85, 2.75, 3.2]} className="full a-lower" onFrame={sweep}>
        <h1 className="display metal">
          Your <em>sixth</em> sense
        </h1>
      </Beat>
      <Beat at={[1.85, 2.25, 2.75, 3.2]} className="full a-lower sub">
        <p className="lede">Listens, remembers and acts before you ask.</p>
      </Beat>
    </>
  )
}
