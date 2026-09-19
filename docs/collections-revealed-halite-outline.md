# Collections Revealed — "Life in Salt" Presentation Build Outline
### TypeScript + Theatre.js + Three.js, presenter-driven stage build

This is a spec document for a coding agent (Cursor), not code. It assumes the existing "halite hero" Three.js asset from Aaron's personal site is being reused/extended, and that the presentation framework being drawn on is Ravendale-style (cinematic, scene-driven, not a scrolly-telling web page).

---

## 0. Hard constraints from the program guide (design against these, not around them)

- **Runtime: 10 minutes of talk, hard stop.** The build must support a presenter advancing through a fixed sequence of beats on cue — not open-ended exploration.
- **Venue: 300-seat auditorium, single large projection surface, house lights partially down.** Design for high contrast and large-scale legibility, not close-up screen viewing.
- **Audience: 70% grades 4–12, 30% general public.** No dense text, 5th-grade reading level on any on-screen copy, sans-serif only, 18pt-equivalent minimum at presentation scale.
- **One idea per screen/beat**, mirroring the "one idea per slide" rule even though this isn't literally a slide deck.
- **Presenter-controlled, not audience-interactive.** There's no per-seat input device — any "audience participation" moments are simulated by the presenter (keyboard trigger) after a live show-of-hands, not by the app polling the room.
- **Tech-failure grace is a requirement, not a nice-to-have.** The guide explicitly coaches presenters to acknowledge and adapt to AV hiccups — the build should make that easy rather than making failure catastrophic (see Section 10).
- **Process note:** the program's official checkpoint process references "Google Slides" reviews at the 2-week and 1-week marks. Since this is a custom web build instead, flag to Nicole Duran / School & Teacher Programs early that the deliverable will be a web app, not a Slides file, so the review checkpoints can adapt (e.g., reviewing via screen-share or a recorded run-through instead of a shared Slides link).

---

## 1. Narrative-to-scene mapping

Seven beats, each becomes one Theatre.js "sheet" (a named, independently scrubbable timeline) driving one Three.js scene state. Keep the mapping 1:1 — one sheet per beat — so the presenter's control model stays simple (advance = next sheet).

1. **Cold Open — "What's alive in here?"**
   Halite hero model front and center, slow ambient rotation, dramatic rim lighting. No text yet. This is the show-of-hands moment — presenter pauses here live.

2. **Field Moment — Searles Lake**
   Transition from the hero object to environmental/field photography (the dry lakebed, core samples, the collecting trip). Object either shrinks to a corner inset or dissolves out entirely while photos take focus. This is the personal-narrative beat — visuals should feel like a place, not a lab.

3. **The Reveal — bacteria movie**
   Full-bleed video takeover, sound-optional (captioned), 15–20 seconds, looped. This is the emotional peak of the talk; nothing else should compete with it on screen.

4. **Explainer — halophiles**
   Return to the halite hero, now with a simple animated cutaway or highlighted inclusion (brine pocket) synced to plain-language on-screen labels ("salt-loving microbe," "ancient trapped water"). Minimal text, large type, one concept per label.

