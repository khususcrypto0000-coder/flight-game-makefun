// Island Hopper — render.js
// One job: everything drawn on the canvas — sky, sea, islands, rings,
// runway, the aircraft, the HUD and the menu/end screens.
// The camera sits behind the aircraft and looks along its heading.

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLOURS, CAMERA, RUNWAY } from './config.js';

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;
const CX = W / 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

// Camera-space projection. Returns null when the point is behind the camera.
export function projectPoint(point, camera) {
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const dz = point.z - camera.z;
  const forward = dx * camera.fx + dz * camera.fz;
  if (forward < 8) return null;
  const right = dx * camera.rx + dz * camera.rz;
  const scale = CAMERA.focalLength / forward;
  const horizonY = H * CAMERA.horizonFraction - camera.pitchOffset;
  let sx = CX + right * scale;
  let sy = horizonY - dy * scale;
  // Roll the whole view with the bank so turns feel physical.
  if (camera.roll !== 0) {
    const cosR = Math.cos(camera.roll);
    const sinR = Math.sin(camera.roll);
    const ox = sx - CX;
    const oy = sy - H * 0.55;
    sx = CX + ox * cosR - oy * sinR;
    sy = H * 0.55 + ox * sinR + oy * cosR;
  }
  return { x: sx, y: sy, dist: forward, scale };
}

export function makeCamera(plane) {
  const headingRad = (plane.heading * Math.PI) / 180;
  const back = 17;
  const camX = plane.x - Math.sin(headingRad) * back;
  const camZ = plane.z - Math.cos(headingRad) * back;
  return {
    x: camX,
    y: plane.altitude + 7,
    z: camZ,
    fx: Math.sin(headingRad),
    fz: Math.cos(headingRad),
    rx: Math.cos(headingRad),
    rz: -Math.sin(headingRad),
    pitchOffset: plane.pitch * 6,
    roll: (plane.bank * Math.PI) / 180 * 0.45,
  };
}

function drawSky(ctx, camera, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, H * CAMERA.horizonFraction + 40);
  grad.addColorStop(0, COLOURS.skyTop);
  grad.addColorStop(0.55, COLOURS.skyMid);
  grad.addColorStop(1, COLOURS.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H * CAMERA.horizonFraction + 40);

  // Sun, placed by heading so it stays put as the pilot turns.
  const sunAngle = ((120 - cameraHeadingDeg(camera)) % 360) * (Math.PI / 180);
  const sunX = CX + Math.sin(sunAngle) * W * 0.42;
  const sunY = 92 + Math.cos(sunAngle) * 18;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255, 244, 190, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 220, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 220, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();
}

function cameraHeadingDeg(camera) {
  return (Math.atan2(camera.fx, camera.fz) * 180) / Math.PI;
}

function drawSea(ctx, camera, time) {
  const horizonY = H * CAMERA.horizonFraction - camera.pitchOffset;
  const grad = ctx.createLinearGradient(0, horizonY, 0, H);
  grad.addColorStop(0, COLOURS.seaShallow);
  grad.addColorStop(0.25, '#1d8ab5');
  grad.addColorStop(1, COLOURS.seaDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 26; i++) {
    const gx = ((i * 173 + time * 12) % W);
    const gy = horizonY + 30 + ((i * 61) % (H - horizonY - 60));
    const gw = 26 + (i % 5) * 9;
    ctx.fillRect(gx, gy, gw, 2);
  }
}

