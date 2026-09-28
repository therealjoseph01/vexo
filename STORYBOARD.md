# VEXO — an interactive unveiling

A scroll-driven product film for the Vexo Ring. One ring, one camera, one continuous shot.
Scrolling is the playhead. Scrolling back rewinds it.

```
RING → SENSORS → BODY → DATA → VOICE → APPS → AI CREATION → BODY API → PRIVACY → RING
```

---

## 1. What Vexo is (research summary)

Sources: vexoai.com/ring, /women-health, /waitlist, /privacy (updated Aug 16 2026), /terms (updated Sep 23 2026),
the official hero render (`/videos/hero-snap.mp4`) and product photography.

> Note: vexoai.com's root now leads with **Vexo Band**. The Ring lives at **/ring**. This film is built for the Ring.

**What makes it different from Oura and other rings.** Other rings track you passively. Vexo also listens: there's a
microphone on the ring (double-tap to speak), silent haptics, and an AI that reads your vitals and remembers every
chat. Around it sits an app marketplace, and **Vexo Studio** builds you a new app from a sentence. Under that is
a scoped, revocable data platform (MCP and OAuth 2.1). The sensitive processing happens on the phone.

### Claims used, and where they come from

| Claim in the film | Source |
|---|---|
| "Your Sixth Sense" · "Listens, remembers and acts before you ask." | /ring hero |
| Heart rate, HRV, blood oxygen, respiratory rate, skin temperature, sleep and activity. Measured every second. | /ring |
| Optical PPG, skin-temperature sensor, accelerometer + gyroscope, microphone | /privacy §03 |
| "Double tap to speak." · "Say it before the moment goes away." | /ring |
| Ring mic → streamed to iPhone → transcribed on-device (Apple speech). Audio never uploaded. | /privacy §02–04 |
| Voice notes captured by double-tapping the Ring | /privacy §03 |
| "Feel what it knows." · "A gentle tap only you can feel." | /ring |
| "Every app, one ring." Stride, Matchday, Rally, Still, Plate, Dose, Lift, Goals · 100+ more in the marketplace | /ring |
| Cycle insights from nightly temperature | /women-health |
| Vexo Studio: describe → Vexo writes it (code, screens, wiring into live ring data) → on your ring. Example: a marathon fuel planner reading heart rate, sleep and recovery. "Vibe-code an app. Describe it out loud. Vexo builds it, one shot." | /ring |
| MCP to external assistants (e.g. Claude, ChatGPT): off by default, personal link, revocable. Categories: profile, latest vitals, activity summaries, metric history, transcripts | /privacy §07 |
| Scoped OAuth 2.1 tokens, approved scope by scope, revocable | /terms §09 |
| Marketplace access is deny-by-default and scoped (e.g. "latest vitals", "read captures") | /privacy §07 |
| "Every insight is computed on your phone. No feeds, no ads, nothing sold." | /ring |
| "Your data belongs to you, and it does not leave your devices without your explicit consent." | /privacy |
| Location: not collected. The app never uses the iPhone microphone. | /privacy §03 |
| "Five days. One charge." · "…then an hour on the dock and it is ready to go again." | /ring |
| Aerospace titanium. 2.4 grams. Hand washing, sweat, a caught-out shower. | /ring |
| General wellness product, not a medical device | /terms §03, /women-health |
| Backed by Y Combinator · waitlist · Vexo app on the App Store | /ring, /waitlist |

### Claims deliberately *not* used
- **REST / WebSocket**: not documented publicly. Scene 7 uses MCP, OAuth 2.1 and scopes instead.
- **"Location — denied"**: inaccurate. Location isn't collected at all, so the film says *not collected*.
- **"Hundreds of experiences"**: Vexo says 8 named apps plus 100+ in the marketplace. The film says exactly that.
- **Price and ship date**: /women-health says $99 and January 2027, but /ring and /waitlist say "Not for sale. Yet."
  There is no Ring checkout (the homepage /checkout sells the Band). So the primary CTA is the **Vexo app on the App
  Store**, and the secondary is the live **/waitlist**, which is the ring page's own main CTA. `SHOW_WAITLIST` in
  `config.js` turns it off.
- **"Saved to Reminders"**: routing a note to Reminders needs a tap in the app (/privacy §03). The film shows a
  voice note being *saved as a note*.

