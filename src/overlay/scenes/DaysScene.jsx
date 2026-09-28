import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Beat, Ln, useFrameDom } from '../primitives'
import { DAY_R, dayAngle } from '../../gl/Days'
import { clamp, smooth } from '../../film/timeline'

function DayLabels() {
  const els = useRef([])
  const v = useMemo(() => new THREE.Vector3(), [])
  const q = useMemo(() => new THREE.Vector3(), [])
  useFrameDom((S, t, ctx) => {
    const D = S.days
    const vis = D.arc > 0.01
    const m = ctx.vw < 760
    const sc = m ? 0.82 : 1
    els.current.forEach((e, k) => {
      if (!vis) {
        e.style.visibility = 'hidden'
        return
      }
      const a = dayAngle(k)
      const r = (DAY_R + 0.62) * sc
      v.set(Math.cos(a) * r, Math.sin(a) * r, 0).applyQuaternion(ctx.camera.quaternion).add(S.ring.pos)
      const [x, y, ok] = ctx.project(v)
      const lit = smooth(clamp(D.day - k + 0.5))
      const cur = D.day >= k && D.day < k + 1 && D.charge <= 0
      e.style.visibility = ok ? 'visible' : 'hidden'
      e.style.opacity = (D.arc * (0.3 + 0.7 * lit) * (1 - D.charge * 0.7)).toFixed(3)
      e.classList.toggle('cur', cur)
      e.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
    })
    void q
  })
  return (
    <>
      {[1, 2, 3, 4, 5].map((d, k) => (
        <div key={d} className="day mono" ref={(n) => (els.current[k] = n)}>
          Day {d}
        </div>
      ))}
    </>
  )
}

// 09 · Five days — and how small the thing that did all of this is.
export function DaysScene() {
  return (
    <>
      <Beat at={[30.8, 31.0, 31.3, 31.55]} className="full a-lower">
        <div className="block center">
          <p className="grams">
            2.4 <span>grams</span>
          </p>
          <p className="eyebrow">Aerospace titanium</p>
        </div>
      </Beat>
      <Beat at={[31.6, 31.95, 33.0, 33.3]} className="full a-left days-head">
        <h2 className="headline">
          <Ln>Five days.</Ln>
          <Ln i={1}>One charge.</Ln>
        </h2>
      </Beat>
      <DayLabels />
      <Beat at={[33.3, 33.6, 34.15, 34.45]} className="full a-left days-head">
        <div className="block">
          <h2 className="headline">
            <Ln>An hour</Ln>
            <Ln i={1}>on the dock.</Ln>
          </h2>
          <p className="lede">Then it’s ready to go again.</p>
        </div>
      </Beat>
    </>
  )
}