5. **The Bridge — Mars**
   Camera pulls back / scene transitions from the halite object to a simple Mars-surface or salt-deposit visual (photo or lightly stylized, not a heavy 3D Mars model unless one already exists as an asset — don't scope-creep new asset creation here). Tight one-line thesis on screen: life hides in salt here, so scientists look for it in salt there.

6. **So-What**
   Return to hero object, now framed as "one specimen, one thread" — visually quieter, almost a portrait shot. This is where the talk's thesis gets stated in the presenter's own words; the screen should recede and let the presenter hold the room.

7. **Send-off**
   Wide, calm closing shot (hero object plus a soft indication of "35 million specimens" — this can be as simple as the object slowly zooming out into darkness/particles, no need for literal iconography). Cue for "thank you" and hand-off to moderated Q&A.

---

## 2. Asset inventory (confirm before build starts)

- Halite hero 3D asset (existing) — confirm current material/shader treatment (does it already handle the pink translucency / subsurface-scattering look, or does that need tuning for stage projection contrast?)
- Field photography from Searles Lake (collecting trip, core samples) — confirm resolution is presentation-safe (large-format projection, not just web-res)
- Bacteria movie file — confirm codec/resolution, confirm whether it needs captions burned in or as a separate track, confirm current framing (full frame vs. needs cropping for full-bleed use)
- Any existing Mars/salt-deposit imagery, or flag as a new asset need (photo licensing from a public source, e.g., NASA/JPL imagery, is the safe default — avoid anything requiring attribution complexity on a fast timeline)
- Font assets: confirm a sans-serif family already used in the Ravendale-style framework meets the guide's accessibility list (Hind Siliguri, Arial, Calibri, Gill Sans, Franklin Gothic Book) — if the current brand font is a serif or display face, this is a decision point to raise, not silently override

---

## 3. Application architecture (conceptual, no code)

- **Single-page app, sequential sheet model.** One root scene manager holds a reference to "current beat index" (0–6) and exposes next/previous/jump-to-beat controls.
- **Separation of concerns:**
  - A *scene layer* (Three.js canvas, full-viewport, persistent) — the halite object and 3D environment live here and persist/transition across beats rather than being torn down and rebuilt each time.
  - A *timeline layer* (Theatre.js) — drives camera, object transform, lighting, and material property keyframes per sheet.
  - An *overlay layer* (plain DOM, not canvas) — on-screen text labels, captions, and the video element for Beat 3. Keeping this DOM-based rather than canvas-rendered text matters for legibility at projector scale and for accessibility (screen-reader/alt-text compatibility per the guide's inclusive-design section).
- **Control layer** is separate from all three — a small keyboard/clicker listener that only ever calls "go to beat N," nothing more complex. This isolates presenter input from playback logic so a misfire can't desync the scene state.
- **No routing/URL-based navigation** — this is a live-performance app, not a browsable site. Keep it to in-memory state.

---

## 4. Theatre.js timeline design

- One **project**, seven **sheets** (one per beat), matching Section 1.
- Each sheet should own only the properties it changes — avoid one giant shared sheet with everything animated everywhere, since that makes it hard to jump beats out of order if the presenter needs to skip ahead live (e.g., recovering from a tech hiccup, per Section 10).
- Keyframe categories per sheet, as applicable: camera position/FOV, object rotation/position/scale, light intensity/color, material property (opacity, emissive strength for the "brine pocket highlight" in Beat 4), overlay opacity/timing (so text fades in sync with the 3D motion rather than popping).
- Build in **generous default hold time** at the start and end of each sheet's animated range — live pacing will vary talk to talk; the animation shouldn't force a fixed cadence the presenter has to match exactly.
- Scrubbing should be smooth enough that "next beat" never requires a hard cut if the presenter pauses mid-transition — Theatre.js sequences should be designed to look intentional whether played through in full or paused partway.

---

## 5. Three.js scene requirements

- **Lighting design should read correctly under auditorium stage lighting conditions** — meaning strong, legible contrast and a lighting rig that doesn't rely on subtlety that would wash out under partial house lights. Test renders should be judged at "bright room, big screen," not "dark room, laptop."
- **Halite material:** if not already tuned, the pink translucency benefits from a degree of subsurface-scattering approximation or at minimum a layered transmission/refraction setup — this is the "hero shot" object, worth the most visual polish in the build.
- **Camera behavior:** keep movements slow and deliberate; fast camera moves work against a presenter trying to talk over them. Camera easing should favor slow-in/slow-out over linear or bouncy easing.
- **Beat 4 cutaway/inclusion highlight:** simplest reliable approach is an emissive-highlighted region or a simple clip-plane reveal on the existing model, rather than building new interior geometry — flag if the existing asset doesn't support this cleanly, since that's a scope question worth resolving early.
- **Performance target:** must run smoothly on whatever machine will actually drive the auditorium projector — confirm that hardware/browser combination early rather than assuming the dev machine's GPU is representative.

---

## 6. Presenter control scheme

- Primary control: **spacebar or right-arrow = advance to next beat**, left-arrow = back one beat. No reliance on a mouse.
- Secondary: **number keys 1–7 jump directly to a beat**, for recovery if something goes wrong live or if Q&A prompts the presenter to revisit an image.
- Consider a **presenter-only view** (e.g., a small on-screen or second-monitor readout showing "Beat 3 of 7 — Bacteria movie") separate from what the audience sees, if the AV setup supports a confidence monitor — check with the venue's tech team rather than assuming a dual-output setup is available.
- All controls should be **large-target and forgiving** — this will very likely be operated via a basic presentation clicker (next/back only), so the core interaction must work with exactly two input signals.

---

## 7. Typography & accessibility compliance

- Sans-serif only, matching the guide's approved list unless the existing brand font is already compliant.
- Minimum on-screen text size should be judged at "back row of a 300-seat house," not at desktop-preview scale — this likely means far larger type than feels natural in a normal web layout.
- High-contrast color pairing only (the guide's own example: black/white or deep blue/bright yellow) — avoid low-contrast "cinematic" color grading on any text overlay even if it looks good on the object itself.
- Bacteria movie needs **captions**, not just because of the accessibility guidance but because auditorium audio can be unreliable — captions make Beat 3 land even if sound fails.
- Any image assets inserted (not pasted) so alt text can be attached, per the guide's explicit note about screen-reader compatibility — worth preserving even though this is a live presentation rather than a shared document, since the same build may later be repurposed or shared digitally.

---

## 8. Audio/video handling

- Bacteria clip should be **short, looping, and safe to play muted** — treat captions as the primary information channel, sound as a bonus layer.
- Preload the video asset at app start (not on-demand at Beat 3) to avoid a stall exactly at the emotional peak of the talk.
- No dependency on streaming/network video — everything local/bundled, given auditorium wifi is not something to trust live.

---

## 9. Performance & offline reliability

- **Entire app should run fully offline** — bundle all assets, no CDN dependency at runtime, no external font loading over network at show time.
- Test on the actual presentation machine and actual projector resolution/aspect ratio before the "1 week: finalize" checkpoint in the program schedule, not the day of.
- Have a **local build artifact** (not "run from dev server") as the presentation-day deliverable, so nothing depends on a laptop's dev environment being intact under pressure.

---

## 10. Fallback / failure handling

Directly responsive to the guide's stage-presentation coaching on handling tech hiccups gracefully:

- If the 3D scene fails to load or drops frames badly, there should be a **static-image fallback per beat** — essentially a "if this beat's rich version fails, show a plain photo instead" degrade path, so the presenter is never staring at a blank or broken screen.
- The jump-to-beat control (Section 6) doubles as failure recovery — if Beat 3's video won't play, the presenter can skip forward without the whole sequence breaking.
- Avoid any failure mode that blocks *all subsequent* beats (e.g., a broken video element that prevents the next sheet from mounting) — beats should fail independently, not cascade.

---

## 11. Rehearsal & tech-check plan

Tie directly to the program's existing schedule:

- **At the "in-progress" review (2 weeks out):** have at least a rough cut of all seven beats runnable in sequence, even with placeholder assets, so pacing can be judged against the 10-minute limit.
- **At "finalize" (1 week out):** full run-through on the actual venue AV if at all possible, or the closest available approximation — check projector aspect ratio, house-lighting contrast, and clicker behavior specifically, since those are the three most likely live failure points for a canvas-based app.
- **Day-of (9:30am tech check):** verify offline build runs standalone on the presentation machine, verify captions are visible under house lighting, verify clicker maps correctly to the control scheme in Section 6.

---

## 12. Open decisions to resolve before Cursor starts building

- Confirm whether the halite hero asset's existing material setup already meets the subsurface-scattering look needed for the pink translucency, or whether that's new shader work.
- Confirm Mars/salt-deposit imagery source (existing asset vs. new sourcing).
- Confirm dual-monitor/confidence-monitor availability at the venue (affects whether a presenter-only view is worth building).
- Confirm target presentation machine specs, to set a realistic performance ceiling for the Three.js scene.
