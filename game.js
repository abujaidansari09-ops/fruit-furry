/* =========================================================
   🍉 FRUIT FURY - CAMERA HAND TRACKING GAME
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   ELEMENTS
--------------------------------------------------------- */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const video = document.getElementById("camera");

const menu = document.getElementById("menu");
const gameOver = document.getElementById("gameOver");
const pauseScreen = document.getElementById("pauseScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const cameraBtn = document.getElementById("cameraBtn");

const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const livesEl = document.getElementById("lives");

const finalScoreEl = document.getElementById("finalScore");
const bestLineEl = document.getElementById("bestLine");

const statusEl = document.getElementById("status");


/* ---------------------------------------------------------
   SAFE STATUS FUNCTION
--------------------------------------------------------- */

function setStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }

    console.log("[Fruit Fury]", message);
}


/* ---------------------------------------------------------
   CANVAS
--------------------------------------------------------- */

let W = window.innerWidth;
let H = window.innerHeight;

let DPR = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {

    W = window.innerWidth;
    H = window.innerHeight;

    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = W * DPR;
    canvas.height = H * DPR;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(
        DPR,
        0,
        0,
        DPR,
        0,
        0
    );
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


/* ---------------------------------------------------------
   GAME VARIABLES
--------------------------------------------------------- */

let gameRunning = false;
let paused = false;

let score = 0;
let combo = 1;
let lives = 3;

let bestScore =
    Number(localStorage.getItem("fruitFuryBest") || 0);

let fruits = [];
let particles = [];
let bladeTrail = [];

let spawnTimer = 0;

let lastTime = performance.now();

let shake = 0;


/* ---------------------------------------------------------
   POINTER
--------------------------------------------------------- */

let pointer = {
    x: W / 2,
    y: H / 2,
    active: false
};


/* ---------------------------------------------------------
   CAMERA
--------------------------------------------------------- */

let cameraStream = null;

let cameraEnabled = false;

let cameraLoading = false;

let handLandmarker = null;

let mediaPipeLoaded = false;


/* ---------------------------------------------------------
   FRUIT TYPES
--------------------------------------------------------- */

const FRUIT_TYPES = [

    {
        emoji: "🍉",
        radius: 46,
        points: 10
    },

    {
        emoji: "🍎",
        radius: 40,
        points: 12
    },

    {
        emoji: "🍊",
        radius: 40,
        points: 11
    },

    {
        emoji: "🍑",
        radius: 41,
        points: 13
    },

    {
        emoji: "🍍",
        radius: 45,
        points: 15
    },

    {
        emoji: "🥝",
        radius: 39,
        points: 14
    }

];

const BOMB = {
    emoji: "💣",
    radius: 43,
    bomb: true,
    points: 0
};


/* ---------------------------------------------------------
   HUD
--------------------------------------------------------- */

function updateHUD() {

    if (scoreEl) {
        scoreEl.textContent = score;
    }

    if (comboEl) {
        comboEl.textContent = "x" + combo;
    }

    if (livesEl) {
        livesEl.textContent =
            "❤️".repeat(Math.max(0, lives)) +
            "🖤".repeat(Math.max(0, 3 - lives));
    }
}


/* ---------------------------------------------------------
   START GAME
--------------------------------------------------------- */

function startGame() {

    console.log("Starting Fruit Fury...");

    score = 0;
    combo = 1;
    lives = 3;

    fruits = [];
    particles = [];
    bladeTrail = [];

    spawnTimer = 0;

    gameRunning = true;
    paused = false;

    if (menu) {
        menu.classList.add("hidden");
    }

    if (gameOver) {
        gameOver.classList.add("hidden");
    }

    if (pauseScreen) {
        pauseScreen.classList.add("hidden");
    }

    updateHUD();

    if (cameraEnabled) {

        setStatus(
            "☝️ Camera mode ON — move your index finger!"
        );

    } else {

        setStatus(
            "🖱️ Mouse mode ON — slice the fruits!"
        );

    }
}


/* ---------------------------------------------------------
   GAME OVER
--------------------------------------------------------- */

function endGame() {

    gameRunning = false;

    bestScore =
        Math.max(bestScore, score);

    localStorage.setItem(
        "fruitFuryBest",
        bestScore
    );

    if (finalScoreEl) {
        finalScoreEl.textContent = score;
    }

    if (bestLineEl) {
        bestLineEl.textContent =
            "Best: " + bestScore;
    }

    if (gameOver) {
        gameOver.classList.remove("hidden");
    }

    setStatus("Game Over!");
}


/* ---------------------------------------------------------
   SPAWN FRUIT
--------------------------------------------------------- */

function spawnFruit() {

    const useBomb =
        Math.random() < 0.09;

    const type =
        useBomb
            ? BOMB
            : FRUIT_TYPES[
                Math.floor(
                    Math.random() *
                    FRUIT_TYPES.length
                )
            ];

    const radius =
        type.radius *
        (W < 600 ? 0.8 : 1);


    const fruit = {

        emoji: type.emoji,

        radius: radius,

        points: type.points,

        bomb: !!type.bomb,

        x:
            radius +
            Math.random() *
            Math.max(
                10,
                W - radius * 2
            ),

        y:
            H + radius + 10,

        vx:
            -180 +
            Math.random() * 360,

        vy:
            -800 -
            Math.random() * 280,

        rotation:
            Math.random() *
            Math.PI *
            2,

        rotationSpeed:
            -6 +
            Math.random() * 12,

        sliced: false

    };


    fruits.push(fruit);
}


/* ---------------------------------------------------------
   PARTICLES
--------------------------------------------------------- */

function createParticles(x, y, amount) {

    for (let i = 0; i < amount; i++) {

        const angle =
            Math.random() *
            Math.PI *
            2;

        const speed =
            80 +
            Math.random() *
            450;


        particles.push({

            x: x,
            y: y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed -
                120,

            size:
                2 +
                Math.random() *
                6,

            life: 1,

            gravity:
                650 +
                Math.random() *
                500

        });
    }
}


/* ---------------------------------------------------------
   SLICE FRUIT
--------------------------------------------------------- */

function sliceFruit(fruit) {

    if (fruit.sliced) {
        return;
    }

    fruit.sliced = true;


    /* BOMB */

    if (fruit.bomb) {

        lives--;

        combo = 1;

        shake = 25;

        createParticles(
            fruit.x,
            fruit.y,
            50
        );

        updateHUD();

        if (lives <= 0) {
            endGame();
        }

        return;
    }


    /* NORMAL FRUIT */

    score +=
        fruit.points *
        combo;

    combo =
        Math.min(
            combo + 1,
            10
        );


    createParticles(
        fruit.x,
        fruit.y,
        30
    );

    updateHUD();
}


/* ---------------------------------------------------------
   DISTANCE
--------------------------------------------------------- */

function distance(x1, y1, x2, y2) {

    return Math.sqrt(
        Math.pow(x1 - x2, 2) +
        Math.pow(y1 - y2, 2)
    );
}


/* ---------------------------------------------------------
   UPDATE GAME
--------------------------------------------------------- */

function update(dt) {

    const difficulty =
        1 +
        Math.min(
            1.8,
            score / 600
        );


    /* Spawn */

    spawnTimer -= dt;

    if (spawnTimer <= 0) {

        spawnFruit();

        if (Math.random() < 0.25) {
            spawnFruit();
        }

        spawnTimer =
            Math.max(
                0.20,
                0.72 / difficulty
            );
    }


    /* Fruits */

    for (const fruit of fruits) {

        fruit.vy +=
            720 * dt;

        fruit.x +=
            fruit.vx * dt;

        fruit.y +=
            fruit.vy * dt;

        fruit.rotation +=
            fruit.rotationSpeed * dt;


        /* Wall bounce */

        if (fruit.x < fruit.radius) {

            fruit.x =
                fruit.radius;

            fruit.vx =
                Math.abs(fruit.vx);
        }


        if (
            fruit.x >
            W - fruit.radius
        ) {

            fruit.x =
                W - fruit.radius;

            fruit.vx =
                -Math.abs(fruit.vx);
        }
    }


    /* Missed fruits */

    let missed = 0;

    fruits =
        fruits.filter(fruit => {

            if (
                !fruit.sliced &&
                fruit.y >
                H + fruit.radius + 100
            ) {

                if (!fruit.bomb) {
                    missed++;
                }

                return false;
            }

            return !fruit.sliced;
        });


    if (missed > 0) {

        lives -= missed;

        combo = 1;

        updateHUD();

        if (lives <= 0) {
            endGame();
            return;
        }
    }


    /* Particles */

    for (const p of particles) {

        p.x +=
            p.vx * dt;

        p.y +=
            p.vy * dt;

        p.vy +=
            p.gravity * dt;

        p.life -=
            dt * 1.8;
    }


    particles =
        particles.filter(
            p => p.life > 0
        );


    /* Collision with blade */

    if (bladeTrail.length > 0) {

        const tip =
            bladeTrail[
                bladeTrail.length - 1
            ];


        for (const fruit of fruits) {

            if (fruit.sliced) {
                continue;
            }


            const d =
                distance(
                    tip.x,
                    tip.y,
                    fruit.x,
                    fruit.y
                );


            if (
                d <
                fruit.radius + 25
            ) {

                sliceFruit(fruit);
            }
        }
    }


    /* Blade fade */

    for (const point of bladeTrail) {

        point.life -=
            dt * 3.2;
    }


    bladeTrail =
        bladeTrail.filter(
            p => p.life > 0
        );


    /* Screen shake */

    if (shake > 0) {
        shake *= 0.88;
    }
}


/* ---------------------------------------------------------
   DRAW BACKGROUND
--------------------------------------------------------- */

function drawBackground() {

    ctx.fillStyle =
        "#050b0b";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H * 0.65,
            10,
            W / 2,
            H * 0.65,
            Math.max(W, H)
        );


    gradient.addColorStop(
        0,
        "rgba(40,130,80,0.16)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );


    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );
}


