# Purchases under the Perpetual Inventory System (narrated video)

`merch-perpetual.mp4` is an 8-minute, 1080p narrated overview of journal entries for merchandise purchases:
(a) purchase for cash, (b) purchase on account 2/10, n/30 and its payment, (c) freight FOB shipping point,
(d) purchase returns, (e) purchase allowances, and the Merchandise Inventory T-account.

## Editing
- Slide content and narration script: `slides.mjs` (each step has `html` and `say`).
- Look and layout: `style.css`.
- Rebuild: `VOICE=/path/to/voice.onnx bash build.sh` (needs Node with Playwright, ffmpeg, and `pip install piper-tts`).
  The voice used is Piper `en_US-joe-medium` (CC0).
