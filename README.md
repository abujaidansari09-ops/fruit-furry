# 🍉 Fruit Fury — Camera Controlled Fruit Cutter

A browser-based Fruit Ninja-style game where your **index finger**, tracked live through your webcam, is the blade. No backend, no build step — just open it in a browser.

## Features

- **Webcam finger tracking** via MediaPipe Tasks Vision (`HandLandmarker`), loaded from CDN — no install needed.
- Smoothed fingertip tracking mapped to the canvas; slicing is detected along the finger's **movement path**, not just its current point, so fast swipes still register.
- 12 fruits with layered gradients, highlights, shadows, rotation and juice-splash slicing.
- Bombs with a lit fuse — slice one and you lose a life, screen shakes, and it explodes.
- Combo system with multiplier, animated "🔥 COMBO!" banner, and screen shake on big combos.
- 4 power-ups: Extra Life, Slow Motion, Fire Blade (2x score), Fruit Magnet (bigger hit radius).
- 4 game modes: Classic, Time Attack (60s), Endless (ramping difficulty), Zen (no bombs).
- Progressive difficulty: spawn rate, fruit speed, simultaneous fruit count, and bomb frequency all scale with score.
- High score, highest combo, and games played saved to `localStorage` — persists across refreshes.
- Fully synthesized sound effects via the Web Audio API (no audio files required) with a Sound On/Off toggle.
- Hand-calibration screen before gameplay starts, with a live tracking dot to confirm accuracy.
- Camera preview with live "Hand detected ✓" / "Move your hand into view" status.
- Graceful fallback to mouse/touch control if the camera is denied, unavailable, or hand tracking fails to load.
- Responsive layout for desktop, laptop, tablet, and mobile.

## Project structure

```
Fruit-Fury/
├── index.html        All screens: menu, modes, settings, how-to-play, calibration, game, game over
├── style.css          All styling, responsive layout, animations
├── gameConfig.js       Fruit/bomb/power-up definitions, difficulty tuning, mode definitions
├── audio.js            Web Audio API sound synthesis (slice, explosion, combo, etc.)
├── handTracking.js     MediaPipe Tasks Vision wrapper — camera + fingertip smoothing
├── game.js             Main engine: state machine, physics, slicing, rendering, UI wiring
└── README.md
```

## Running it locally

Browsers block camera access and ES module imports from `file://` URLs, so serve the folder over local HTTP:

**Option A — Python (built into most systems):**
```bash
cd Fruit-Fury
python3 -m http.server 8000
```
Then open **http://localhost:8000** in Chrome, Edge, or Firefox.

**Option B — Node:**
```bash
cd Fruit-Fury
npx serve .
```

**Option C — VS Code:** install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server."

> Opening `index.html` directly by double-clicking it will *not* work — the browser will block both the camera and the module imports.

## How to play

1. Click **Start Game**. Grant camera access when prompted.
2. On the calibration screen, show your hand to the webcam until you see a blue dot tracking your index fingertip. Click **Ready!**.
3. Move your index finger across fruit to slice it. Avoid bombs. Slicing/missing costs a life; missing 3 (or slicing 3 bombs) ends the run.
4. No camera, or don't want to use one? Click **Use Mouse/Touch Instead** on the calibration or permission screen, or flip **Control Mode** in Settings before starting.

## Notes on hand tracking

- Uses Google's [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) `HandLandmarker`, loaded as an ES module from `cdn.jsdelivr.net`, with the model weights fetched from `storage.googleapis.com`. **An internet connection is required** the first time it loads (results are cached by the browser afterward).
- Only the index fingertip (landmark 8) and wrist (landmark 0) are used for gameplay; the tracker requests just one hand for performance.
- Fingertip coordinates are exponentially smoothed to cut jitter, and the video is mirrored so the game feels like looking in a mirror.
- If MediaPipe fails to load (offline, unsupported browser, blocked CDN) or the camera permission is denied, the game automatically offers the mouse/touch fallback instead of getting stuck.

## Assets

This build draws all fruit, bombs, and power-ups procedurally on `<canvas>` using gradients, shadows, and emoji accents — no image files are required. The `assets/` folders are included as drop-in points if you'd rather swap in real artwork or recorded sound effects later:

- `assets/fruits/` — swap in PNG/SVG fruit art and reference it from `_drawFruitShape()` in `game.js`.
- `assets/sounds/` — drop in `.mp3`/`.wav` files and load them with `AudioContext.decodeAudioData` in `audio.js` in place of the synthesized oscillators.
- `assets/images/` — any other UI imagery (backgrounds, logo, icons).

## Browser support

Requires a modern browser with WebRTC (`getUserMedia`), ES modules, WebGL/WASM (for MediaPipe), and the Web Audio API — current Chrome, Edge, Firefox, and Safari all qualify. iOS Safari requires the page to be served over **HTTPS** (or `localhost`) for camera access to work.
