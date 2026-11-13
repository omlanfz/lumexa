# Classroom video effects and the teacher's Pointer

Two classroom features that live in the browser and need no server setup:

1. **Video effects** — background blur (slight and full), virtual backgrounds, lighting
   adjustment, touch-up and auto-framing, for the camera a person sends to the class.
2. **The Pointer** — a dot the teacher moves over a student's shared screen, a thin line they
   draw with the mouse button held, and a ring where they click, seen by everyone.

Neither needs an environment variable, a database change or a new service.

## 1. Video effects

### How it works

```
camera ─► frame ─► [segmentation · face · light, a few times a second]
                └─► WebGL 2 compositor ─► processed track ─► Daily sends it
```

Everything runs in the person's browser; no picture leaves the computer. The effects are
**one pipeline** (`client/lib/classroom/effects/`), so they combine freely — blur *and*
lighting *and* framing at once:

| Effect | How it is done |
|---|---|
| Background blur / replacement | MediaPipe person segmentation → the mask is sharpened against the real edges in the picture (a joint bilateral filter, so it snaps to hair, ears and shoulders), smoothed over time (no flicker, quick where the person really moves), then composited. The blur is of the *background only* (normalised by how much background each pixel saw), so the person never bleeds into it. At the edge the person's colour is taken from the person next to it (no old-background fringe) and a trace of the new background's light wraps round them. Slight blur ≈ 5 px and full blur ≈ 18 px (of a 720-line picture). |
| Lighting adjustment | Automatic. The light is measured on the **face** (not on a bright window behind it), the median of the last readings so a hand waved past is ignored, and followed slowly (it never "pumps"). Exposure is applied in linear light the same to red, green and blue (skin keeps its colour), shadows get a little extra gain (black stays black — no grey veil), highlights roll off softly. The slider is *how much* of the correction is applied; it never goes past a natural look. |
| Touch-up | An edge-preserving (bilateral) smoothing of **skin only, of the face only**, with a good part of the fine detail put back, so pores and blemishes soften but eyes, brows, lips and hair do not, and it still looks like skin. |
| Auto-framing | BlazeFace finds the face ~10 times a second. The face is placed on the upper part of the picture with room for the hair and shoulders, never zoomed past 1.8×. The camera only moves once the person has *settled* somewhere else (a dead zone, and the new place must be seen a few times in a row), then glides there (critically damped, speed-limited). A lost face is waited for (9 s) before the picture eases back out. |

Models (all MediaPipe, Apache 2.0):

| Model | Where it comes from | Used for |
|---|---|---|
| `selfie_segmenter_landscape` (~250 KB) | `client/public/models/` (this repo) | The **standard** tier: loads and runs fast. Always available. |
| `selfie_multiclass_256x256` (~16 MB) | Google's model storage, pinned version path; fetched only when a background effect is used | The **high** tier: a clearly cleaner outline round hair, ears and shoulders. Used when the computer and network can afford it; the pipeline starts on the standard tier and **upgrades in the background**, so effects are instant and then get better. |
| `blaze_face_short_range` (~230 KB) | `client/public/models/` | Face finding. |

The MediaPipe WebAssembly runtime is copied from `node_modules` to
`client/public/mediapipe/<version>/wasm` by `client/scripts/copy-mediapipe-wasm.mjs` (the
`predev` / `prebuild` npm scripts run it; the copy is not committed). If that copy is missing
the browser falls back to the same version on jsDelivr. The script stops the build if the
installed package version and the constant in `lib/classroom/effects/models.ts` disagree.

### The camera is never at risk

This is the rule the whole design follows. (The earlier implementation could lose the
person's chosen camera, leave a toggle showing *On* while nothing was running, and could not
show a failure to the person at all.)

- Nothing is changed in Daily until an effect is asked for **while the camera is on**. A
  *copy* of Daily's own camera track goes into the pipeline, and only once the pipeline is
  producing pictures is Daily told to send its output; Daily is then asked whether it really
  is, and if not everything is put back.
- From then on, switching effects on and off, changing the blur or the background, does **not
  touch Daily or the camera at all** — only the pipeline's settings change. The track Daily
  sends stays the same one.
- The camera going off and on is followed **inside** the pipeline: it lets go of the device
  when the camera goes off (the camera light goes out) and opens it again when it comes on.
  Switching camera is also done there (`selectCamera`), without a break in the picture.
