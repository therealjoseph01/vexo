import { Beat } from '../primitives'

// 01 · Already on it — the site's own opening line, after the light has found the band.
export function Opening() {
  // the raking light that crossed the weave crosses the letters too
  const sweep = (el, o, S, t) => {
    const k = Math.min(1, Math.max(0, (t - 1.9) / 1.3))
    el.style.setProperty('--sweep', `${(-10 + k * 120).toFixed(1)}%`)
  }
  return (
    <>
      <Beat at={[-1, -1, 0.05, 0.3]} className="full a-bottom">
        <div className="cue">
          <span className="mono">Scroll</span>
          <i />
        </div>
      </Beat>
      <Beat at={[2.35, 2.9, 3.35, 3.75]} className="full a-lower" onFrame={sweep}>
        <h1 className="display metal">Already on it.</h1>
      </Beat>
      <Beat at={[2.7, 3.05, 3.35, 3.75]} className="full a-lower sub">
        <p className="lede">Your AI. On your wrist.</p>
      </Beat>
    </>
  )
}
