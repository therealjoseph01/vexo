# VEXO BAND: an interactive unveiling

A scroll-driven product film for **Vexo Band**, Vexo's woven AI bracelet. The band itself carries the story: it starts
as a piece of fabric in the dark, comes onto a wrist, hears the day, acts on it, and comes back off.

```
FABRIC → BAND → WRIST → CONTEXT → MEMORY → ACTION → VOICE → SENSORS → PRIVACY → BAND
```

---

## 1. Correction: the product is a band, not a ring

The first version of this film was built around a smart ring. That was wrong. vexoai.com leads with **Vexo Band**, and
YC lists Vexo as *"An AI bracelet that remembers your day and acts before you ask."* Everything below was
re-researched on Sept 28 2026 from the live site, the site's own assets, and the YC company page.

### What the Vexo Band looks like (from vexoai.com's renders and its 3D model)

| Part | What it is |
|---|---|
| **Continuous wrap** | A wide, flat **woven** strap, about 2.1 cm across, in one continuous loop. "Woven comfort." Charcoal / pearl / moss weave. |
| **Loop closure** | A rounded-rectangle **titanium loop** the strap passes through, with **VΞXO engraved** down its outer side. |
| **Module** | A slim rectangular titanium housing, sandwiched in the wrap on the top of the wrist, with a **side button** on the top edge. |
| **Microphone** | A small round port on the module's top edge, with an anodized rim, a mesh and a membrane. "A microphone at your side." |
| **Health sensors** | A large round smoked-glass **sensor window** on the skin side, with green and red LEDs behind a polished rim. "Health sensors beneath." |
| **Tuck embroidery** | The Vexo triangle mark, embroidered on the outer flap. |
| **Inside** (from Vexo's own model) | Main board (BLE radio, IMU, memory), battery pouch, haptic ERM motor, and a skin-side board with the optical HR and temperature sensors. |
| **Finishes** | Graphite ("Charcoal weave. Dark titanium."), Pearl (off-white weave, silver titanium), Moss (sage weave, champagne titanium). |

### Official assets used

- `public/models/vexo-band.glb`: vexoai.com's own product model (`/models/vexo-wrap-product-v15-web.glb`, 7.3 MB,
  Draco-compressed, woven normal and roughness textures). **The film renders this model.** Nothing about the band is
  re-modelled or invented.
- `public/images/band/*.webp`: official renders and lifestyle photography (on wrist ×3 finishes, overview, signature,
  sensors, microphone, intro), used in the coda.

### Claims, and where they come from

| Claim | Source |
|---|---|
| "Already on it." · "Your AI. On your wrist." | vexoai.com hero |
| "Just say it." · "Built-in microphone." | vexoai.com |
| "In tune with you." · "Health sensors." | vexoai.com |
| Health sensing: **heart rate, skin temperature and motion** | vexoai.com/checkout, "Band, in detail" |
| Quiet haptics, "A gentle tap, just for you." · Bluetooth LE · Onboard memory, "Storage, built right in." | /checkout |
| "Woven comfort. Thoughtfully connected." · $199 · Graphite / Pearl / Moss | /checkout |
| Vexo Intelligence: Creating, Memory, Reservations, Uber, DoorDash, Shopping, Email | vexoai.com |
| Example: "Make me a pitch deck for a late-night coffee shop. Four slides. Keep it sharp." → Listening → Creating live | vexoai.com demo |
| "Your world. Working together." Gmail, Google Calendar, Google Drive, Notion, GitHub, Render, Supabase **available**; the rest coming soon | vexoai.com connectors |
| "Every AI today waits for a prompt. Vexo already has the context…" | YC company page |
| "…turns what it hears into private memories and acts on them, booking the table, sending the follow-up, and ordering the groceries through the apps you already use." | YC |
| "It's a woven bracelet with a microphone and health sensors. No screen, and nothing to open." | YC |
| "Vexo never keeps your audio. Only you can see your memories, and you can delete them anytime." | YC |

### Removed (ring-only, or not claimed for the band)

- The ring, the finger, "Your sixth sense", double-tap-to-speak, 2.4 g, aerospace titanium and five-day battery.
- HRV, blood oxygen, respiration, sleep and women's health: the band claims heart rate, skin temperature and motion only.
- Vexo Studio app-building, the 100+ app marketplace, MCP/OAuth and the developer platform, which were all from the ring page.
- The dock.
- **The voice gesture is not specified** for the band, so the film shows the microphone listening and never shows a tap
  or button press.

---

## 2. Codebase audit: what was built around the ring

| File | Ring assumption | Now |
|---|---|---|
| `gl/ringGeometry.js`, `gl/Ring.jsx` | Procedural lathe ring, sensor pill, engraving strip, mic bezel | **Deleted.** `gl/Band.jsx` loads Vexo's GLB |
| `gl/studio.js`, `gl/textures.js` | Ring shader (θ-based ripples, lathe parts), ring engravings | **Deleted.** GLB PBR materials + studio PMREM environment (`gl/studioEnv.js`) |
| `gl/Signals.jsx` | Seven orbits around a ring's circumference (HRV, SpO₂, sleep…) | **Rewritten** as `gl/Health.jsx`: three signals travelling along the wrist |
| `gl/Body.jsx`, `bodyContours.js` | Whole body, hand over the heart behind a ring | **Rewritten** as `gl/Wrist.jsx` + `gl/handMesh.js`: a realistic forearm and hand (light skin tone) the band is worn on |
| `gl/Voice.jsx` | Double tap on a ring, rings contracting into a ring's mic | **Rewritten**: voice into the band's edge microphone, no gesture |
| `gl/Ecosystem.jsx`, `glyphs.js` | Ring app marketplace orbit | **Replaced** by `gl/Context.jsx`: memories and actions around the wrist |
| `gl/Network.jsx` | MCP / OAuth developer network | **Replaced**: memory → action paths to the apps you already use |
| `gl/Privacy.jsx` | Ring-and-phone boundary | **Rewritten**: audio dissolves and only memories remain |
| `gl/Days.jsx`, `gl/Dock.jsx` | Five-day battery dial, triangle charging dock | **Deleted** (no band battery claim) |
| All `overlay/scenes/*` | Ring copy | **Rewritten** against the table above |
| `config.js`, `Coda.jsx`, `Fallback.jsx`, `index.html` | Ring links, photos, specs, CTA | **Rewritten** for the band: Buy Band $199 → /checkout |

