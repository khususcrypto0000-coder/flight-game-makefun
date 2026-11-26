// Island Hopper — world.js
// One job: the archipelago. Seeded, deterministic islands, runways and
// ring courses — the same mission seed always builds the same world.

import { WORLD_SIZE, RINGS_PER_MISSION, RUNWAY, ISLAND_HILL_HEIGHT } from './config.js';

// Small deterministic PRNG (mulberry32) so missions never change between runs.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeIsland(rng, cx, cz, radius, name, hasRunway, runwayHeading) {
  return {
    name,
    x: cx,
    z: cz,
    radius,
    hillHeight: ISLAND_HILL_HEIGHT * (0.7 + rng() * 0.5),
    palmCount: Math.floor(4 + rng() * 8),
    palms: [],
    hasRunway,
    runwayHeading,
  };
}

function scatterPalms(island, rng) {
  for (let i = 0; i < island.palmCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = island.radius * (0.35 + rng() * 0.5);
    island.palms.push({
      x: island.x + Math.sin(angle) * dist,
      z: island.z + Math.cos(angle) * dist,
      size: 0.7 + rng() * 0.6,
    });
  }
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const half = WORLD_SIZE / 2;
  const islands = [];

  // Start island (south-west) and destination island (north-east) always exist.
  // Their hills stay low so the runway has a flat approach and departure.
  const start = makeIsland(rng, -half + 1100, -half + 1100, 620, 'Pulau Start', true, 45);
  start.hillHeight = 9;
  const finish = makeIsland(rng, half - 1100, half - 1100, 700, 'Pulau Tujuan', true, 45);
  finish.hillHeight = 9;
  islands.push(start, finish);

  // Decorative islands scattered between them.
  const names = ['Pulau Karang', 'Pulau Kelapa', 'Pulau Ombak', 'Pulau Pasir', 'Pulau Lumba', 'Pulau Senja'];
  for (let i = 0; i < names.length; i++) {
    const cx = -half + 1400 + rng() * (WORLD_SIZE - 2800);
    const cz = -half + 1400 + rng() * (WORLD_SIZE - 2800);
    if (Math.hypot(cx - start.x, cz - start.z) < 1100) continue;
    if (Math.hypot(cx - finish.x, cz - finish.z) < 1200) continue;
    const island = makeIsland(rng, cx, cz, 260 + rng() * 320, names[i], false, 0);
    islands.push(island);
  }
  for (const island of islands) scatterPalms(island, rng);

  // Clouds drift above the sea, placed by the same seed.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: -half + rng() * WORLD_SIZE,
      z: -half + rng() * WORLD_SIZE,
      y: 260 + rng() * 260,
      size: 120 + rng() * 220,
      speed: 4 + rng() * 6,
    });
  }

  return { seed, islands, start, finish, clouds };
}

export function runwayCenter(island) {
  return { x: island.x, z: island.z };
}

// Ring course: five rings arcing from the start island to the finish island,
// each at a different height so the pilot must climb and descend.
export function buildRingCourse(world, missionIndex) {
  const rng = mulberry32(world.seed + missionIndex * 7919);
  const rings = [];
  const sx = world.start.x;
  const sz = world.start.z;
  const fx = world.finish.x;
  const fz = world.finish.z;
  for (let i = 0; i < RINGS_PER_MISSION; i++) {
    const t = (i + 1) / (RINGS_PER_MISSION + 1);
    const lateral = (rng() - 0.5) * 1600 * (i % 2 === 0 ? 1 : -1);
    const px = sx + (fx - sx) * t;
    const pz = sz + (fz - sz) * t;
    // Lateral offset perpendicular to the course direction.
    const courseAngle = Math.atan2(fx - sx, fz - sz);
    const ox = Math.cos(courseAngle) * lateral;
    const oz = -Math.sin(courseAngle) * lateral;
    rings.push({
      index: i + 1,
      x: px + ox,
      z: pz + oz,
      y: 90 + rng() * 170 + (i === 2 ? 60 : 0),
      passed: false,
    });
  }
  return rings;
}

// Height of the land under a point: hills on islands, sea level elsewhere.
export function groundHeightAt(world, x, z) {
  let height = 0;
  for (const island of world.islands) {
    const d = Math.hypot(x - island.x, z - island.z);
    if (d < island.radius) {
      const falloff = 1 - (d / island.radius) * (d / island.radius);
      height = Math.max(height, island.hillHeight * falloff);
    }
  }
  return height;
}

// The runway itself is flat: landing checks use sea-level height there.
export function groundHeightForLanding(world, x, z) {
  for (const island of world.islands) {
    if (island.hasRunway && pointOnRunway(island, x, z)) return 0;
  }
  return groundHeightAt(world, x, z);
}

export function islandAt(world, x, z) {
  for (const island of world.islands) {
    if (Math.hypot(x - island.x, z - island.z) < island.radius) return island;
  }
  return null;
}

export function runwayRect(island) {
  const headingRad = (island.runwayHeading * Math.PI) / 180;
  const halfLen = RUNWAY.length / 2;
  const halfWid = RUNWAY.width / 2;
  const sinH = Math.sin(headingRad);
  const cosH = Math.cos(headingRad);
  return {
    cx: island.x,
    cz: island.z,
    corners: [
      { x: island.x - sinH * halfLen - cosH * halfWid, z: island.z - cosH * halfLen + sinH * halfWid },
      { x: island.x + sinH * halfLen - cosH * halfWid, z: island.z + cosH * halfLen + sinH * halfWid },
      { x: island.x + sinH * halfLen + cosH * halfWid, z: island.z + cosH * halfLen - sinH * halfWid },
      { x: island.x - sinH * halfLen + cosH * halfWid, z: island.z - cosH * halfLen - sinH * halfWid },
    ],
  };
}

// Is the point inside the runway rectangle (for landing checks)?
export function pointOnRunway(island, x, z) {
  const headingRad = (island.runwayHeading * Math.PI) / 180;
  const dx = x - island.x;
  const dz = z - island.z;
  const along = dx * Math.sin(headingRad) + dz * Math.cos(headingRad);
  const across = dx * Math.cos(headingRad) - dz * Math.sin(headingRad);
  return Math.abs(along) < RUNWAY.length / 2 && Math.abs(across) < RUNWAY.width / 2;
}
