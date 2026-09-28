import { Opening } from './scenes/Opening'
import { Reveal } from './scenes/Reveal'
import { OnWrist } from './scenes/OnWrist'
import { Context } from './scenes/Context'
import { Voice } from './scenes/Voice'
import { Health } from './scenes/Health'
import { Privacy } from './scenes/Privacy'
import { Finale } from './scenes/Finale'

// Every piece of typography in the film. A fixed layer above the canvas; nothing here scrolls.
export function Overlay() {
  return (
    <div className="front">
      <Opening />
      <Reveal />
      <OnWrist />
      <Context />
      <Voice />
      <Health />
      <Privacy />
      <Finale />
    </div>
  )
}
