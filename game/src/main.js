// Island Hopper — main.js
// One job: the game loop, the state machine (menu / flying / paused /
// crashed / complete), mission progress, scoring and the ?shot= presets
// used to capture deterministic screenshots.

import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_TITLE, MISSION_SEEDS, MISSIONS_TOTAL, MISSION_TIME_LIMIT, RING_RADIUS, RING_SCORE, RING_TIME_BONUS, LANDING_SCORE, PERFECT_LANDING_BONUS } from './config.js';
import { bindInput, controls, resetControls } from './input.js';
import { createPlaneState, stepFlight, refuelPlane, distance2D, bearingTo, headingError } from './physics.js';
import { buildWorld, buildRingCourse, groundHeightForLanding, pointOnRunway } from './world.js';
import { drawScene, drawMenuOverlay, drawPauseOverlay, drawCrashOverlay, drawCompleteOverlay, drawOutOfTimeOverlay } from './render.js';
import { initAudio, updateEngineSound, playRingChime, playClick, playLandingFanfare, playCrashThud, playLowFuelAlert, toggleMute } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot'); // takeoff | rings | landing | results | null

function createGameState(mission) {
  const seed = MISSION_SEEDS[(mission - 1) % MISSION_SEEDS.length];
  const world = buildWorld(seed);
  const rings = buildRingCourse(world, mission);
  const plane = createPlaneState();
  const startHeading = (world.start.runwayHeading * Math.PI) / 180;
  plane.x = world.start.x - Math.sin(startHeading) * 160;
  plane.z = world.start.z - Math.cos(startHeading) * 160;
  plane.heading = world.start.runwayHeading;
  plane.altitude = 0;
  plane.onGround = true;
  return {
    now: 0,
    phase: 'menu', // menu | flying | paused | crashed | complete | outoftime
    mission,
    world,
    rings,
    ringsPassed: 0,
    nextRing: rings[0],
    nextRingDistance: 0,
    plane,
    score: 0,
    timeLeft: MISSION_TIME_LIMIT,
    missionTime: 0,
    message: '',
    messageUntil: 0,
    crashReason: '',
    lowFuelWarned: false,
    lastBeep: 0,
  };
}

let state = createGameState(1);

function showMessage(text, seconds) {
  state.message = text;
  state.messageUntil = state.now + seconds;
}

function startFlying() {
  initAudio();
  playClick();
  state.phase = 'flying';
  resetControls();
  showMessage(`MISI ${state.mission}: LEWATI 5 RING, LALU MENDARAT!`, 4);
}

function restartMission() {
  const mission = state.mission;
  const keepScore = state.phase === 'complete' ? state.score : 0;
  state = createGameState(mission);
  state.score = keepScore;
  state.phase = 'flying';
  showMessage(`MISI ${mission} — SIAP TERBANG!`, 3);
}

function nextMission() {
  const score = state.score;
  const mission = Math.min(state.mission + 1, MISSIONS_TOTAL);
  state = createGameState(mission);
  state.score = score;
  state.phase = 'flying';
  showMessage(`MISI ${mission}: RUTE BARU, RING BARU!`, 4);
}

function restartAll() {
  state = createGameState(1);
  state.phase = 'flying';
  showMessage('MISI 1 — SIAP TERBANG!', 3);
}

// ---- Collision, rings and landing, checked every frame while flying ----

function checkRings() {
  const ring = state.nextRing;
  if (!ring) return;
  const horizontal = distance2D(state.plane.x, state.plane.z, ring.x, ring.z);
  const vertical = Math.abs(state.plane.altitude - ring.y);
  if (horizontal < RING_RADIUS && vertical < RING_RADIUS) {
    ring.passed = true;
    state.ringsPassed += 1;
    state.score += RING_SCORE;
    state.timeLeft += RING_TIME_BONUS;
    playRingChime();
    if (state.ringsPassed >= state.rings.length) {
      state.nextRing = null;
      showMessage('SEMUA RING DILEWATI! MENDARAT DI RUNWAY TUJUAN!', 5);
    } else {
      state.nextRing = state.rings[state.ringsPassed];
      showMessage(`RING ${ring.index} DILEWATI! +${RING_SCORE}  (+${RING_TIME_BONUS} dtk)`, 3);
    }
  }
}

