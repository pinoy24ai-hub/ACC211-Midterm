#!/usr/bin/env bash
# Builds merch-sales.mp4: renders slides, narrates them with Piper TTS, and joins them with ffmpeg.
# Needs: node + playwright, ffmpeg, `pip install piper-tts`, and a Piper voice (VOICE=path/to/model.onnx,
# with its .onnx.json next to it).
set -euo pipefail
cd "$(dirname "$0")"
VOICE="${VOICE:?set VOICE to a Piper .onnx voice model}"

rm -rf build && node render.mjs
mkdir -p build/audio build/clips
: > build/clips.txt
for txt in build/narration/*.txt; do
  id=$(basename "$txt" .txt)
  python3 -m piper -m "$VOICE" --length-scale 1.08 --sentence-silence 0.35 -f "build/audio/$id.wav" < "$txt"
  # Hold each slide for its narration plus a short pause at each end.
  ffmpeg -loglevel error -y -loop 1 -i "build/frames/$id.png" -i "build/audio/$id.wav" \
    -af "adelay=600|600,apad=pad_dur=1.2,aresample=44100" -shortest \
    -c:v libx264 -tune stillimage -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k "build/clips/$id.mp4"
  echo "file 'clips/$id.mp4'" >> build/clips.txt
done
ffmpeg -loglevel error -y -f concat -safe 0 -i build/clips.txt -c copy -movflags +faststart merch-sales.mp4
echo "Wrote $(pwd)/merch-sales.mp4"
