// Island Hopper — config.js
// One job: every tunable constant of the game in one place.
// Units: metres, metres/second, degrees. No other file hard-codes a number
// that belongs here.

export const GAME_TITLE = 'Island Hopper';
export const GAME_TAGLINE = 'Terbang antar pulau, lewati ring, mendarat dengan selamat.';

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;

export const WORLD_SIZE = 9000; // playable ocean, metres across
export const SEA_LEVEL = 0;
export const ISLAND_HILL_HEIGHT = 26; // hills rise this high above the sea

export const PLANE = {
  maxSpeed: 92, // m/s at full throttle
  cruiseSpeed: 58,
  minFlySpeed: 24, // below this the wing stops lifting
  maxClimbRate: 11, // m/s
  maxSinkRate: 16,
  turnRate: 26, // deg/s at full bank
  pitchRate: 20, // deg/s
  maxPitch: 24,
  maxBank: 38,
  throttleStep: 0.55, // per second held
  fuelBurn: 0.55, // fuel units per second at full throttle
  fuelCapacity: 100,
  startFuel: 100,
};

export const RINGS_PER_MISSION = 5;
export const RING_RADIUS = 34;
export const RING_SCORE = 250;
export const RING_TIME_BONUS = 12; // seconds added to the clock per ring
export const LANDING_SCORE = 500;
export const PERFECT_LANDING_BONUS = 250;

export const MISSION_TIME_LIMIT = 240; // seconds per mission
export const MISSIONS_TOTAL = 3;

export const RUNWAY = {
  length: 420,
  width: 46,
};

// How far ahead the camera looks, and how the horizon sits on screen.
export const CAMERA = {
  focalLength: 620,
  horizonFraction: 0.42, // horizon line as a fraction of canvas height
  planeScreenY: 0.62, // where the aircraft sits vertically
  maxDrawDistance: 6500,
};

// Seeded mission layouts: same seed always builds the same islands.
export const MISSION_SEEDS = [4107, 9021, 5513];

export const COLOURS = {
  skyTop: '#1d6fb8',
  skyMid: '#5fb2e8',
  skyLow: '#bfe6f7',
  seaDeep: '#0b5e8a',
  seaShallow: '#2fa8c9',
  sand: '#f2dca0',
  grass: '#4da34d',
  forest: '#2e7d32',
  runway: '#3a3f46',
  runwayMark: '#f5f5f5',
  ring: '#ff9d1c',
  ringGlow: '#ffd23e',
  hudPanel: 'rgba(8, 24, 40, 0.72)',
  hudText: '#ffffff',
  hudAccent: '#ffd23e',
  hudGood: '#7dff8a',
  hudDanger: '#ff5d5d',
};
