import { Sense } from './scenes/Sense'
import { Enter } from './scenes/Enter'
import { BodyScene } from './scenes/BodyScene'
import { VoiceScene } from './scenes/VoiceScene'
import { AppsScene } from './scenes/AppsScene'
import { StudioScene } from './scenes/StudioScene'
import { ApiScene } from './scenes/ApiScene'
import { PrivacyScene } from './scenes/PrivacyScene'
import { DaysScene } from './scenes/DaysScene'
import { Finale } from './scenes/Finale'

// Every piece of typography in the film. A fixed layer above the canvas; nothing here scrolls.
export function Overlay() {
  return (
    <div className="front">
      <Sense />
      <Enter />
      <BodyScene />
      <VoiceScene />
      <AppsScene />
      <StudioScene />
      <ApiScene />
      <PrivacyScene />
      <DaysScene />
      <Finale />
    </div>
  )
}
