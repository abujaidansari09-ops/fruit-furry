// handTracking.js
// Wraps MediaPipe Tasks Vision (HandLandmarker) to turn webcam frames into a
// smoothed index-fingertip position mapped onto the game canvas.
//
// Landmark reference (MediaPipe Hands, 21 points per hand):
//   0  = wrist
//   8  = index finger tip
// https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker

import {
  HandLandmarker,
  FilesetResolver,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const SMOOTHING = 0.55; // higher = smoother but laggier (0-1)

export class HandTracker {
  /**
   * @param {Object} opts
   * @param {HTMLVideoElement} opts.video - hidden/preview video element for the camera stream
   * @param {(state: TrackerState) => void} opts.onUpdate - called every animation frame with the latest state
   * @param {(reason: string) => void} opts.onError - called if camera or model init fails
   */
  constructor({ video, onUpdate, onError }) {
    this.video = video;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.landmarker = null;
    this.stream = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.smoothed = null; // {x, y} in normalized [0,1] video space
    this._loop = this._loop.bind(this);
  }

  async init() {
    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
      this.landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      return true;
    } catch (err) {
      console.error('HandTracker init failed', err);
      this.onError && this.onError('model-load-failed');
      return false;
    }
  }

  async requestCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      return true;
    } catch (err) {
      console.error('Camera permission denied or unavailable', err);
      const reason = err && err.name === 'NotAllowedError' ? 'permission-denied' : 'no-camera';
      this.onError && this.onError(reason);
      return false;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  _loop() {
    if (!this.running) return;
    if (this.landmarker && this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      const result = this.landmarker.detectForVideo(this.video, performance.now());
      this._processResult(result);
    }
    requestAnimationFrame(this._loop);
  }

  _processResult(result) {
    const hasHand = result && result.landmarks && result.landmarks.length > 0;
    if (!hasHand) {
      this.onUpdate({ detected: false, x: null, y: null, confidence: 0 });
      return;
    }

    const landmarks = result.landmarks[0];
    const tip = landmarks[8];
    const wrist = landmarks[0];
    const confidence =
      result.handednesses && result.handednesses[0] && result.handednesses[0][0]
        ? result.handednesses[0][0].score
        : 0.8;

    // Mirror horizontally so the camera feels like a mirror (natural for the user).
    const rawX = 1 - tip.x;
    const rawY = tip.y;

    if (!this.smoothed) {
      this.smoothed = { x: rawX, y: rawY };
    } else {
      this.smoothed.x = this.smoothed.x * SMOOTHING + rawX * (1 - SMOOTHING);
      this.smoothed.y = this.smoothed.y * SMOOTHING + rawY * (1 - SMOOTHING);
    }

    // Rough velocity estimate using wrist->tip distance, useful for "punch" style gestures later.
    const spread = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);

    this.onUpdate({
      detected: true,
      x: this.smoothed.x, // normalized 0-1
      y: this.smoothed.y, // normalized 0-1
      confidence,
      spread,
    });
  }
}

/** Maps normalized [0,1] hand coordinates to canvas pixel coordinates. */
export function mapToCanvas(nx, ny, canvasWidth, canvasHeight) {
  return { x: nx * canvasWidth, y: ny * canvasHeight };
}

export function isHandTrackingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
