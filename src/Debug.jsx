import { useEffect, useRef } from 'react'
import { film } from './film/store'
import { S } from './film/director'
import { SCENES } from './film/timeline'
import { handAsset } from './gl/handMesh'

// QA overlay: add ~d to the hash (e.g. #t12.4~d) or ?debug to the URL.
export const DEBUG = typeof window !== 'undefined' && (/~d/.test(window.location.hash) || /[?&]debug\b/.test(window.location.search))
const log = []
const CHECK = [0.2, 0.9, 1.6, 2.1, 2.9, 3.4, 4.0, 4.75, 5.4, 6.8, 7.8, 8.6, 9.2, 9.6, 10.1, 10.8, 11.4, 12.3, 13.3, 14.4, 15.3, 16.6, 17.7, 18.3, 19.3, 20.4, 21.0, 22.0, 22.9, 24.6, 25.4, 26.1, 26.8, 28.2, 29.0, 29.8, 30.4, 31.6, 32.1, 32.8, 33.5, 34.4]
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
    // keys: 1–9 jump to scenes · [ ] step ∓0.25 · { } step ∓1 · f cycles finish
    const onKey = (e) => {
      film.snap = true
      const n = '1234567890'.indexOf(e.key)
      if (n >= 0) film.jump(SCENES[n].jump)
      if (e.key === '[') film.jump(film.t - 0.25)
      if (e.key === ']') film.jump(film.t + 0.25)
      if (e.key === '{') film.jump(film.t - 1)
      if (e.key === '}') film.jump(film.t + 1)
      if (e.key === 'c') film.lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true })
      if (e.key === 'f') film.finish = { graphite: 'pearl', pearl: 'moss', moss: 'graphite' }[film.finish]
      // , and . step through QA checkpoints
      if (e.key === '.' || e.key === ',') {
        const i = CHECK.findIndex((c) => c > film.t + 0.01)
        const cur = i < 0 ? CHECK.length : i
        const n = e.key === '.' ? Math.min(CHECK.length - 1, cur) : Math.max(0, cur - 2)
        film.jump(CHECK[n])
      }
    }
    window.addEventListener('keydown', onKey)
    // QA in embedded frames (where keys may not arrive): click the right edge for the next checkpoint, the left edge for the previous
    const onDown = (e) => {
      const x = e.clientX / window.innerWidth
      if (x > 0.2 && x < 0.8) return
      onKey({ key: x >= 0.8 ? '.' : ',' })
    }
    window.addEventListener('pointerdown', onDown)
    // QA tour: #t0~d~tour3 steps through every checkpoint, one every 3 s (starting from the #t moment)
    const tm = window.location.hash.match(/~tour(\d+(?:\.\d+)?)/)
    let tour
    if (tm) {
      const every = parseFloat(tm[1]) * 1000
      let last = 0
      tour = setInterval(() => {
        if (!film.ready) return
        const now = performance.now()
        if (!last) last = now
        if (now - last < every) return
        last = now
        onKey({ key: '.' })
      }, 200)
    }
    let raf
    let last = performance.now()
    let fps = 60
    const loop = (now) => {
      fps += (1000 / Math.max(1, now - last) - fps) * 0.05
      last = now
      if (el.current)
        el.current.textContent = [
          `t ${film.t.toFixed(3)}  hand ${(handAsset.progress * 100).toFixed(0)}%  fps ${fps.toFixed(0)}  q ${film.quality}  vel ${film.vel.toFixed(2)}  ready ${film.readyAt ? (film.readyAt / 1000).toFixed(2) + 's' : '…'}  marks ${Object.entries(film.marks).map(([k, v]) => k + ' ' + (v / 1000).toFixed(2)).join(' · ')}`,
          `cam ${S.cam.toArray().map((x) => x.toFixed(2))} tgt ${S.tgt.toArray().map((x) => x.toFixed(2))} az ${S.camAz.toFixed(2)}  band rx ${S.float.rx.toFixed(2)} ry ${S.float.ry.toFixed(2)}  worn k ${S.worn.k.toFixed(2)} slide ${S.worn.slide.toFixed(2)} cinch ${S.worn.cinch.toFixed(3)}  explode ${S.band.explode.toFixed(2)}`,
          `light env ${S.light.env.toFixed(2)} key ${S.light.key.toFixed(2)} rim ${S.light.rim.toFixed(2)} spot ${S.light.spot.toFixed(2)}  arm a ${S.arm.alpha.toFixed(2)} solid ${S.arm.solid.toFixed(2)}  mic ${S.pts.mic ? S.pts.mic.toArray().map((x) => x.toFixed(2)) : '-'}`,
          ...log,
        ].join('\n')
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      clearInterval(tour)
    }
  }, [])
  if (!DEBUG) return null
  return <pre ref={el} style={{ position: 'fixed', left: 8, bottom: 70, zIndex: 99, margin: 0, font: '9px/1.3 monospace', color: '#9f9', background: 'rgba(0,0,0,.5)', padding: 4, maxWidth: '46vw', maxHeight: '18vh', overflow: 'hidden', whiteSpace: 'pre-wrap', pointerEvents: 'none' }} />
}
