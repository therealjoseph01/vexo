import { Beat, Ln } from '../primitives'

// 03 · On your wrist — once the loop has cinched and settled. The words are YC's.
export function OnWrist() {
  return (
    <>
      <Beat at={[8.35, 8.6, 9.05, 9.3]} className="full a-top">
        <span className="eyebrow">On your wrist</span>
      </Beat>
      <Beat at={[10.35, 10.65, 10.95, 11.2]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>No screen, and nothing to open.</Ln>
          </h2>
          <p className="lede center">A woven bracelet with a microphone and health sensors.</p>
        </div>
      </Beat>
    </>
  )
}