function drawDistantClouds(ctx, camera, time) {
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (let i = 0; i < 9; i++) {
    const drift = ((i * 211 + time * 3) % (W + 320)) - 160;
    const cy = 46 + (i % 4) * 34;
    const cw = 90 + (i % 3) * 46;
    ctx.beginPath();
    ctx.ellipse(drift, cy, cw, 15 + (i % 3) * 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(drift + cw * 0.4, cy + 8, cw * 0.55, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds3D(ctx, world, camera) {
  for (const cloud of world.clouds) {
    const p = projectPoint({ x: cloud.x, y: cloud.y, z: cloud.z }, camera);
    if (!p || p.dist > CAMERA.maxDrawDistance) continue;
    if (p.dist < 220) continue; // a cloud right on the lens would be a white wall
    const r = cloud.size * p.scale * 0.9;
    if (r < 4) continue;
    const alpha = clamp(1.15 - p.dist / CAMERA.maxDrawDistance, 0.15, 0.95);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - r * 0.45, p.y + r * 0.08, r * 0.55, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + r * 0.45, p.y + r * 0.08, r * 0.55, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// One island: sand rim, green top, hill shading, palms, and its runway.
// Ground is clipped to below the horizon so a nearby island can never
// cover the sky.
function drawIsland(ctx, island, camera) {
  const centre = projectPoint({ x: island.x, y: 0, z: island.z }, camera);
  if (!centre || centre.dist > CAMERA.maxDrawDistance) return;
  const rx = island.radius * centre.scale;
  if (rx < 3) return;
  const ry = Math.max(3, rx * 0.24);
  const cy = centre.y;
  const horizonY = H * CAMERA.horizonFraction - camera.pitchOffset;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, W, H - horizonY);
  ctx.clip();
  ctx.fillStyle = COLOURS.sand;
  ctx.beginPath();
  ctx.ellipse(centre.x, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.grass;
  ctx.beginPath();
  ctx.ellipse(centre.x, cy, rx * 0.86, ry * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hill: a darker green dome on the far side of the island.
  ctx.fillStyle = COLOURS.forest;
  ctx.beginPath();
  ctx.ellipse(centre.x, cy - ry * 0.35, rx * 0.45, ry * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Palms as small dark-green dots with a trunk tick.
  ctx.fillStyle = '#1d5c22';
  for (const palm of island.palms) {
    const pp = projectPoint({ x: palm.x, y: 2, z: palm.z }, camera);
    if (!pp) continue;
    const pr = Math.max(1.5, 5 * pp.scale * palm.size);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  if (island.hasRunway) drawRunway(ctx, island, camera);
  ctx.restore();
  // Island name tag when close enough to read.
  if (centre.dist < 2600) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(island.name, centre.x, cy - ry - 12);
  }
}

// Runway drawn by sampling stations along its length, so the near end
// still draws when the aircraft is sitting on it.
function drawRunway(ctx, island, camera) {
  const headingRad = (island.runwayHeading * Math.PI) / 180;
  const sinH = Math.sin(headingRad);
  const cosH = Math.cos(headingRad);
  const stations = 9;
  const leftEdge = [];
  const rightEdge = [];
  for (let i = 0; i <= stations; i++) {
    const along = -RUNWAY.length / 2 + (RUNWAY.length * i) / stations;
    const lx = island.x + sinH * along - cosH * (RUNWAY.width / 2);
    const lz = island.z + cosH * along + sinH * (RUNWAY.width / 2);
    const rxp = island.x + sinH * along + cosH * (RUNWAY.width / 2);
    const rzp = island.z + cosH * along - sinH * (RUNWAY.width / 2);
    const lp = projectPoint({ x: lx, y: 1, z: lz }, camera);
    const rp = projectPoint({ x: rxp, y: 1, z: rzp }, camera);
    if (lp) leftEdge.push(lp);
    if (rp) rightEdge.push(rp);
  }
  if (leftEdge.length < 2 || rightEdge.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(leftEdge[0].x, leftEdge[0].y);
  for (const p of leftEdge) ctx.lineTo(p.x, p.y);
  for (let i = rightEdge.length - 1; i >= 0; i--) ctx.lineTo(rightEdge[i].x, rightEdge[i].y);
  ctx.closePath();
  ctx.fillStyle = COLOURS.runway;
  ctx.fill();
  ctx.strokeStyle = COLOURS.runwayMark;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Centre dashed line.
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 12]);
  const a = projectPoint({ x: island.x - sinH * (RUNWAY.length / 2 - 20), y: 2, z: island.z - cosH * (RUNWAY.length / 2 - 20) }, camera);
  const b = projectPoint({ x: island.x + sinH * (RUNWAY.length / 2 - 20), y: 2, z: island.z + cosH * (RUNWAY.length / 2 - 20) }, camera);
  if (a && b) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// A glowing target ring, facing the camera, with its number on it.
function drawRing(ctx, ring, camera, isNext, time) {
  const p = projectPoint({ x: ring.x, y: ring.y, z: ring.z }, camera);
  if (!p || p.dist > CAMERA.maxDrawDistance) return null;
  const r = 34 * p.scale;
  if (r < 3) return null;
  const pulse = isNext ? 0.75 + Math.sin(time * 5) * 0.25 : 0.55;
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = COLOURS.ringGlow;
  ctx.lineWidth = Math.max(3, r * 0.22);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = ring.passed ? '#7dff8a' : COLOURS.ring;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (r > 14) {
    ctx.font = `bold ${Math.max(14, Math.round(r * 0.55))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(ring.index), p.x, p.y);
    ctx.textBaseline = 'alphabetic';
  }
  return { x: p.x, y: p.y, dist: p.dist, radius: r };
}

// The aircraft, seen from behind and slightly above: wings, fuselage,
// tail fin, cockpit hump and navigation lights. Banks with the turn.
function drawPlane(ctx, plane, time) {
  const px = CX;
  const py = H * CAMERA.planeScreenY;
  const bankRad = (plane.bank * Math.PI) / 180;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(bankRad * 0.9);
  const s = 1.15;

  // Shadow on the water below when low.
  // Main wings.
  ctx.fillStyle = '#e8eef2';
  ctx.beginPath();
  ctx.moveTo(-118 * s, 6 * s);
  ctx.lineTo(-30 * s, -6 * s);
  ctx.lineTo(30 * s, -6 * s);
  ctx.lineTo(118 * s, 6 * s);
  ctx.lineTo(104 * s, 16 * s);
  ctx.lineTo(-104 * s, 16 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9fb2c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Wing tips: red left, green right.
  ctx.fillStyle = '#ff4040';
  ctx.fillRect(-118 * s, 4 * s, 12 * s, 9 * s);
  ctx.fillStyle = '#2fd95d';
  ctx.fillRect(106 * s, 4 * s, 12 * s, 9 * s);

  // Fuselage: tapered body seen from behind.
  const body = ctx.createLinearGradient(-26, 0, 26, 0);
  body.addColorStop(0, '#ff7a1a');
  body.addColorStop(0.5, '#ffb347');
  body.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-24 * s, 34 * s);
  ctx.quadraticCurveTo(-30 * s, -18 * s, -12 * s, -44 * s);
  ctx.lineTo(12 * s, -44 * s);
  ctx.quadraticCurveTo(30 * s, -18 * s, 24 * s, 34 * s);
  ctx.quadraticCurveTo(0, 46 * s, -24 * s, 34 * s);
  ctx.fill();
  ctx.strokeStyle = '#c85a00';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cockpit canopy hump.
  ctx.fillStyle = '#123a5c';
  ctx.beginPath();
  ctx.ellipse(0, -26 * s, 13 * s, 17 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,225,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -30 * s, 7 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail fin and horizontal stabiliser.
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(-7 * s, -40 * s);
  ctx.lineTo(0, -72 * s);
  ctx.lineTo(7 * s, -40 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8eef2';
  ctx.fillRect(-34 * s, -38 * s, 68 * s, 9 * s);

  // Spinning propeller blur in front of the nose.
  ctx.fillStyle = 'rgba(200,210,220,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -52 * s, 30 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Registration stripe.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IH-01', 0, 24 * s);
  ctx.restore();

  // Soft shadow blob on the sea when flying low.
  if (plane.altitude < 160 && plane.altitude > 2) {
    const shade = clamp(1 - plane.altitude / 160, 0.15, 0.6);
    ctx.fillStyle = `rgba(0,20,40,${shade.toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(CX, py + 130 + plane.altitude * 0.4, 90, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---------- HUD ----------

function hudPanel(ctx, x, y, w, h) {
  ctx.fillStyle = COLOURS.hudPanel;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function drawCompassStrip(ctx, heading) {
  const stripW = 300;
  const stripX = CX - stripW / 2;
  const stripY = 16;
  hudPanel(ctx, stripX - 8, stripY - 4, stripW + 16, 44);
  ctx.save();
  ctx.beginPath();
  ctx.rect(stripX, stripY, stripW, 36);
  ctx.clip();
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const points = [
    { deg: 0, label: 'N' },
    { deg: 45, label: 'NE' },
    { deg: 90, label: 'E' },
    { deg: 135, label: 'SE' },
    { deg: 180, label: 'S' },
    { deg: 225, label: 'SW' },
    { deg: 270, label: 'W' },
    { deg: 315, label: 'NW' },
  ];
  // Only the +/-75 degree window around the heading is shown.
  for (let offset = -75; offset <= 75; offset += 15) {
    const deg = (((Math.round((heading + offset) / 15) * 15) % 360) + 360) % 360;
    const shownOffset = offset + (Math.round((heading + offset) / 15) * 15 - (heading + offset));
    const x = CX + (shownOffset / 75) * (stripW / 2);
    if (x < stripX + 8 || x > stripX + stripW - 8) continue;
    const point = points.find((p) => p.deg === deg);
    ctx.fillStyle = point ? COLOURS.hudAccent : 'rgba(255,255,255,0.75)';
    ctx.fillText(point ? point.label : String(deg), x, stripY + 24);
  }
  ctx.restore();
  // Centre lubber line + numeric heading.
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.beginPath();
  ctx.moveTo(CX - 7, stripY - 2);
  ctx.lineTo(CX + 7, stripY - 2);
  ctx.lineTo(CX, stripY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${String(Math.round(heading)).padStart(3, '0')}°`, CX, stripY + 62);
}

function drawHud(ctx, state) {
  const p = state.plane;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  drawCompassStrip(ctx, p.heading);

  // Left instrument cluster: ALT / SPD / V/S.
  hudPanel(ctx, 16, 16, 210, 118);
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('ALTITUDE', 30, 40);
  ctx.fillText('SPEED', 30, 76);
  ctx.fillText('CLIMB', 30, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(`${Math.round(p.altitude)} m`, 118, 42);
  ctx.fillText(`${Math.round(p.speed * 3.6)} km/h`, 118, 78);
  const vs = Math.round(p.verticalSpeed);
  ctx.fillStyle = vs >= 0 ? COLOURS.hudGood : COLOURS.hudDanger;
  ctx.fillText(`${vs >= 0 ? '+' : ''}${vs} m/s`, 118, 114);

  // Right cluster: score, timer, fuel.
  hudPanel(ctx, W - 256, 16, 240, 118);
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('SCORE', W - 242, 40);
  ctx.fillText('TIME', W - 242, 76);
  ctx.fillText('FUEL', W - 242, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText(String(state.score), W - 144, 42);
  const timeLeft = Math.max(0, Math.ceil(state.timeLeft));
  ctx.fillStyle = timeLeft < 30 ? COLOURS.hudDanger : '#ffffff';
  ctx.fillText(`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`, W - 144, 78);
  const fuelW = 84;
  const fuelX = W - 144;
  const fuelY = 100;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(fuelX, fuelY, fuelW, 14);
  ctx.fillStyle = p.fuel > 25 ? COLOURS.hudGood : COLOURS.hudDanger;
  ctx.fillRect(fuelX, fuelY, fuelW * clamp(p.fuel / 100, 0, 1), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`${Math.round(p.fuel)}%`, fuelX + fuelW + 6, fuelY + 13);

  // Mission banner: ring progress + next target distance.
  const ringText = `MISSION ${state.mission} / 3   •   RING ${state.ringsPassed} / ${state.rings.length}`;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const bannerW = ctx.measureText(ringText).width + 36;
  hudPanel(ctx, CX - bannerW / 2, 108, bannerW, 38);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(ringText, CX, 134);
  if (state.nextRing) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = COLOURS.hudAccent;
    ctx.fillText(`NEXT RING ${state.nextRing.index} — ${Math.round(state.nextRingDistance)} m`, CX, 176);
  }

  // Throttle gauge, bottom left.
  hudPanel(ctx, 16, H - 96, 210, 80);
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THROTTLE', 30, H - 70);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(30, H - 58, 150, 14);
  ctx.fillStyle = '#4db2ff';
  ctx.fillRect(30, H - 58, 150 * clamp(p.throttle, 0, 1), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`${Math.round(p.throttle * 100)}%`, 188, H - 45);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(p.onGround ? 'ON GROUND' : 'AIRBORNE', 30, H - 26);

  // Controls hint, bottom right.
  hudPanel(ctx, W - 316, H - 96, 300, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('W/S throttle  •  A/D turn  •  ↑/↓ pitch', W - 302, H - 70);
  ctx.fillText('SPACE air brake  •  Mouse: hold to steer', W - 302, H - 48);
  ctx.fillText('P pause  •  R restart  •  M mute', W - 302, H - 26);

  // Centre flight-path marker.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CX, H * 0.42, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(CX - 20, H * 0.42);
  ctx.lineTo(CX - 12, H * 0.42);
  ctx.moveTo(CX + 12, H * 0.42);
  ctx.lineTo(CX + 20, H * 0.42);
  ctx.moveTo(CX, H * 0.42 - 20);
  ctx.lineTo(CX, H * 0.42 - 12);
  ctx.stroke();

  // Toast message below the aircraft, clear of the wings.
  if (state.message && state.messageUntil > state.now) {
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const mw = ctx.measureText(state.message).width + 44;
    hudPanel(ctx, CX - mw / 2, H * 0.72, mw, 46);
    ctx.fillStyle = COLOURS.hudAccent;
    ctx.fillText(state.message, CX, H * 0.72 + 31);
  }

  // Low fuel / stall warnings.
  if (p.fuel > 0 && p.fuel < 25 && state.phase === 'flying') {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.hudDanger;
    ctx.fillText('⚠ LOW FUEL — LAND AT THE NEXT RUNWAY', CX, H - 116);
  }
  if (p.speed < 24 && !p.onGround && state.phase === 'flying') {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.hudDanger;
    ctx.fillText('⚠ STALL — ADD THROTTLE, NOSE DOWN', CX, H - 140);
  }
}

// ---------- Full frame ----------

export function drawScene(ctx, state, time) {
  const camera = makeCamera(state.plane);
  drawSky(ctx, camera, time);
  drawDistantClouds(ctx, camera, time);
  drawSea(ctx, camera, time);

  // Islands far to near so near ones overlap far ones.
  const sorted = [...state.world.islands].sort((a, b) => {
    const da = Math.hypot(a.x - state.plane.x, a.z - state.plane.z);
    const db = Math.hypot(b.x - state.plane.x, b.z - state.plane.z);
    return db - da;
  });
  for (const island of sorted) drawIsland(ctx, island, camera);

  drawClouds3D(ctx, state.world, camera);

  // Rings: draw the next one last so it sits on top.
  let nextDrawn = null;
  for (const ring of state.rings) {
    const drawn = drawRing(ctx, ring, camera, ring === state.nextRing, time);
    if (ring === state.nextRing) nextDrawn = drawn;
  }

  // Off-screen arrow toward the next ring.
  if (nextDrawn && state.nextRing && (nextDrawn.x < 40 || nextDrawn.x > W - 40 || nextDrawn.y < 60 || nextDrawn.y > H - 120)) {
    const ax = clamp(nextDrawn.x, 60, W - 60);
    const ay = clamp(nextDrawn.y, 90, H - 150);
    ctx.fillStyle = COLOURS.ringGlow;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 14);
    ctx.lineTo(ax + 12, ay + 8);
    ctx.lineTo(ax - 12, ay + 8);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`RING ${state.nextRing.index}`, ax, ay + 30);
  }

  drawPlane(ctx, state.plane, time);
  drawHud(ctx, state);
}

// ---------- Overlays ----------

function dimScreen(ctx, alpha) {
  ctx.fillStyle = `rgba(4, 18, 32, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

function bigTitle(ctx, text, y, colour) {
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = colour || '#ffffff';
  ctx.fillText(text, CX, y);
}

export function drawMenuOverlay(ctx, state) {
  dimScreen(ctx, 0.45);
  ctx.textAlign = 'center';
  bigTitle(ctx, 'ISLAND HOPPER', 190, COLOURS.hudAccent);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Terbang antar pulau • Lewati 5 ring • Mendarat di runway tujuan', CX, 240);
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Misi 1 dari 3 — bahan bakar terbatas, mendarat untuk mengisi ulang.', CX, 280);
  ctx.fillText('W/S throttle   •   A/D belok   •   ↑/↓ pitch   •   SPACE rem udara', CX, 330);
  ctx.fillText('Tahan mouse untuk mengarahkan pesawat. P = jeda, R = ulang.', CX, 360);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.hudGood;
  ctx.fillText('▶  Klik START atau tekan ENTER untuk terbang', CX, 440);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Game original 2D canvas — tanpa gambar atau suara dari luar.', CX, 500);
}

export function drawPauseOverlay(ctx) {
  dimScreen(ctx, 0.5);
  bigTitle(ctx, 'PAUSED', 300);
  ctx.font = '20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Tekan P atau klik RESUME untuk lanjut terbang.', CX, 350);
}

export function drawCrashOverlay(ctx, state) {
  dimScreen(ctx, 0.55);
  bigTitle(ctx, 'CRASHED!', 220, COLOURS.hudDanger);
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(state.crashReason || 'Pesawat jatuh.', CX, 275);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText(`Skor: ${state.score}   •   Ring dilewati: ${state.ringsPassed}/${state.rings.length}   •   Jarak: ${Math.round(state.plane.distanceFlown)} m`, CX, 320);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.fillText('Tekan R atau klik RESTART untuk coba lagi', CX, 390);
}

export function drawCompleteOverlay(ctx, state) {
  dimScreen(ctx, 0.5);
  bigTitle(ctx, state.mission >= 3 ? 'ALL MISSIONS CLEAR!' : 'MISSION CLEAR!', 200, COLOURS.hudGood);
  ctx.font = '24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Misi ${state.mission} selesai — mendarat mulus di ${state.world.finish.name}.`, CX, 260);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`Skor: ${state.score}   •   Waktu: ${Math.round(state.missionTime)} dtk   •   Bahan bakar tersisa: ${Math.round(state.plane.fuel)}%`, CX, 310);
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.hudAccent;
  if (state.mission < 3) {
    ctx.fillText('Tekan ENTER atau klik NEXT MISSION untuk misi berikutnya', CX, 380);
  } else {
    ctx.fillText('Semua 3 misi selesai! Tekan R untuk terbang lagi dari awal.', CX, 380);
  }
}

export function drawOutOfTimeOverlay(ctx, state) {
  dimScreen(ctx, 0.55);
  bigTitle(ctx, 'TIME UP!', 220, COLOURS.hudDanger);
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Waktu misi habis sebelum mendarat.', CX, 275);
  ctx.fillText(`Skor: ${state.score}   •   Ring dilewati: ${state.ringsPassed}/${state.rings.length}`, CX, 320);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = COLOURS.hudAccent;
  ctx.fillText('Tekan R atau klik RESTART untuk coba lagi', CX, 390);
}