function checkLandingAndCrash(dt) {
  const p = state.plane;
  const ground = groundHeightForLanding(state.world, p.x, p.z);
  const onRunway = pointOnRunway(state.world.finish, p.x, p.z) ||
    pointOnRunway(state.world.start, p.x, p.z);

  if (p.altitude <= ground + 0.5 && p.speed < 200) {
    if (onRunway && state.nextRing === null && p.speed < 62 && Math.abs(headingError(p.heading, state.world.finish.runwayHeading)) < 30) {
      landPlane();
      return;
    }
    if (onRunway && p.speed < 62 && p.verticalSpeed > -6) {
      // Rolling or touching down on a runway mid-mission: safe, keep going.
      p.altitude = ground;
      p.onGround = true;
      return;
    }
    if (p.altitude <= 0.5 && !onRunway) {
      crashPlane(p.altitude <= 0.5 && ground > 2 ? 'Menabrak bukit di pulau!' : 'Jatuh ke laut!');
      return;
    }
    if (p.altitude <= ground + 0.5 && ground > 2) {
      crashPlane('Menabrak bukit di pulau!');
      return;
    }
  }
  // Ran out of fuel in the air: glide down, crash on the water/ground.
  if (p.fuel <= 0 && p.altitude > 1 && p.speed < 12) {
    crashPlane('Bahan bakar habis — pesawat jatuh!');
  }
}

function landPlane() {
  const p = state.plane;
  const smooth = Math.abs(p.verticalSpeed) < 4 && p.speed < 45;
  state.score += LANDING_SCORE + (smooth ? PERFECT_LANDING_BONUS : 0);
  refuelPlane(p);
  p.speed = 0;
  p.throttle = 0;
  p.onGround = true;
  state.phase = 'complete';
  playLandingFanfare();
  showMessage(smooth ? 'PENDARATAN SEMPURNA!' : 'MENDARAT!', 4);
}

function crashPlane(reason) {
  state.crashReason = reason;
  state.phase = 'crashed';
  playCrashThud();
}

function updateFlying(dt) {
  const p = state.plane;
  stepFlight(p, controls, dt);
  state.missionTime += dt;
  state.timeLeft -= dt;

  if (state.nextRing) {
    state.nextRingDistance = distance2D(p.x, p.z, state.nextRing.x, state.nextRing.z);
  }

  if (!state.lowFuelWarned && p.fuel < 25 && p.fuel > 0) {
    state.lowFuelWarned = true;
    playLowFuelAlert();
  }

  checkRings();
  checkLandingAndCrash(dt);

  if (state.timeLeft <= 0 && state.phase === 'flying') {
    state.timeLeft = 0;
    state.phase = 'outoftime';
    playCrashThud();
  }
  updateEngineSound(p.throttle, p.speed, !p.onGround);
}

// ---- Deterministic screenshot presets (?shot=...) ----
// Each preset freezes one readable moment of the game on a fixed seed,
// so a screenshot always shows the same scene.

