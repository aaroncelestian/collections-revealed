#!/usr/bin/env bash
#
# Turns the raw drop-box files in assets/ into presentation-ready files in public/.
# Idempotent: safe to re-run after replacing any source file.
#
# Requires: ffmpeg, sips (macOS built-in).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets"
IMG="$ROOT/public/assets/images"
ZOOM="$IMG/zoom"
VID="$ROOT/public/assets/video"

mkdir -p "$ZOOM" "$VID"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing required tool: $1" >&2; exit 1; }
}
need ffmpeg
need sips

echo "==> anchor still"
# The talk's home base. Same file every time it returns on screen.
cp -f "$SRC/halite-trona.jpg" "$IMG/anchor-searles-halite.jpg"

echo "==> zoom ladder (tif -> jpg)"
for n in 01 02 03 04; do
  tif="$SRC/halite_sm_${n}.tif"
  [ -f "$tif" ] || { echo "   skip halite_sm_${n}.tif (not found)"; continue; }
  sips --setProperty format jpeg \
       --setProperty formatOptions 92 \
       "$tif" --out "$ZOOM/halite-zoom-${n}.jpg" >/dev/null
  echo "   halite-zoom-${n}.jpg"
done

echo "==> searching-for-life film (mov -> mp4)"
MOV="$SRC/Videos_Searching for Life in Salt Crystals small file.mov"
if [ -f "$MOV" ]; then
  ffmpeg -y -loglevel error -i "$MOV" \
    -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$VID/searching-for-life.mp4"
  echo "   searching-for-life.mp4"

  # Poster frame doubles as the degrade-path still for this beat.
  ffmpeg -y -loglevel error -ss 3 -i "$VID/searching-for-life.mp4" \
    -frames:v 1 -q:v 3 "$IMG/searching-for-life-poster.jpg"
  echo "   searching-for-life-poster.jpg"
else
  echo "   skip (source .mov not found)"
fi

echo "==> done"
