import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { film } from './film/store'
import { SCROLL_TOTAL, TOTAL, warp, unwarp, clamp } from './film/timeline'
import { Stage } from './gl/Stage'
import { Backdrop } from './overlay/Backdrop'
import { Overlay } from './overlay/Overlay'
import { Chrome } from './overlay/Chrome'
import { Coda } from './Coda'
import { Fallback } from './Fallback'
import { Debug } from './Debug'

function hasWebGL2() {
  film.marks.probe0 = performance.now()
  try {
    // cheap probe: ask for WebGL2 support without spinning up a real context on the discrete GPU
    const ok = typeof WebGL2RenderingContext !== 'undefined'
    film.marks.probe1 = performance.now()
    return ok
  } catch (e) {
    return false
  }
}

function useFilm(enabled) {
  const [vh, setVh] = useState(film.vh)
  useEffect(() => {
    if (!enabled) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    film.reduced = reduced
    film.finePointer = window.matchMedia('(pointer: fine)').matches
    const lenis = new Lenis({ lerp: reduced ? 1 : 0.085, smoothWheel: !reduced, wheelMultiplier: 0.8, touchMultiplier: 1 })
    film.lenis = lenis
    let raf
    let lastT = 0
    let lastNow = performance.now()
    const loop = (now) => {
      lenis.raf(now)
      const y = lenis.animatedScroll ?? window.scrollY
      const t = warp(y / film.vh)
      const dt = Math.max(0.001, (now - lastNow) / 1000)
      const v = (t - lastT) / dt
      film.vel += (v - film.vel) * (1 - Math.exp(-dt * 8))
      film.t = t
      lastT = t
      lastNow = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onMove = (e) => {
      if (!film.finePointer) return
      film.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      film.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    // Re-measure only on real resizes, not on mobile toolbar show/hide.
    let lastW = window.innerWidth
    const onResize = () => {
      const h = window.innerHeight
      if (window.innerWidth !== lastW || Math.abs(h - film.vh) > 140) {
        lastW = window.innerWidth
        film.vw = window.innerWidth
        film.vh = h
        setVh(h)
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('resize', onResize)

    // deep link / QA: ?t=12.4 or #t12.4 starts the film at that moment
    film.jump = (t0) => lenis.scrollTo(unwarp(clamp(t0, 0, TOTAL)) * film.vh, { immediate: true, force: true })
    const fromUrl = () => {
      const q = new URLSearchParams(window.location.search)
      const h = window.location.hash.match(/^#t(\d+(?:\.\d+)?)/)
      const v = h ? h[1] : q.get('t')
      if (v != null) requestAnimationFrame(() => film.jump(parseFloat(v) || 0))
    }
    fromUrl()
    window.addEventListener('hashchange', fromUrl)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('hashchange', fromUrl)
    }
  }, [enabled])
  return vh
}

export default function App() {
  const [gl] = useState(() => typeof window === 'undefined' || hasWebGL2())
  const [ready, setReady] = useState(false)
  const vh = useFilm(gl)

  useEffect(() => {
    if (ready) document.documentElement.classList.add('is-ready')
  }, [ready])

  if (!gl) return <Fallback />

  return (
    <>
      <a className="skip" href="#after">
        Skip the film
      </a>
      <Backdrop />
      <Stage
        onReady={() => {
          film.readyAt = performance.now()
          setReady(true)
        }}
      />
      <Overlay />
      <Chrome />
      <Debug />
      <div className={`loader ${ready ? 'done' : ''}`} aria-hidden="true">
        <svg viewBox="0 0 120 120" className="loader-ring">
          <circle cx="60" cy="60" r="44" />
        </svg>
      </div>
      <div className="film-spacer" style={{ height: (SCROLL_TOTAL + 1) * vh }} />
      <Coda />
    </>
  )
}
