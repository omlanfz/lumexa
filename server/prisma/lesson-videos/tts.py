#!/usr/bin/env python3
"""Narration for the Little Coders lesson preview videos, spoken by Kokoro-82M (Apache-2.0).

    python tts.py jobs.json

jobs.json
    {
      "modelDir": "/path/with/kokoro-v1.0.onnx-and-voices-v1.0.bin",
      "voice": "af_heart",            # one narrator for the whole program
      "speed": 0.92,                  # a comfortable, conversational pace
      "outDir": "/path/for/wavs",
      "items": [{"id": "c1l1-s0-0", "text": "Every game you love ..."}, ...]
    }

Every item becomes <outDir>/<id>.wav (24 kHz, mono, 16-bit, silence trimmed). Items whose file
already exists are skipped, so an interrupted run resumes. <outDir>/durations.json maps each id
to its length in seconds. Install once with:  pip install kokoro-onnx soundfile
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

PAD = 0.06  # seconds of natural silence kept at each end
FADE = 0.008


def trim(samples: np.ndarray, rate: int) -> np.ndarray:
    loud = np.flatnonzero(np.abs(samples) > 0.004)
    if loud.size == 0:
        return samples
    pad = int(PAD * rate)
    start = max(0, int(loud[0]) - pad)
    end = min(len(samples), int(loud[-1]) + pad)
    out = samples[start:end].copy()
    n = min(int(FADE * rate), len(out) // 2)
    if n > 0:
        ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
        out[:n] *= ramp
        out[-n:] *= ramp[::-1]
    return out


def main() -> None:
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    out_dir = jobs["outDir"]
    os.makedirs(out_dir, exist_ok=True)
    model_dir = jobs["modelDir"]
    kokoro = Kokoro(
        os.path.join(model_dir, "kokoro-v1.0.onnx"),
        os.path.join(model_dir, "voices-v1.0.bin"),
    )
    voice = jobs.get("voice", "af_heart")
    speed = float(jobs.get("speed", 0.92))
    lang = "en-gb" if voice.startswith("b") else "en-us"

    durations_path = os.path.join(out_dir, "durations.json")
    durations = json.load(open(durations_path)) if os.path.exists(durations_path) else {}
    done = 0
    for item in jobs["items"]:
        path = os.path.join(out_dir, item["id"] + ".wav")
        if os.path.exists(path) and item["id"] in durations:
            continue
        samples, rate = kokoro.create(item["text"], voice=voice, speed=speed, lang=lang)
        samples = trim(np.asarray(samples, dtype=np.float32), rate)
        sf.write(path, samples, rate, subtype="PCM_16")
        durations[item["id"]] = round(len(samples) / rate, 4)
        done += 1
        if done % 25 == 0:
            json.dump(durations, open(durations_path, "w"), indent=1)
            print(f"  {done} sentences spoken", flush=True)
    json.dump(durations, open(durations_path, "w"), indent=1)
    print(f"narration ready: {len(durations)} sentences ({done} new)", flush=True)


if __name__ == "__main__":
    main()
