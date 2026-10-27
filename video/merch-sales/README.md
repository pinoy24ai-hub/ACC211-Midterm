# Sales under the Perpetual Inventory System (narrated video)

`merch-sales.mp4` is a 10.5-minute, 1080p narrated overview of journal entries for merchandise sales:
(a) cash sale, (b) sale on account 2/10, n/30, freight-out (FOB destination), a sales return and a sales
allowance, (c) collection within the discount period (and after it), the Merchandise Inventory and Cost of Goods Sold
T-accounts, and a multi-step income statement.

## Editing
- Slide content and narration script: `slides.mjs` (each step has `html` and `say`).
- Look and layout: `style.css`.
- Rebuild: `VOICE=/path/to/voice.onnx bash build.sh` (needs Node with Playwright, ffmpeg, and `pip install piper-tts`).
  The voice used is Piper `en_US-joe-medium` (CC0).
