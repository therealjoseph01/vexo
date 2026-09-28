import { Beat, Ln, Tag, fromBand } from '../primitives'
import { DETAILS } from '../../config'

/*
  02 · Woven comfort — the band turns in the light; then Vexo's own model opens along the
  module's axis, and each layer is named with the site's "Band, in detail".
*/
const D = Object.fromEntries(DETAILS)

export function Reveal() {
  return (
    <>
      <Tag at={[3.75, 4.0, 4.15, 4.35]} anchor={fromBand('weaveR')} dx={[60, 24]} dy={[-70, -80]} side="left" k="Woven wrap" title="One continuous loop" />
      <Tag at={[3.9, 4.1, 4.15, 4.35]} anchor={fromBand('closure')} dx={[90, 30]} dy={[-90, 70]} k="Loop closure" title="Titanium, engraved" />

      <Tag at={[4.7, 4.85, 5.05, 5.2]} anchor={fromBand('mic')} dx={[110, 30]} dy={[-64, -96]} k="Built-in microphone" title={D['Built-in microphone']} />
      <Tag at={[5.3, 5.45, 5.6, 5.8]} anchor={fromBand('sensor')} dx={[120, 30]} dy={[-70, -110]} className="tag-green" k="Health sensors" title="Beneath, against your skin" />

      {/* inside the module */}
      <Beat at={[5.95, 6.25, 7.1, 7.35]} className="full a-top-left">
        <div className="block">
          <span className="eyebrow">Band, in detail</span>
        </div>
      </Beat>
      <Tag at={[6.3, 6.5, 7.05, 7.3]} anchor={fromBand('mic')} dx={[-60, -20]} dy={[-86, -80]} side="left" k="Built-in microphone" title={D['Built-in microphone']} />
      <Tag at={[6.4, 6.6, 7.05, 7.3]} anchor={fromBand('skin')} dx={[90, 26]} dy={[-96, -120]} className="tag-green" k="Health sensing" title={D['Health sensing']} />
      <Tag at={[6.5, 6.7, 7.05, 7.3]} anchor={fromBand('motor')} dx={[-70, -24]} dy={[80, 70]} side="left" k="Quiet haptics" title={D['Quiet haptics']} />
      <Tag at={[6.6, 6.8, 7.05, 7.3]} anchor={fromBand('antenna')} dx={[80, 24]} dy={[70, 110]} k="Bluetooth LE" title={D['Bluetooth LE']} />
      <Tag at={[6.7, 6.9, 7.05, 7.3]} anchor={fromBand('pcb')} dx={[40, 20]} dy={[150, 170]} k="Onboard memory" title={D['Onboard memory']} />

      <Beat at={[7.55, 7.85, 8.25, 8.5]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Woven comfort.</Ln>
            <Ln i={1}>Thoughtfully connected.</Ln>
          </h2>
        </div>
      </Beat>
    </>
  )
}
