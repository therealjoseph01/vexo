import { useEffect, useRef } from 'react'
import { film } from './film/store'
import { S } from './film/director'
import { ENV } from './gl/studio'
import { SCENES } from './film/timeline'

// QA overlay: add ~d to the hash (e.g. #t12.4~d) or ?debug to the URL.
export const DEBUG = typeof window !== 'undefined' && (/~d/.test(window.location.hash) || /[?&]debug\b/.test(window.location.search))
const log = []
const CHECK = [0.6, 1.9, 2.9, 4.7, 5.35, 6.8, 7.9, 8.9, 9.6, 10.5, 12.1, 12.55, 13.5, 14.45, 15.3, 15.9, 16.8, 17.6, 18.4, 19.5, 20.4, 21.1, 21.8, 22.6, 23.6, 24.6, 25.8, 27.7, 28.9, 29.8, 31.1, 32.2, 33.2, 33.9, 34.6, 35.4, 36.5]
if (DEBUG) {
  const push = (kind, args) => {
    log.push(`${kind}: ${[...args].map((a) => (a && a.message) || String(a)).join(' ').slice(0, 600)}`)
    if (log.length > 12) log.shift()
  }
  const ce = console.error.bind(console)
  const cw = console.warn.bind(console)
  console.error = (...a) => {
    push('E', a)
    ce(...a)
  }
  console.warn = (...a) => {
    push('W', a)
    cw(...a)
  }
  window.addEventListener('error', (e) => push('X', [e.message + ' @' + (e.filename || '').slice(-30) + ':' + e.lineno]))
  window.addEventListener('unhandledrejection', (e) => push('P', [e.reason]))
}

export function Debug() {
  const el = useRef()
  useEffect(() => {
    if (!DEBUG) return
    // keys: 1–9,0 jump to scenes · [ ] step ∓0.25 · { } step ∓1 · f cycles finish
    const onKey = (e) => {
      film.snap = true
      const n = '1234567890'.indexOf(e.key)
      if (n >= 0) film.jump(SCENES[n].jump)
      if (e.key === '[') film.jump(film.t - 0.25)
      if (e.key === ']') film.jump(film.t + 0.25)
      if (e.key === '{') film.jump(film.t - 1)
      if (e.key === '}') film.jump(film.t + 1)
      if (e.key === 'c') film.lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true })
      if (e.key === 'f') film.finish = { silver: 'gold', gold: 'graphite', graphite: 'silver' }[film.finish]
      // , and . step through QA checkpoints
      if (e.key === '.' || e.key === ',') {
        const i = CHECK.findIndex((c) => c > film.t + 0.01)
        const cur = i < 0 ? CHECK.length : i
        const n = e.key === '.' ? Math.min(CHECK.length - 1, cur) : Math.max(0, cur - 2)
        film.jump(CHECK[n])
      }
    }
    window.addEventListener('keydown', onKey)
    let raf
    let last = performance.now()
    let fps = 60
    const loop = (now) => {
      fps += (1000 / Math.max(1, now - last) - fps) * 0.05
      last = now
      if (el.current)
        el.current.textContent = [
          `t ${film.t.toFixed(3)}  fps ${fps.toFixed(0)}  q ${film.quality}  vel ${film.vel.toFixed(2)}  ready ${film.readyAt ? (film.readyAt / 1000).toFixed(2) + 's' : '…'}  marks ${Object.entries(film.marks).map(([k, v]) => k + ' ' + (v / 1000).toFixed(2)).join(' · ')}`,
          `cam ${S.cam.x.toFixed(2)} ${S.cam.y.toFixed(2)} ${S.cam.z.toFixed(2)}  ring rx ${S.ring.rx.toFixed(2)} ry ${S.ring.ry.toFixed(2)} rz ${S.ring.rz.toFixed(2)} s ${S.ring.scale.toFixed(2)} pos ${S.ring.pos.toArray().map((x) => x.toFixed(2))}`,
          `box0 ${ENV.uBoxCol.value[0].r.toFixed(2)} dir ${ENV.uBoxDir.value[0].toArray().map((x) => x.toFixed(2))}  key ${ENV.uBoxCol.value[1].r.toFixed(2)} rim ${ENV.uBoxCol.value[2].r.toFixed(2)}`,
          ...log,
        ].join('\n')
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  if (!DEBUG) return null
  return <pre ref={el} style={{ position: 'fixed', left: 8, top: 70, zIndex: 99, margin: 0, font: '11px/1.4 monospace', color: '#9f9', background: 'rgba(0,0,0,.6)', padding: 8, maxWidth: '70vw', whiteSpace: 'pre-wrap', pointerEvents: 'none' }} />
}
