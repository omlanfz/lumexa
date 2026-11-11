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
- Every failure (a model that cannot load, a stalled pipeline, a lost GPU, a handover that does
  not complete, a computer too slow) ends the same way: the camera is in Daily's hands, the
  control is back to *Off*, and the reason is shown in the panel. A frame the effects cannot
  handle goes out unprocessed rather than not at all.
- A **performance governor** compares what a picture costs (drawing it and handing it on) with
  the time the camera gives for each. If it does not fit it makes the work lighter a step at a
  time (drops the high-quality model, segments less often, makes the picture smaller) and, if
  even that is not enough, gives the effects up rather than let the picture stutter.

### Where things are supported

| | |
|---|---|
| Browsers | Needs WebGL 2 and WebAssembly. **Verified: Chromium** (Chrome/Edge), which moves frames with insertable streams (they keep running when the tab is in the background). **Designed for, not yet tried: Firefox and Safari**, which use the fallback: a hidden `<video>` drawn onto a canvas whose stream is captured, ticked by a worker timer. Try both on a real machine before relying on them. |
| Phones and tablets | Not offered (the panel says so). |
| No graphics acceleration | The effects are offered but a computer without it will usually be too slow; the governor then switches them off with a message. |

### Troubleshooting

| What the person sees | Cause | What to do |
|---|---|---|
| "Video effects aren't available …" | Phone/tablet, no WebGL 2, or an unsupported browser | Use a laptop or desktop with a current browser |
| "Background effects could not be loaded." | The models could not be downloaded (offline, or a network that blocks `storage.googleapis.com` / `cdn.jsdelivr.net`) | The standard model and the runtime are served by this app, so this means the app's own files did not load: check `/models/…` and `/mediapipe/<version>/wasm/…` answer 200 in the browser's Network tab |
| "…couldn't keep up with them" | The computer is too slow for the picture size | Close other heavy tabs/apps; the camera itself is unaffected |
| Edges lag behind fast movement | A slower computer segments less often (the governor's second step) | Expected on weak hardware; the better model is only used where it is fast enough |

### Testing it

- `npm test` (in `client/`) runs the unit tests: the framing and exposure maths, the controller
  against a fake Daily that behaves the way the real call machine was measured to behave.
- The pipeline was also run in a real browser against the **real `daily-js` call machine** with
  a fake camera playing a portrait video: lifecycle (enable, disable, camera off/on, quick
  toggles, switching camera), the output Daily really sends, the governor's give-up path, and
  the quality of the picture on real portraits.
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
