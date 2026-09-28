import { useRef } from 'react'
import { Beat, Ln, Pin, Words, useFrameDom } from '../primitives'
import { range, smooth } from '../../film/timeline'
import { layout } from '../../film/director'
import { talkPoint, memPoint, actPoint } from '../../gl/storyLayout'
import { DAY, CONNECTORS_AVAILABLE, CONNECTORS_TOTAL } from '../../config'

/*
  04 · Every AI today waits for a prompt. Vexo already has the context.
  05 · …and acts on it: REAL WORLD → VEXO → MEMORY → ACTION.
  Illustrative day; what Vexo does with it follows YC's own description, "booking the table, sending the
  follow-up, and ordering the groceries through the apps you already use".
*/
const CRUMBS = ['Real world', 'Vexo', 'Memory', 'Action']

function Crumbs() {
  const el = useRef()
  const last = useRef(-1)
  useFrameDom((S) => {
    const c = S.ctx.crumb
    if (c !== last.current) {
      last.current = c
      el.current.dataset.step = String(c)
    }
  })
  return (
    <Beat at={[11.95, 12.25, 19.35, 19.7]} className="full a-top">
      <ol className="crumbs mono" ref={el} data-step="0" aria-label="Real world, Vexo, memory, action">
        {CRUMBS.map((c, i) => (
          <li key={c} style={{ '--i': i }}>
            {c}
          </li>
        ))}
      </ol>
    </Beat>
  )
}

// what was said, riding its waveform (words arrive as the wave passes)
function Heard({ i }) {
  const d = DAY[i]
  return (
    <Pin
      anchor={(out) => talkPoint(i, out)}
      at={(t, S) => smooth(range(S.ctx.draw[i], 0, 0.25)) * (1 - smooth(range(S.ctx.fold[i], 0.2, 0.8)))}
      dx={[-6, 0]}
      dy={[-44, -46]}
      align={['left', 'center']}
      className="heard"
      onFrame={(e, o, S) => e.style.setProperty('--p', S.ctx.draw[i].toFixed(3))}
    >
      <span className="heard-q">
        <Words text={`“${d.heard}”`} />
      </span>
    </Pin>
  )
}

function Memory({ i }) {
  const d = DAY[i]
  return (
    <Pin
      anchor={(out) => memPoint(i, out)}
      at={(t, S) => S.ctx.mem[i] * (1 - (layout.mobile ? 1 : 0.55) * S.ctx.act[i])}
      dx={[14, 0]}
      dy={[-14, -12]}
      align={['left', 'center']}
      className="mem"
    >
      <i className="mem-dot" />
      <span className="mem-k mono">Memory</span>
      <span className="mem-t">{d.memory}</span>
    </Pin>
  )
}

function Action({ i }) {
  const d = DAY[i]
  return (
    <Pin
      anchor={(out) => actPoint(i, out)}
      at={(t, S) => S.ctx.act[i]}
      dx={[14, 0]}
      dy={[-18, 14]}
      align={['left', 'center']}
      className="act"
    >
      <span className="act-k mono">{d.via}</span>
      <span className="act-t">
        <i className="act-ok" aria-hidden="true" />
        {d.action}
        {d.detail && <span className="act-d"> · {d.detail}</span>}
      </span>
    </Pin>
  )
}

export function Context() {
  return (
    <>
      <Beat at={[11.3, 11.55, 11.95, 12.2]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Every AI today waits for a prompt.</Ln>
          </h2>
        </div>
      </Beat>

      <Crumbs />
      {DAY.map((_, i) => (
        <Heard key={`h${i}`} i={i} />
      ))}
      {DAY.map((_, i) => (
        <Memory key={`m${i}`} i={i} />
      ))}

      <Beat at={[14.95, 15.25, 15.75, 16.0]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Vexo already has the context.</Ln>
          </h2>
          <p className="lede center">It turns what it hears into private memories.</p>
        </div>
      </Beat>

      {/* 05 */}
      {DAY.map((_, i) => (
        <Action key={`a${i}`} i={i} />
      ))}
      <Beat at={[16.1, 16.4, 17.55, 17.85]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>Acts before you ask.</Ln>
          </h2>
          <p className="lede center">Through the apps you already use.</p>
        </div>
      </Beat>
      <Beat at={[17.95, 18.1, 18.6, 18.85]} className="full a-bottom">
        <div className="block center">
          <span className="eyebrow">Quiet haptics</span>
          <p className="lede center big">A gentle tap, just for you.</p>
        </div>
      </Beat>
      <Beat at={[18.8, 19.05, 19.5, 19.8]} className="full a-bottom">
        <div className="block center">
          <h2 className="headline">
            <Ln>
              Your world. <em>Working together.</em>
            </Ln>
          </h2>
          <ul className="conn mono" aria-label="Available connectors">
            {CONNECTORS_AVAILABLE.map((c) => (
              <li key={c}>{c}</li>
            ))}
            <li className="dim">{CONNECTORS_TOTAL - CONNECTORS_AVAILABLE.length} more coming soon</li>
          </ul>
        </div>
      </Beat>
    </>
  )
}