---

## 3. Scenes (story time ≈ screens)

**01 · Already on it** (0 – 3.6)
- Black. A macro shot on the weave: one raking light crosses it slowly and the woven texture appears.
- The camera drifts along the strap. The titanium loop catches the light and VΞXO slides past.
- Pulling back, the whole band emerges and hangs in the dark, turning slowly.
- *Already on it. · Your AI. On your wrist.*

**02 · Woven comfort** (3.6 – 8.2)
- The band turns in 3D. Light picks out the weave, the loop closure, the module, the side button and the microphone.
- The module opens up along its axis. Vexo's own model shows what's inside, labelled only with the site's own
  "Band, in detail":
  - microphone
  - health sensing (skin-side board)
  - quiet haptics (motor)
  - Bluetooth LE
  - onboard memory
- It closes again. *Woven comfort. Thoughtfully connected.*

**03 · On your wrist** (8.2 – 11.2), the signature transition
- A human forearm and hand reach in, fingertips first, drawn out of the dark by a line of light. The band loosens, turns to line up with the arm, slides over the hand, and
  **cinches** onto the wrist with the module on top. It settles with a spring and one gentle haptic pulse.
- *No screen, and nothing to open.*

**04 · Vexo already has the context** (11.2 – 15.6)
- The band stays on the wrist and the day happens around it. Conversation lines appear in space as words carried on
  small waveforms:
  - *"Let's do dinner at 8."*
  - *"Can you send Sarah the deck?"*
  - *"We're out of groceries."*
- Each line collapses into the microphone and crystallises as a quiet memory beside the band.

**05 · Acts before you ask** (15.6 – 19.8)
- Each memory becomes an action along a path: **REAL WORLD → VEXO → MEMORY → ACTION**:
  - Dinner → *Table booked, 8:00* (Reservations)
  - Sarah → *Follow-up sent* (Email)
  - Groceries → *Order placed* (DoorDash)
- A gentle haptic tap confirms.
- The apps you already use ring the scene. The available ones are bright; the coming-soon ones are dim.
- *Already on it.*

**06 · Just say it** (19.8 – 23.8)
- The camera moves to the band's top edge and the microphone port. A voice waveform flows into it: Vexo's own demo
  line, *"Make me a pitch deck for a late-night coffee shop. Four slides. Keep it sharp."*
- *Listening → Creating live.* Four slides assemble in space above the wrist, "After Hours".
- *Just say it. · Built-in microphone.*

**07 · In tune with you** (23.8 – 27.4)
- The camera moves beneath the wrist and the skin turns glassy, with contour lines carrying the signal. The sensor window faces us and its green and
  red LEDs wake.
- Three signals, and only these three:
  - **heart rate**: a PPG pulse travelling up the wrist
  - **skin temperature**: warmth spreading through the contours
  - **motion**: the motion readout follows your own scroll
- *In tune with you. · Heart rate, skin temperature and motion.*

**08 · Private by design** (27.4 – 31.0)
- Pull back. Conversations surround the wearer as waveforms and words.
- Then **the audio disappears**: every waveform dissolves and only the structured memories remain. One is deleted.
- *Vexo never keeps your audio. · Only you can see your memories, and you can delete them anytime.*

**09 · Make it yours** (31.0 – 35.0)
- Darkness. The arm slides away and the band comes off the wrist, floating back to centre under product lighting.
  It turns slowly: weave, titanium, engraving.
- *Already on it.* **Buy Band, $199** · Graphite / Pearl / Moss, switched live on the model.

**Coda.** Official lifestyle photography in all three finishes, "Band, in detail", the connectors, and the footer.

---

## 4. Technique

| | |
|---|---|
| Band | Vexo's GLB via `GLTFLoader` + `DRACOLoader`. Official PBR materials: woven normal and roughness maps, sheen on the textile, titanium. Parts are grouped by node name for the exploded view, LEDs and finishes. |
| Light | A studio PMREM (strip softboxes) for reflections, plus animated real lights: a raking spot for the weave, key, rim. `scene.environmentIntensity` handles the fades to black. |
| Wrist | A human forearm and hand as one smooth signed-distance surface (lofted forearm and palm, four fingers, a thumb held in along the palm, nails), polygonised at load with surface nets. Skin shading: a light skin tone with sheen, fine procedural relief and paler, glossier nails. In the sensor scene it turns glassy and contour loops (`LineField`) carry the pulse. |
| Lines | The same `LineField` engine: waveforms, memory paths, health pulses, haptic ripples |
| Type & UI | DOM, projected from 3D anchors (microphone, sensor window, loop closure): memories, actions, slides, labels |
| Mobile | Portrait tracks. The arm runs up the frame, and the words and memories stack above and below the band. |
| Perf | The GLB loads with a progress loader (about 7 MB). Internals are hidden except during the exploded view. Transmission is disabled on the sensor glass. DPR is adaptive. |