### Asset audit
- **No public 3D model.** There's an official render video (1920×1080, 37 s) and photography: silver on moss,
  graphite on hand, gold on hand, graphite at night.
- The render video shows the hardware details we model: a flat titanium band with rounded edges and a stepped inner
  rim, a round **microphone port** with a polished bezel and mesh on the outer face, a raised glossy **sensor pill**
  on the inner face (green and red LEDs over a dark window), **VΞXO engraved** inside next to the pill, and a
  **rounded-triangle dock** with a centre puck and a white status dot.
- The brand: the VΞXO wordmark (stroked, round caps), Hanken Grotesk, Instrument Serif italic accents, black
  studio backgrounds, silver type.
- The CDN serves `Access-Control-Allow-Origin: *`, so official photos can be used directly (they appear in the coda).

**Decision:** the ring is rebuilt as real-time geometry, a surface of revolution modelled from the official render.
Pre-rendered frames can't do what the story needs: fly the camera *through* the aperture, orbit freely, swap finish
live, or react to signals. A 1080p image sequence would also weigh 15–30 MB. The procedural ring downloads nothing
and stays sharp at any resolution.

---

## 2. Visual language

- **Stage:** near-black, one studio. The ring is lit like a product film: long softbox strips reflected in polished
  titanium. The lighting is an analytic environment in the ring's shader, so every light can move each frame at no cost.
- **Signal line:** everything the ring knows is drawn as one hairline luminous stroke: waveforms, contour lines, orbits,
  threads, arcs. No cards, icons or gradients. The same stroke carries the whole film, so body, data, apps and API
  all look like one system.
- **Colour:** titanium silver on black. Colour only appears when it means something: PPG green, SpO₂ red,
  thermal amber, and warm or cool daylight in Scene 9.
