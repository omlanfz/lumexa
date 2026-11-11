# Video-effects models

These are the small [MediaPipe](https://ai.google.dev/edge/mediapipe) models the classroom's
video effects need, served from the app's own origin so a classroom never waits on (or breaks
with) a third party for them. They are used by `lib/classroom/effects/models.ts`.

| File | What it is | Size |
| --- | --- | --- |
| `selfie_segmenter_landscape.tflite` | Person / background segmentation (landscape selfie model, float16). The fallback when the higher-quality model below cannot be loaded or the computer is too slow for it. | ~250 KB |
| `blaze_face_short_range.tflite` | Face detection (BlazeFace short range, float16). Used for auto-framing, touch-up and measuring the light on the face. | ~230 KB |

Both are Google's published MediaPipe models, unchanged:

- https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite
- https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite

Licence: Apache License 2.0 (the MediaPipe model cards: https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter#models ,
https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector#models).

The higher-quality segmentation model, `selfie_multiclass_256x256` (about 16 MB), is **not** kept in
the repository: it is fetched on demand, only when someone turns on a background effect, from the
pinned version path

- https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite

(`lib/classroom/effects/models.ts` falls back to the landscape model above if it cannot be reached).
