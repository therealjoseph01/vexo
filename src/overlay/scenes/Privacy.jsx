import { Beat, Ln, Pin } from '../primitives'
import { framePoint, layout } from '../../film/director'
import { smooth, range } from '../../film/timeline'
import { DAY } from '../../config'

/*
  08 · Private by design. Conversations all around the wearer — then every waveform dissolves,
  and only the structured memories remain. One is deleted, because you can.
  The words are YC's: "Vexo never keeps your audio. Only you can see your memories, and you can delete them anytime."
*/
const SPOTS = [
  [1.55, 0.95, 0, -1.9],
  [1.85, 0.05, 0, -2.55],
  [1.55, -0.85, 0, -3.2],
]

function Kept({ i }) {
  const d = DAY[i]
  const last = i === 2
  return (
    <Pin
      anchor={(out) => {
        const s = SPOTS[i]
        framePoint('priv', layout.mobile ? s[2] : s[0], layout.mobile ? s[3] : s[1], out)
      }}
      at={(t, S) => smooth(range(S.priv.remain, i * 0.15, 0.55 + i * 0.15)) * (last ? 1 - smooth(range(S.priv.del, 0.55, 1)) : 1)}
      dx={[12, 0]}
      dy={[-12, -12]}
      align={['left', 'center']}
      className={`mem kept ${last ? 'del' : ''}`}
      onFrame={last ? (e, o, S) => e.style.setProperty('--del', S.priv.del.toFixed(3)) : undefined}
    >
      <i className="mem-dot" />
      <span className="mem-k mono">{last ? 'Memory · deleted' : 'Memory'}</span>
      <span className="mem-t">{d.memory}</span>
    </Pin>
  )
}

export function Privacy() {
  return (
    <>
      <Beat at={[27.7, 28.0, 28.7, 28.95]} className="full a-top">
        <span className="eyebrow">Private by design</span>
      </Beat>
      <Beat at={[28.95, 29.3, 30.65, 31.0]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Vexo never keeps your audio.</Ln>
          </h2>
          <p className="lede center priv-2">Only you can see your memories, and you can delete them anytime.</p>
        </div>
      </Beat>
      {DAY.map((_, i) => (
        <Kept key={i} i={i} />
      ))}
    </>
  )
}