- **Type:** Hanken Grotesk (Vexo's face), Instrument Serif italic for single emphasised words, JetBrains Mono for
  readouts. Show 3–8 words at a time.

---

## 3. Scenes (story time ≈ screens of scroll)

### 01 · Your sixth sense (0 – 3.4)
- **0.0:** black. One thin sliver of reflected light on the ring's rim, seen almost edge-on, as in the first frame
  of Vexo's render.
- **0.3–2.2:** a single strip softbox travels around the ring's axis, so the highlight runs around the circumference
  and the form shows itself. The ring turns very slowly. Dust catches the light.
- **1.4:** **YOUR SIXTH SENSE** fades up, with the same light travelling across the letters. Then
  *Listens, remembers and acts before you ask.*
- **2.6–3.4:** the ring turns its aperture to the lens and comes toward camera.
- *Technique:* WebGL ring with the studio shader; DOM type with a mask synced to the light angle.

### 02 · Enter the ring (3.4 – 8.0)
- **3.4–4.4:** the camera flies into the aperture. The inner wall wraps the frame. We tilt down onto the sensor pill:
  a macro shot, like the official close-up.
- **4.4–5.2:** the green LED pulses and a heartbeat ripples faintly through the room: **HEART RATE 62**. Then
  the red LED: **BLOOD OXYGEN**.
- **5.2–8.0:** we pull back out through the aperture. As the ring comes back into view, each signal becomes a trace
  **orbiting the ring**, like a circular oscilloscope where the circumference is the time axis:
  - heart rate (PPG waveform)
  - HRV (beat-to-beat ticks)
  - SpO₂
  - respiration (a slow swell, and the whole ring breathes)
  - skin temperature (the titanium warms with a thermal gradient)
  - sleep (a hypnogram)
  - motion (dust reacts to *your* scroll speed; the readout shows live accelerometer values)
- **Copy:** *The signals that matter.* → *Measured every second.*
- *Technique:* camera spline through the ring; LED emissives; GPU parametric ribbons; scroll-velocity particles.

### 03 · The body becomes data (8.0 – 11.4)
- The orbits fold down and the ring drifts forward. Behind it a human figure appears as contour lines, like a
  body scan, drawn bottom to top. The pose is a hand on the heart, and the ring sits over the hand.
- Signal waves travel through the contours toward the ring: heartbeat from the chest, breath swelling the rib
  cage, warmth across the skin. BODY → RING.
- The ring answers. Readings leave it and hang in space at different depths: **62 BPM · HRV 46 ms · SpO₂ 98% ·
  36.6° · 14 /min · 7h 12m**. RING → DATA.
- **Copy:** *A quiet instrument for the signals your body is already sending.*
- *Technique:* signed-distance body sliced into ~90 contour loops at build time (marching squares) as one static
  ribbon field; per-point distance-to-ring drives the converging pulses; DOM readouts projected from 3D.

### 04 · Double tap to speak (11.4 – 15.2)
- The body dissolves. The ring turns its outer face and **microphone port** to the camera and comes close.
- **TAP · TAP:** the ring gives slightly under each tap, on a spring, and a ripple crosses the metal.
- A voice waveform arrives from the left. Words ride it: *"Note to self: stretch after this run."* Sound rings
  converge into the mic port, the reverse of the official render.
- TAP → SPEAK → UNDERSTAND → RESPOND: the words settle into a transcript (*transcribed on your iPhone*), then
  *Saved as a note*. The ring answers with a haptic: a tiny tremor and a ring of light spreading through the band.
- **Copy:** *Double tap to speak.* · *Say it before the moment goes away.* · *Feel what it knows.*

### 05 · Every app, one ring (15.2 – 19.2)
- The readings fly outward and turn into apps orbiting the ring at different depths. Each app is drawn in the same
  hairline and built from its own signal:
  - **Stride** (Running): cadence on a track
  - **Matchday** (Soccer): pitch lines and sprints
  - **Rally** (Pickleball): bounce arcs over a net
  - **Still** (Meditation): a breathing circle
  - **Plate** (Nutrition): a segmented plate
  - **Dose** (Care): a dose timeline
  - **Lift** (Strength): sets rising
  - **Goals** (The long game): a months-long trend
  - **Women's health**: a cycle loop with the temperature shift
- A thread runs from the ring to every app, and pulses travel outward: every app reads the same signals off the
  same finger.
- The camera flies *through* the ecosystem, then pulls back until 100+ points ring the whole system.
- **Copy:** *Every app, one ring.* → *100+ more in the marketplace.*

### 06 · Build an app by describing it (19.2 – 24.2), the signature moment
- Everything falls quiet. The ring sits alone.
- A spoken line writes itself: *"Build me a marathon fuel planner."* The letters stream into the aperture.
- The ring takes a breath of light. Code spirals out and dissolves: **THE CODE YOU'LL NEVER WRITE 0 → 100%**.
- An app assembles in space. A phone outline draws, then its parts fly out of the ring and lock in: the title, the
  race-day fuel plan, a heart-rate chart, sleep and recovery. Threads connect the ring's **heart rate · sleep ·
  recovery** signals to the parts that use them.
- **CREATED WITH VEXO STUDIO** · *Describe it out loud. Vexo builds it, one shot.*
- *Technique:* DOM app with CSS 3D (crisp, accessible text), anchored per frame to the ring's projected position;
  SVG threads.

### 07 · The body, as an API (24.2 – 27.4)
- The new app shrinks into one node. Arcs grow out of the ring to other nodes: **Fuel Planner** (Studio),
  **Stride** (marketplace), **Claude** and **ChatGPT** (MCP), and **your code** (OAuth 2.1). Packets travel the
  arcs, each labelled with the data it's allowed: *latest vitals · activity summaries · metric history · transcripts*.
- **Copy:** *The body, as an API.* · MCP · OAUTH 2.1 · SCOPED · REVOCABLE
- It feels like infrastructure hidden inside a piece of jewellery.

### 08 · Privacy (27.4 – 30.6)
- Everything collapses: arcs pull back into the ring, nodes go out. Darkness. The ring is alone.
- A phone outline appears beside it, and one boundary closes around both: *your ring, your phone*. A voice wave
  crosses to the phone, becomes text, and the audio dissolves inside the boundary. Only text and numbers go further,
  and only if you sync.
- Permissions set themselves:
  - LATEST VITALS: allowed
  - READ CAPTURES: not granted
  - EXTERNAL AI (MCP): off by default
  - VOICE AUDIO: stays on your phone
  - LOCATION: not collected
- **Copy:** *Your data belongs to you.* · *Every insight is computed on your phone. No feeds, no ads, nothing sold.*

### 09 · Five days (30.6 – 34.0)
- The ring comes back into focus as an object. Its scale snaps down to something close to real size:
  **2.4 grams. Aerospace titanium.**
- A thin charge arc circles the ring. Five days pass in light: each day the key light makes one sunrise-to-night
  sweep around the ring, and the arc gets shorter. **DAY 1 … DAY 5**. The ring doesn't move.
- The triangular dock rises. The ring settles onto it and the arc refills over **1 hour**.
- **Copy:** *Five days. One charge.* → *An hour on the dock. Ready again.*

### 10 · Your sixth sense (34.0 – 37.0)
- The dock sinks away. Darkness, and the opening's single travelling light. The same ring, turning slowly.
- **YOUR SIXTH SENSE.** The VΞXO wordmark draws itself. **Get the Vexo app** · *Join the waitlist*.
  The finish can be switched live: Silver · Gold · Graphite.
- It's the same shot as the opening, but now we know what's inside.

### Coda (normal scrolling)
Official photography (on hand, at night, on moss), a one-line spec strip, "A Day With Vexo" (the official demo
film, loaded only on click), women's health, the wellness disclaimer, and the footer.

---

## 4. How the ring carries each transition

| From → to | The ring's move |
|---|---|
| 01 → 02 | turns its aperture to the lens and the camera flies in |
| 02 → 03 | the camera pulls back out through the aperture; orbits fold flat; the ring drifts in front of the chest |
| 03 → 04 | the ring rolls about its axis until the mic port faces us; the camera closes in |
| 04 → 05 | the haptic ripple spreads outward and becomes the orbit where the apps appear |
| 05 → 06 | apps fall back into the ring along their threads; the ring sits centred in silence |
| 06 → 07 | the app shrinks to one node; the ring becomes the hub |
| 07 → 08 | arcs pull back into the ring (everything returns to it) |
| 08 → 09 | the boundary contracts into the charge arc |
| 09 → 10 | the dock sinks; the ring rises into the opening's light |

The camera and ring move on **monotone cubic splines** (continuous velocity, no stop-and-go at keyframes),
followed by a critically damped spring. The ring has inertia: stop scrolling and it settles, it doesn't freeze.

---

## 5. Technique per scene

| | Technique |
|---|---|
| Ring, dock | Procedural lathe + parts, custom studio shader (analytic softboxes, Fresnel, thermal + ripple + LED terms) |
| All lines | `LineField`: one GPU ribbon engine. Static shapes come from a float texture; waves, orbits and arcs are evaluated in the vertex shader, so there are no per-frame buffer uploads |
| Readouts, labels, headlines | DOM, projected from 3D anchors every frame (crisp, selectable, screen-reader visible) |
| Studio app | DOM + CSS 3D, SVG threads |
| Particles | One GPU point system, used only for dust in the light and scroll-driven motion |
| Scroll | Lenis (wheel smoothing) → story time via PACE slow-motion zones. React never re-renders on scroll. |

---

## 6. Mobile

- **Portrait layout:** every camera and ring keyframe has a mobile variant. The ring sits in the upper third, type
  in the lower third.
- Tags pin to fixed rows instead of long leader lines. The Studio app assembles *below* the ring. API nodes stack
  vertically, and the ecosystem orbit becomes a tall ellipse.
- Native touch scrolling (no scroll hijacking). A damped follower keeps it smooth.
- DPR capped at 1.5, particle and ribbon counts at a third, simpler contour body.

## 7. Performance & accessibility

- **Zero image downloads for the film.** Engraving, grille and dock print are drawn on canvas at start-up.
  Official photos lazy-load in the coda.
- **Shaders precompiled** behind the loader (`gl.compile`), so nothing hitches mid-scroll.
- **Adaptive quality:** a frame-time monitor steps DPR down (1.75 → 1.25 → 1.0 → 0.75). Rendering pauses once the
  film is scrolled past.
- **No WebGL2:** a static, typographic version of the film with official photography.
- **`prefers-reduced-motion`:** no wheel inertia, idle motion frozen, camera flights shortened into dissolves,
  haptic tremor removed.
- **Skip the film** link, a keyboard-reachable scene index, and one live region that announces the scene.
