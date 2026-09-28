# Vexo Ring: an interactive unveiling

A scroll-driven product film for the Vexo Ring, built in React.

Scroll is the playhead. Scrolling back rewinds it. The ring is one real-time 3D object that carries the camera through
ten scenes:

> ring → sensors → body → data → voice → apps → Vexo Studio → the body as an API → privacy → five days → the ring

`STORYBOARD.md` has the full scene breakdown, the research, and the source for every product claim.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build → dist/  (Vercel config included)
npm run build:single   # one self-contained HTML file → preview/index.html
```

`preview/index.html` is already built. Open it directly in a browser to watch the film without installing anything.

## How it's built

| Layer | What it does |
|---|---|
| `src/film/timeline.js` | Scenes and story time. **PACE** zones slow the key moments. Monotone cubic tracks give continuous velocity with no overshoot, so moves don't stop and start at every keyframe. |
| `src/film/director.js` | The script. Every value (camera, ring pose, lights, per-scene cues) is a pure function of story time `t`. |
| `src/gl/Stage.jsx` | One R3F canvas. Camera and ring follow the director through critically damped springs, which gives the ring weight. Also runs adaptive DPR and parallel shader compilation. |
| `src/gl/ringGeometry.js`, `Ring.jsx` | The ring, modelled from Vexo's render: a crowned titanium band, stepped inner lip, mic port with bezel and grille, sensor pill with green and red LEDs, and VΞXO engraved inside. |
| `src/gl/studio.js` | The metal shader. The environment is analytic: six rounded softboxes evaluated along the reflection vector, so lights can move every frame at no cost. Also handles thermal, tap-ripple, haptic and LED-spill effects. |
| `src/gl/LineField.js` | The film's line engine. Screen-space anti-aliased ribbons, one draw call per field. Static shapes come from a float texture. Orbits, waves and Béziers are evaluated in the vertex shader. |
| `src/gl/bodyContours.js` | A signed-distance body sliced into contour loops with marching squares at start-up (about 100 ms). |
| `src/overlay/*` | All typography is DOM. Labels are projected from 3D anchors every frame, so text stays crisp and readable by screen readers. The Studio app is DOM + CSS 3D. |
| `src/Coda.jsx` | After the film: official photography, specs, the demo film (loads on click), women's health, footer. |
| `src/Fallback.jsx` | A static typographic version for devices without WebGL2. |

React never re-renders from scroll. Everything reads a mutable store once per frame.

## Performance and accessibility

- **No downloads for the film itself.** Engraving, grille and dock print are drawn on canvas. Photography lazy-loads in the coda.
- **Adaptive pixel ratio.** It starts at 1.75 on desktop and 1.5 on mobile, and a frame-time monitor steps it down on slow devices.
- **Mobile has its own layout.** Every camera and ring keyframe has a portrait variant, with lighter geometry and particle counts.
- **`prefers-reduced-motion`.** Wheel inertia is off, idle motion and the haptic tremor are frozen, and the springs snap.
- **Keyboard and screen-reader access.** There's a skip link, a keyboard scene index, a live region for the current scene, and every headline is real text.

## Content and links

`src/config.js` holds all links, readings and apps.

- **Links:** `SITE` is set to `https://www.vexoai.com`. Set it to `''` if this ships on vexoai.com itself.
- **Calls to action:**
  - Primary: the Vexo Ring app on the App Store.
  - Secondary: the live `/waitlist`. Set `SHOW_WAITLIST = false` to remove it.
  - There is no Ring checkout; the current `/checkout` sells Vexo Band.
- **Finishes** (Silver, Gold, Graphite) match Vexo's own photography.

## QA

Add `~d` to the hash to get a debug overlay, e.g. `#t12.4~d`. `#t12.4` on its own deep-links to a moment.

| Key | Action |
|---|---|
| `1`–`0` | Jump to a scene |
| `,` `.` | Previous / next checkpoint |
| `[` `]` | Step ±0.25 |
| `f` | Cycle finish |
| `c` | Go to the coda |

`~xb`, `~xs`, `~xv`, `~xr`, `~xd`, `~xk` turn off the body, signals, voice, ring, dust or dock, for bisecting.
