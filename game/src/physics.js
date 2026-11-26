// Island Hopper — physics.js
// One job: the arcade flight model. Pure state in, new state out.
// No drawing, no input reading beyond the controls object passed in.

import { PLANE } from './config.js';

export function createPlaneState() {
  return {
    x: 0, // metres east of world origin
    z: 0, // metres north of world origin
    altitude: 0, // metres above sea level
    heading: 0, // degrees, 0 = north, 90 = east
    pitch: 0, // degrees, positive = nose up
    bank: 0, // degrees, positive = banking right
    speed: 0, // m/s
    throttle: 0, // 0..1
    fuel: PLANE.fuelCapacity,
    verticalSpeed: 0, // m/s
    onGround: true,
    distanceFlown: 0,
  };
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function angleDifference(a, b) {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function headingError(planeHeading, targetHeading) {
  return angleDifference(targetHeading, planeHeading);
}

// Advance the plane one frame. dt is seconds. Returns nothing; mutates `p`.
export function stepFlight(p, controls, dt) {
  // Throttle lever.
  if (controls.throttleUp) p.throttle += PLANE.throttleStep * dt;
  if (controls.throttleDown) p.throttle -= PLANE.throttleStep * dt;
  p.throttle = clamp(p.throttle, 0, 1);

  // Pitch: keyboard (ArrowUp climbs, ArrowDown descends), or mouse while
  // the pointer is held down (pointer up = climb).
  let pitchInput = 0;
  if (controls.pitchUp) pitchInput += 1;
  if (controls.pitchDown) pitchInput -= 1;
  if (controls.mouseSteer) pitchInput -= clamp(controls.mouseY * 1.4, -1, 1);

  // Turning: keyboard, or mouse while held. Banking follows the turn.
  let turnInput = 0;
  if (controls.turnLeft) turnInput -= 1;
  if (controls.turnRight) turnInput += 1;
  if (controls.mouseSteer) turnInput += clamp(controls.mouseX * 1.4, -1, 1);
  turnInput = clamp(turnInput, -1, 1);

  const targetBank = turnInput * PLANE.maxBank;
  p.bank += (targetBank - p.bank) * Math.min(1, dt * 3.2);

  // Turn rate grows with bank and with speed (a slow plane barely turns).
  const speedFactor = clamp(p.speed / PLANE.cruiseSpeed, 0.15, 1);
  p.heading = (p.heading + (p.bank / PLANE.maxBank) * PLANE.turnRate * speedFactor * dt + 360) % 360;

  // Pitch follows input, eased toward the target.
  const targetPitch = clamp(pitchInput * PLANE.maxPitch, -PLANE.maxPitch, PLANE.maxPitch);
  p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 2.6);

  // Air brake (Space) sheds speed fast and helps the flare on landing.
  const brakeDrag = controls.brake ? 26 : 0;

  // Speed chases the throttle target; drag grows with the square of speed.
  const targetSpeed = p.throttle * PLANE.maxSpeed;
  const drag = 0.02 * p.speed + brakeDrag * dt;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.55) - drag * dt * 0.4;
  if (p.speed < 0) p.speed = 0;

  // Lift: climbing needs speed. Below stall speed the wing gives up.
  const liftRatio = clamp(p.speed / PLANE.minFlySpeed, 0, 1.6);
  let climb = Math.sin((p.pitch * Math.PI) / 180) * p.speed * liftRatio;
  if (p.speed < PLANE.minFlySpeed && !p.onGround) {
    climb -= (PLANE.minFlySpeed - p.speed) * 0.9; // stall sink
  }
  climb = clamp(climb, -PLANE.maxSinkRate, PLANE.maxClimbRate);
  p.verticalSpeed = climb;
  p.altitude += climb * dt;

  // Move over the ground.
  const headingRad = (p.heading * Math.PI) / 180;
  const dx = Math.sin(headingRad) * p.speed * dt;
  const dz = Math.cos(headingRad) * p.speed * dt;
  p.x += dx;
  p.z += dz;
  p.distanceFlown += Math.hypot(dx, dz);

  // Fuel burns with throttle; empty tank means the engine quits.
  if (p.throttle > 0 && p.fuel > 0) {
    p.fuel -= PLANE.fuelBurn * (0.25 + p.throttle) * dt;
    if (p.fuel <= 0) {
      p.fuel = 0;
      p.throttle = 0;
    }
  }

  // Rolling on a runway: friction holds the plane down until rotation speed.
  if (p.onGround && p.speed < PLANE.minFlySpeed) {
    p.pitch = 0;
  }

  // Touching the sea or the ground.
  if (p.altitude <= 0) {
    p.altitude = 0;
    p.onGround = true;
  } else if (p.altitude > 2) {
    p.onGround = false;
  }
}

export function refuelPlane(p) {
  p.fuel = PLANE.fuelCapacity;
}

export function distance2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function bearingTo(ax, az, bx, bz) {
  const angle = (Math.atan2(bx - ax, bz - az) * 180) / Math.PI;
  return (angle + 360) % 360;
}