function applyShotPreset(mode) {
  if (mode === 'takeoff') {
    state.phase = 'flying';
    // Sit at the start of the runway, lined up for takeoff.
    const heading = state.world.start.runwayHeading;
    const hRad = (heading * Math.PI) / 180;
    state.plane.x = state.world.start.x - Math.sin(hRad) * 160;
    state.plane.z = state.world.start.z - Math.cos(hRad) * 160;
    state.plane.heading = heading;
    state.plane.throttle = 0.85;
    state.plane.speed = 30;
    state.plane.altitude = 2;
    state.plane.onGround = true;
    state.nextRingDistance = distance2D(state.plane.x, state.plane.z, state.rings[0].x, state.rings[0].z);
    showMessage('MISI 1: LEWATI 5 RING, LALU MENDARAT!', 999);
  } else if (mode === 'rings') {
    const ring = state.rings[1];
    state.phase = 'flying';
    state.rings[0].passed = true;
    state.ringsPassed = 1;
    state.nextRing = ring;
    state.score = 250;
    state.plane.throttle = 0.7;
    state.plane.speed = 58;
    state.plane.altitude = ring.y + 4;
    state.plane.onGround = false;
    // Place the plane just before the ring, aimed straight at it.
    const bearing = bearingTo(state.plane.x, state.plane.z, ring.x, ring.z);
    const back = 420;
    state.plane.x = ring.x - Math.sin((bearing * Math.PI) / 180) * back;
    state.plane.z = ring.z - Math.cos((bearing * Math.PI) / 180) * back;
    state.plane.heading = bearing;
    state.nextRingDistance = back;
    showMessage('RING 2 DI DEPAN — TERBANG MENEMBUSNYA!', 999);
  } else if (mode === 'landing') {
    const finish = state.world.finish;
    state.phase = 'flying';
    state.rings.forEach((r) => { r.passed = true; });
    state.ringsPassed = state.rings.length;
    state.nextRing = null;
    state.score = 1250;
    state.plane.throttle = 0.35;
    state.plane.speed = 45;
    state.plane.altitude = 42;
    state.plane.fuel = 62;
    state.plane.onGround = false;
    const heading = finish.runwayHeading;
    const back = 620;
    state.plane.x = finish.x - Math.sin((heading * Math.PI) / 180) * back;
    state.plane.z = finish.z - Math.cos((heading * Math.PI) / 180) * back;
    state.plane.heading = heading;
    state.timeLeft = 96;
    showMessage('PENDEKATAN AKHIR — RUNWAY DI DEPAN!', 999);
  } else if (mode === 'results') {
    state.phase = 'complete';
    state.rings.forEach((r) => { r.passed = true; });
    state.ringsPassed = state.rings.length;
    state.nextRing = null;
    state.score = 2000;
    state.missionTime = 142;
    state.plane.fuel = 100;
    state.plane.speed = 0;
    state.plane.throttle = 0;
    state.plane.onGround = true;
    state.plane.altitude = 0;
    // Parked on the destination runway, looking out over the sea.
    state.plane.x = state.world.finish.x;
    state.plane.z = state.world.finish.z;
    state.plane.heading = state.world.finish.runwayHeading;
    state.timeLeft = 98;
  }
}

// ---- Buttons and keys ----

function bindButtons() {
  document.getElementById('btn-start').addEventListener('click', () => {
    if (state.phase === 'menu') startFlying();
    else if (state.phase === 'complete' && state.mission < MISSIONS_TOTAL) nextMission();
    else if (state.phase === 'complete') restartAll();
    else if (state.phase === 'crashed' || state.phase === 'outoftime') restartMission();
  });
  document.getElementById('btn-pause').addEventListener('click', () => {
    if (state.phase === 'flying') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'flying';
    playClick();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    restartMission();
    playClick();
  });
  document.getElementById('btn-mute').addEventListener('click', (event) => {
    const muted = toggleMute();
    event.target.textContent = muted ? '🔇 MUTED' : '🔊 SOUND';
  });
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Enter') {
    if (state.phase === 'menu') startFlying();
    else if (state.phase === 'complete' && state.mission < MISSIONS_TOTAL) nextMission();
    else if (state.phase === 'complete') restartAll();
  }
  if (event.code === 'KeyP') {
    if (state.phase === 'flying') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'flying';
  }
  if (event.code === 'KeyR') {
    if (state.phase === 'crashed' || state.phase === 'outoftime') restartMission();
    else if (state.phase === 'complete' && state.mission >= MISSIONS_TOTAL) restartAll();
    else if (state.phase === 'flying' || state.phase === 'paused') restartMission();
  }
  if (event.code === 'KeyM') {
    const muted = toggleMute();
    document.getElementById('btn-mute').textContent = muted ? '🔇 MUTED' : '🔊 SOUND';
  }
});

// ---- Main loop ----

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  state.now += dt;
  if (!shotMode && state.phase === 'flying') updateFlying(dt);
  drawScene(ctx, state, state.now);
  if (state.phase === 'menu') drawMenuOverlay(ctx, state);
  else if (state.phase === 'paused') drawPauseOverlay(ctx);
  else if (state.phase === 'crashed') drawCrashOverlay(ctx, state);
  else if (state.phase === 'complete') drawCompleteOverlay(ctx, state);
  else if (state.phase === 'outoftime') drawOutOfTimeOverlay(ctx, state);
  requestAnimationFrame(frame);
}

bindInput(canvas);
bindButtons();
document.title = GAME_TITLE;
if (shotMode) applyShotPreset(shotMode);
requestAnimationFrame(frame);