/* ---------------------------------------------------------
   DRAW FRUIT
--------------------------------------------------------- */

function drawFruit(fruit) {

    ctx.save();

    ctx.translate(
        fruit.x,
        fruit.y
    );

    ctx.rotate(
        fruit.rotation
    );


    ctx.shadowColor =
        fruit.bomb
            ? "rgba(255,40,40,0.65)"
            : "rgba(100,255,140,0.45)";

    ctx.shadowBlur = 25;


    ctx.font =
        `${fruit.radius * 1.75}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    ctx.fillText(
        fruit.emoji,
        0,
        5
    );


    ctx.restore();
}


/* ---------------------------------------------------------
   DRAW PARTICLES
--------------------------------------------------------- */

function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(0, p.life);

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#ffffff";

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* ---------------------------------------------------------
   DRAW BLADE
--------------------------------------------------------- */

function drawBlade() {

    if (bladeTrail.length < 2) {
        return;
    }


    ctx.save();

    ctx.lineCap =
        "round";

    ctx.lineJoin =
        "round";

    ctx.shadowColor =
        "#7dffb2";

    ctx.shadowBlur =
        22;


    for (
        let i = 1;
        i < bladeTrail.length;
        i++
    ) {

        const a =
            bladeTrail[i - 1];

        const b =
            bladeTrail[i];


        ctx.globalAlpha =
            Math.min(
                a.life,
                b.life
            );


        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth =
            3 +
            (
                i /
                bladeTrail.length
            ) * 8;


        ctx.beginPath();

        ctx.moveTo(
            a.x,
            a.y
        );

        ctx.lineTo(
            b.x,
            b.y
        );

        ctx.stroke();
    }


    ctx.restore();

    ctx.globalAlpha = 1;
}


/* ---------------------------------------------------------
   DRAW
--------------------------------------------------------- */

function draw() {

    ctx.save();


    if (shake > 1) {

        ctx.translate(
            (Math.random() - 0.5) *
            shake,

            (Math.random() - 0.5) *
            shake
        );
    }


    drawBackground();


    for (const fruit of fruits) {
        drawFruit(fruit);
    }


    drawParticles();

    drawBlade();


    ctx.restore();
}


/* =========================================================
   POINTER / MOUSE / TOUCH
========================================================= */

function updatePointer(x, y) {

    pointer.x = x;
    pointer.y = y;
    pointer.active = true;


    if (
        gameRunning &&
        !paused
    ) {

        bladeTrail.push({

            x: x,
            y: y,
            life: 1

        });


        if (
            bladeTrail.length > 25
        ) {

            bladeTrail.shift();
        }
    }
}


canvas.addEventListener(
    "pointermove",
    event => {

        updatePointer(
            event.clientX,
            event.clientY
        );
    }
);


canvas.addEventListener(
    "pointerdown",
    event => {

        updatePointer(
            event.clientX,
            event.clientY
        );
    }
);


canvas.addEventListener(
    "pointerleave",
    () => {

        pointer.active = false;
    }
);


/* =========================================================
   CAMERA
========================================================= */

async function enableCamera() {

    if (cameraLoading) {
        return;
    }


    if (cameraEnabled) {

        setStatus(
            "✅ Camera already active — show your index finger!"
        );

        return;
    }


    /* Browser check */

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        setStatus(
            "❌ Your browser does not support camera access."
        );

        return;
    }


    cameraLoading = true;


    cameraBtn.disabled = true;

    cameraBtn.textContent =
        "⏳ Opening Camera...";


    setStatus(
        "📷 Requesting camera permission..."
    );


    try {

        /* -------------------------------------------------
           GET CAMERA
        ------------------------------------------------- */

        cameraStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        facingMode: "user",

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false
                });


        /* Attach camera */

        video.srcObject =
            cameraStream;

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;


        await video.play();


        setStatus(
            "✅ Camera connected! Loading hand tracking..."
        );


        /* -------------------------------------------------
           LOAD MEDIAPIPE ONLY NOW
        ------------------------------------------------- */

        const visionModule =
            await import(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm"
            );


        const FilesetResolver =
            visionModule.FilesetResolver;

        const HandLandmarker =
            visionModule.HandLandmarker;


        /* WASM */

        const vision =
            await FilesetResolver
                .forVisionTasks(

                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"

                );


        setStatus(
            "🧠 Loading AI hand tracking..."
        );


        /* -------------------------------------------------
           HAND LANDMARKER
        ------------------------------------------------- */

        try {

            handLandmarker =
                await HandLandmarker
                    .createFromOptions(

                        vision,

                        {

                            baseOptions: {

                                modelAssetPath:
                                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

                                delegate:
                                    "GPU"

                            },

                            runningMode:
                                "VIDEO",

                            numHands: 1,

                            minHandDetectionConfidence:
                                0.45,

                            minHandPresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45

                        }
                    );

        } catch (gpuError) {

            console.warn(
                "GPU failed. Trying CPU...",
                gpuError
            );


            /* CPU fallback */

            handLandmarker =
                await HandLandmarker
                    .createFromOptions(

                        vision,

                        {

                            baseOptions: {

                                modelAssetPath:
                                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

                                delegate:
                                    "CPU"

                            },

                            runningMode:
                                "VIDEO",

                            numHands: 1,

                            minHandDetectionConfidence:
                                0.45,

                            minHandPresenceConfidence:
                                0.45,

                            minTrackingConfidence:
                                0.45

                        }
                    );
        }


        /* SUCCESS */

        cameraEnabled = true;

        mediaPipeLoaded = true;

        cameraBtn.disabled = false;

        cameraBtn.textContent =
            "📷 Camera Enabled ✓";


        setStatus(
            "☝️ READY! Show your index finger to the camera."
        );


        console.log(
            "✅ Camera + MediaPipe ready!"
        );


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraEnabled = false;

        mediaPipeLoaded = false;


        /* Stop camera */

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            cameraStream = null;
        }


        video.srcObject = null;


        cameraBtn.disabled = false;

        cameraBtn.textContent =
            "📷 Enable Camera";


        /* Error messages */

        if (
            error.name ===
            "NotAllowedError"
        ) {

            setStatus(
                "❌ Camera permission denied. Browser settings में Camera → Allow करो."
            );

        } else if (
            error.name ===
            "NotFoundError"
        ) {

            setStatus(
                "❌ Camera नहीं मिली."
            );

        } else if (
            error.name ===
            "NotReadableError"
        ) {

            setStatus(
                "❌ Camera किसी दूसरी app में use हो रही है."
            );

        } else {

            setStatus(
                "❌ Camera/AI loading failed. F12 Console check करो."
            );
        }

    }


    cameraLoading = false;
}


/* =========================================================
   HAND TRACKING
========================================================= */

function trackHand(timestamp) {

    if (
        !cameraEnabled ||
        !handLandmarker ||
        !video
    ) {

        return;
    }


    if (
        video.readyState < 2
    ) {

        return;
    }


    try {

        const result =
            handLandmarker.detectForVideo(
                video,
                timestamp
            );


        if (
            !result ||
            !result.landmarks ||
            result.landmarks.length === 0
        ) {

            return;
        }


        /* First hand */

        const hand =
            result.landmarks[0];


        /* Index finger tip = landmark 8 */

        const indexTip =
            hand[8];


        if (!indexTip) {
            return;
        }


        /* Camera is mirrored */

        const x =
            (1 - indexTip.x) * W;

        const y =
            indexTip.y * H;


        pointer.x = x;
        pointer.y = y;
        pointer.active = true;


        /* Add blade point */

        if (
            gameRunning &&
            !paused
        ) {

            bladeTrail.push({

                x: x,
                y: y,
                life: 1

            });


            if (
                bladeTrail.length > 25
            ) {

                bladeTrail.shift();
            }
        }


    } catch (error) {

        console.warn(
            "Hand tracking error:",
            error
        );
    }
}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(timestamp) {

    const dt =
        Math.min(
            0.033,
            (timestamp - lastTime) / 1000
        );


    lastTime =
        timestamp;


    /* Camera tracking */

    if (cameraEnabled) {

        trackHand(timestamp);
    }


    /* Game */

    if (
        gameRunning &&
        !paused
    ) {

        update(dt);
    }


    draw();


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   BUTTONS
========================================================= */

if (startBtn) {

    startBtn.addEventListener(
        "click",
        startGame
    );
}


if (restartBtn) {

    restartBtn.addEventListener(
        "click",
        startGame
    );
}


if (cameraBtn) {

    cameraBtn.addEventListener(
        "click",
        enableCamera
    );
}


/* =========================================================
   PAUSE
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        if (
            event.key.toLowerCase() === "p" &&
            gameRunning
        ) {

            paused =
                !paused;


            if (pauseScreen) {

                pauseScreen.classList.toggle(
                    "hidden",
                    !paused
                );
            }


            setStatus(
                paused
                    ? "⏸️ Game Paused"
                    : "▶️ Game Resumed"
            );
        }
    }
);


/* =========================================================
   INITIALIZE
========================================================= */

updateHUD();

setStatus(
    "🎮 Ready! Start the game or enable camera."
);

requestAnimationFrame(
    gameLoop
);

console.log(
    "🍉 Fruit Fury JavaScript loaded successfully!"
);