- Only when every effect is off, or something has failed, is the camera handed back to Daily
  — by **naming the camera**, so the person's choice is kept — and the pipeline is stopped
  only after Daily has its own camera track again.
- A frame the effects cannot handle goes out unprocessed rather than not at all.
- Something that cannot be mended ends the same way every time: the camera is in Daily's
  hands (by name, so the chosen camera is kept), the control is back to *Off*, and the reason
  is shown in the panel. See "Effects that stay on" for what is mended first.

### Effects that stay on

The person's choice (*Blur*, a background, …) outlasts hiccups. The effects used to be given
up on the first sign of trouble — most often a computer that could not quite make 30 pictures
a second — and the control quietly went back to *Off* a little while into the class ("the
background is completely gone"). They are now **degraded, mended and only then given up on**:

- A **performance governor** (`effects/governor.ts`, pure logic, unit-tested) compares what a
  picture costs (drawing it and handing it on) with the time the camera gives for each. If it
  does not fit, twice in a row, it makes the work lighter a step at a time: the better
  segmentation model goes, the model runs on fewer pictures, the picture is drawn smaller (down
  to 35 % — it is only ever blur, so little shows). A computer that manages 15–20 pictures a
  second keeps the effect at that rate. It is **not** given up on for being slow.
- When there is plenty of room for a good while, a step is taken back toward full quality, one
  at a time (each time the work has had to be lightened again the wait is longer, so a computer
  on the edge settles instead of bouncing), so a short load — a screen share starting, another
  program — does not leave the picture poorer for the rest of the class.
- Only a video that has **all but stopped** — a picture takes over 250 ms, four looks in a row,
  with everything already as light as it goes — is given up on: that is worse than no effect.
- The **segmentation model** that fails three pictures in a row (its own graphics context was
  lost, say) is closed and loaded again, a moment later (0.3 s, 2 s, 8 s, 20 s — four tries in
  two minutes). Meanwhile the picture carries on with the last mask, which is used for up to
  6 s. Only if it keeps failing is the background effect taken back, with a message. The face
  finder is handled the same way (a face it cannot find is not a reason to stop the picture).
- Everything else that can go wrong — a stalled pipeline, a lost graphics context, the camera's
  track ending, repeated frame errors — makes the controller **start the effects again**
  (`videoEffects.ts`): the pipeline is stopped, Daily is back on the real camera for a moment,
  and the effects are started afresh, with the same settings and no message. Three restarts are
  allowed in five minutes (immediately, after 2 s, after 8 s); the person's own choice at any
  point gives every restart back. If it keeps breaking, it is given up on after all: the
  control goes to *Off* and says "…stopped working. Your camera is still on."
- A computer that is **too slow** to be mended by starting again (the governor's give-up) is
  not restarted — that would only repeat it — and says so at once.

### Where things are supported

| | |
|---|---|
| Browsers | Needs WebGL 2 and WebAssembly. **Verified: Chromium** (Chrome/Edge), which moves frames with insertable streams (they keep running when the tab is in the background). **Designed for, not yet tried: Firefox and Safari**, which use the fallback: a hidden `<video>` drawn onto a canvas whose stream is captured, ticked by a worker timer. Try both on a real machine before relying on them. |
| Phones and tablets | Not offered (the panel says so). |
| No graphics acceleration | The effects are offered. A computer without it runs them at a smaller picture size and a lower rate (the governor above); only if the video has all but stopped are they switched off, with a message. |

### Troubleshooting

| What the person sees | Cause | What to do |
|---|---|---|
| "Video effects aren't available …" | Phone/tablet, no WebGL 2, or an unsupported browser | Use a laptop or desktop with a current browser |
| "Background effects could not be loaded." | The models could not be downloaded (offline, or a network that blocks `storage.googleapis.com` / `cdn.jsdelivr.net`) | The standard model and the runtime are served by this app, so this means the app's own files did not load: check `/models/…` and `/mediapipe/<version>/wasm/…` answer 200 in the browser's Network tab |
| "…couldn't keep up with them" | The video had all but stopped with the effects on (a picture took over a quarter of a second, even at the lightest setting) | Close other heavy tabs/apps; the camera itself is unaffected |
| "…stopped working. Your camera is still on." | The effects broke more than three times in five minutes (a graphics driver that keeps resetting, a camera that keeps dropping) | Choose the effect again to try afresh; update the graphics driver; the console shows why each time ("The video effects pipeline failed …") and each restart ("The video effects broke and are being started again") |
| Background blurry for a moment, or edges lag behind fast movement | A slower computer segments less often and draws a smaller picture (the governor's steps); the segmentation model may be being loaded again | Expected on weak hardware; it comes back toward full quality when the load goes. The better model is only used where it is fast enough |

### Testing it

- `npm test` (in `client/`) runs the unit tests: the framing and exposure maths, the governor
  and retry budget (`effects/governor.test.ts` — including the case that used to take the
  background away: a computer at 47 ms a picture against a 33 ms interval must keep the effect
  for ever), and the controller against a fake Daily that behaves the way the real call machine
  was measured to behave (restart, pauses, bounded retries, what each kind of failure does).
- The pipeline was also run in a real browser against the **real `daily-js` call machine** with
  a fake camera playing a portrait video: lifecycle (enable, disable, camera off/on, quick
  toggles, switching camera), the output Daily really sends, the quality of the picture on real
  portraits, and the failure paths — a computer that cannot keep up (software graphics: the
  effect stayed on for 100 s at a reduced picture size, the background still blurred in what
  was sent), a lost graphics context, a stall, a failing segmentation model, and breakage that
  will not stop (restarted three times, then given up on with the message).
- Not covered: a live Daily room (that needs an account, as for the rest of the classroom) and
  physical webcams and GPUs (try a real class on a few machines).

## 2. The Pointer

The teacher's browser shows a **cursor button** in the bottom bar **only while a student is
presenting**. Turning it on lets them point at that student's shared screen, for everyone in the
class:

- **Point** — a small red dot (about 10 px, with a thin ring and a very light glow) follows their
  cursor.
- **Draw** — holding the left mouse button and moving leaves a thin (2 px), slightly transparent red
  line behind the cursor, smoothed, which fades over about 0.7 s and is gone. Nothing is drawn
  while the button is up, and the line stops when it is released.
- **Highlight** — a click (a press that hardly moves) shows one subtle ring that expands and fades
  within about 0.8 s.

All three are painted on **one canvas** over the shared screen (`components/classroom/PointerLayer.tsx`,
`lib/classroom/pointerCanvas.ts`): no element is created per movement, and the frame loop only runs
while something is moving or fading.

**How it is sent.** The room's existing app messages (`daily/protocol.ts`, kind `pointer`), at most 25
a second. A moving cursor goes out as one message per 40 ms that carries *every* point since the last
(`p`: x, y and how many ms ago, for up to 24 points) — so a quick curve is still a curve — and a
line being drawn carries its number (`k`). `x` and `y` are still the newest point, so a browser that
has not been updated yet still shows the dot. The sender drops points closer than ~3 px.
**How it is shown.** Viewers play the points back 70 ms late, on the sender's own timing
(`PointerStore`), so the dot glides instead of stepping at network speed; the teacher's own screen
shows everything at once. Positions are a **share of the shared picture's width and height** (not
pixels), so they land on the same spot on every screen whatever the size of the window or the shape of
the tile, including a letterboxed picture, the fullscreen view, and a window that is resized.

Only the teacher's messages are believed (Daily says who sent them); a message about a screen that is
not a student's share is dropped. The layer never takes the mouse, so the tile's buttons and
everything else work as before. While Pointer mode is on, double-clicking a shared screen makes two
highlights instead of going fullscreen (the fullscreen button and Esc still do). The mouse is
captured while the button is held, so its release is never missed; an interrupted press (the system
cancels it, the window loses focus, the tab is hidden) ends the line without making a click, and a
line leaving the picture ends there and starts again if the cursor comes back with the button down.

Pointer mode starts off and ends by itself when the presenter stops sharing or leaves; turning it
off — any way — takes the dot, the lines and the rings down everywhere. A dot that hears nothing for
24 s (the teacher's connection dropped) is taken down too.

### What a browser cannot do

The pointer is drawn **by Lumexa, over the shared screen as it appears in the classroom**: the
student sees it on their own tile in the Lumexa tab, and everyone else sees it on theirs. It is
**not** drawn on the student's real tab, window or screen. A web page can only paint inside its own
tab — that is the security boundary of the browser — and no web API reaches past it: Captured Surface
Control can only forward scroll and zoom to a shared tab, and a Document Picture-in-Picture window is
an opaque window whose position the browser chooses. Showing the pointer on the real content takes
software that lives outside the web page: a browser extension (tab shares only), or a desktop
companion app (any share). Neither exists today.
