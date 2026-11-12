# Little Coders lesson preview videos — production pipeline

Produces the **"Your Learning Preview"** video of every Little Coders lesson (40 videos) from the lesson
specs in `src/little-coders/curriculum/`, following the Lumexa lesson-preview video template:

| | |
| --- | --- |
| Format | MP4, H.264 + AAC, **1920×1080**, 16:9, 24 fps, fast-start |
| Length | about 80 seconds (target 60–100, never over 120) |
| Narration | one warm, expressive English voice for the whole program, 100–130 words per lesson |
| Subtitles | synchronized English, burned into the picture (highlighted key terms) **and** a WebVTT file |
| Music / effects | soft background music and a few purposeful sound effects, mixed under the narrator |
| Structure | six scenes: **Hook · Meet the concept · Explore & understand · See it in action · Remember this · Your turn!** |
| Host | "Pixel", the Little Coders robot; the Lumexa mark on every scene and an end card |
| Output | `<lesson>/preview.mp4`, `poster.jpg`, `captions.vtt`, `info.json` and a `manifest.json` |

The videos teach nothing the lesson does not — they *introduce, explain simply and motivate*; the lesson page
holds the full lesson.

## Licensing record

* **Narration**: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) text-to-speech (Apache-2.0, commercial
  use permitted), voice `af_heart`, speed 0.8. Run through the `kokoro-onnx` package (MIT).
* **Music and sound effects**: synthesised by this repository's own code (`audio.ts`) — no samples, no
  third-party recordings, so no licence is owed and nothing needs attribution.
* **Artwork**: drawn by this repository's own renderer (`engine/`); the Lumexa mark belongs to Lumexa.
* The same record is written into every `info.json` (`credits`).

## How a video is made

```
lesson spec ──▶ narration (narration.ts)  ──▶ Kokoro TTS (tts.py) ──▶ one WAV per sentence
                                                    │
                        sentence lengths ──▶ timeline (timeline.ts): scenes, cues, chapters
                                                    │
            ┌───────────────────────────────────────┴────────────────────────┐
            ▼                                                                ▼
   plan-builder.ts → engine/ (canvas renderer in headless Chromium)    audio.ts: voice + music + effects
   draws every frame deterministically, reusing the lesson's real       mixed to one WAV
   Scratch-stage / Python / AI runtimes for the demonstrations
            └───────────────────────────────┬────────────────────────────────┘
                                            ▼
                      render.ts → ffmpeg (libx264 CRF 22, AAC, loudness-normalised)
```

Everything is deterministic: the same lesson and the same narration give the same pictures.

## Requirements

* Node 20+, `npm install` in `server/` **and** `client/` (the engine is bundled with the esbuild that comes
  with the client's dependencies).
* **ffmpeg** (and `ffprobe`) on the PATH, or `FFMPEG_PATH=/path/to/ffmpeg`.
* A Chromium: Puppeteer downloads one on `npm install`; or set `LESSON_VIDEO_CHROMIUM_PATH`.
* Python 3.10+ with `pip install kokoro-onnx soundfile numpy`, and the two Kokoro model files in
  `~/.cache/lumexa-tts` (or `KOKORO_MODEL_DIR`):
  `kokoro-v1.0.onnx` and `voices-v1.0.bin` from <https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0>.

## Commands (from `server/`)

```bash
npm run lesson-videos:build                          # all 40 lessons (allow a few hours; resumable)
npm run lesson-videos:build -- --lesson c1l1,c4l3    # only these
npm run lesson-videos:build -- --force               # redo videos that already exist
npm run lesson-videos:build -- --workers 2           # how many videos are drawn at once (default 3)

npm run lesson-videos:preview -- --lesson c1l1 --voice <dir> --out <dir>   # a few still frames, no encoding

npm run lesson-videos:manifest                       # (re)writes src/little-coders/videos/published-videos.ts
npm run lesson-videos:upload                         # puts the videos in the R2 bucket and shows them (see below)
```

Output goes to `server/.lesson-videos/` (git-ignored — the files are far too large for git; they live in the
R2 bucket). Lessons are named `c<course>l<lesson>`: `c1l1` … `c5l8`.

The build checks each finished file the way the template's QC list asks — H.264/AAC, 1920×1080, 60–120 s, audible
narration — and reports anything outside it.

## After a (re)build

1. `npm run lesson-videos:manifest` and commit the updated `src/little-coders/videos/published-videos.ts`
   (a rebuilt video has a new SHA-256, hence a new name in the bucket).
2. `npm run lesson-videos:upload` — see `docs/LESSON_VIDEOS_SETUP.md` for the bucket, token and options.

## Changing a lesson's video

The script, scenes, on-screen text, demonstration and challenge of a lesson all come from its spec in
`src/little-coders/curriculum/course<N>.ts` (`video`, `concepts`, `examples`, `demo`, `tips`, `challenge`).
Edit the spec, rebuild just that lesson (`--lesson c2l3 --force`), regenerate the manifest, upload.

Narration is cached per sentence in `.lesson-videos/voice/`; a changed sentence is re-spoken, the rest reused.
