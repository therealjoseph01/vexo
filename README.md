# Vexo Band: an interactive unveiling

A scroll-driven product film for **Vexo Band**, built in React.

Scroll is the playhead, and scrolling back rewinds it. The band is rendered from Vexo's own 3D model, and it carries
every transition:

> woven fabric in the dark → the whole band → inside the module → onto a wrist → the day it hears → what it does →
> the microphone → the sensors → the audio disappears → off the wrist, back into the light

See [`STORYBOARD.md`](./STORYBOARD.md) for the scene plan and the source of every claim.

## Run

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build → dist/
npm run build:single   # one self-contained HTML file → preview/ (with models/, draco/, images/ beside it)
```

## How it's built

| | |
|---|---|
| `src/film/timeline.js` | Story time, the nine scenes, and PACE (slow-motion zones that give key moments more scroll). |
| `src/film/director.js` | The script. Every value (camera, band pose, arm pose, lights, per-scene cues) is a pure function of story time `t`. The band lives two lives, floating or worn, and `worn.k` blends them. While worn, the band stays put and the arm moves through it. |
| `src/gl/Stage.jsx` | The canvas. Critically damped springs give the camera, band and arm their weight, and an under-damped spring makes the cinch. It composes the band and arm matrices, runs the camera-relative light rig and the studio environment, and waits for the model before the film starts. |
| `src/gl/Band.jsx`, `bandAsset.js`, `bandSpec.js` | Vexo's GLB (Draco, woven normal/roughness maps, sheen) is loaded once. Its parts are grouped for the exploded view, and it handles the finishes (Graphite, Pearl, Moss) and the sensor LEDs. |
| `src/gl/handMesh.js`, `Wrist.jsx` | The wearer's forearm and hand is one smooth signed-distance surface (forearm, palm, fingers, thumb, nails), polygonised at load with surface nets. It uses a skin shader, arrives behind a line of light, and turns glassy for the sensor scene. |
| `src/gl/LineField.js`, `Story.jsx` | One draw call of screen-space hairlines: conversations as waveforms, memory → action paths, haptic ripples, the voice, and the privacy scene. |
| `src/overlay/*` | All typography is DOM, pinned to 3D points each frame, so it stays crisp and readable by screen readers. |
| `src/Coda.jsx`, `src/Fallback.jsx` | After the film comes official photography, "Band, in detail" and the footer. Without WebGL2, the same story is told as a photographic page. |

## Performance, accessibility, fallbacks

- The model is about 7 MB. A loader shows real progress, and every shader (including ones hidden until later) is compiled before the film starts.
- DPR is adaptive and steps down on slow devices. Internal parts render only in the exploded view.
- Mobile has its own camera and arm tracks (a portrait composition), and lighter geometry.
- `prefers-reduced-motion`: no smoothing and no idle motion; the film simply follows the scroll.
- No WebGL2, or the model fails to load: `Fallback.jsx`.

## Assets

- `public/models/vexo-band.glb`: Vexo's own product model (`vexoai.com/models/vexo-wrap-product-v15-web.glb`). If it's missing, the site's copy is used.
- `public/images/band/*`: official renders and photography from vexoai.com.
- `public/draco/`: the Draco decoder (from three.js).

## QA

Add `#t12.4` to jump to a moment, and `~d` for the debug overlay (for example `#t12.4~d`). With the overlay on:

- `,` and `.` step between checkpoints.
- `~tour3` steps through every checkpoint, 3 s apart.
- `~xw`, `~xs` and `~xd` hide the wrist, the story lines or the dust.

## Deploy

Static. `vercel.json` is included. Push to GitHub and import the repo on Vercel, or run `npx vercel`.
