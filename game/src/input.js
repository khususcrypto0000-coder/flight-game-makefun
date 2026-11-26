// Island Hopper — input.js
// One job: keyboard and mouse input, nothing else.
// Exposes a single shared `controls` object the physics and UI read.

export const controls = {
  throttleUp: false,
  throttleDown: false,
  pitchUp: false,
  pitchDown: false,
  turnLeft: false,
  turnRight: false,
  brake: false, // Space: air brake / flare
  mouseSteer: false,
  mouseX: 0, // -1..1, pointer offset from screen centre
  mouseY: 0,
  anyKey: false,
};

const KEY_MAP = {
  KeyW: 'throttleUp',
  ArrowUp: 'pitchUp',
  KeyS: 'throttleDown',
  ArrowDown: 'pitchDown',
  KeyA: 'turnLeft',
  ArrowLeft: 'turnLeft',
  KeyD: 'turnRight',
  ArrowRight: 'turnRight',
  Space: 'brake',
};

export function bindKeyboard(target) {
  target.addEventListener('keydown', (event) => {
    const field = KEY_MAP[event.code];
    if (field) {
      controls[field] = true;
      controls.anyKey = true;
      event.preventDefault();
    }
  });
  target.addEventListener('keyup', (event) => {
    const field = KEY_MAP[event.code];
    if (field) {
      controls[field] = false;
      event.preventDefault();
    }
  });
  target.addEventListener('blur', () => {
    for (const key of Object.keys(controls)) {
      if (typeof controls[key] === 'boolean') controls[key] = false;
    }
  });
}

export function bindMouse(canvas) {
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    controls.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    controls.mouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });
  canvas.addEventListener('pointerdown', (event) => {
    controls.mouseSteer = true;
    const rect = canvas.getBoundingClientRect();
    controls.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    controls.mouseY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  });
  canvas.addEventListener('pointerup', () => {
    controls.mouseSteer = false;
  });
  canvas.addEventListener('pointerleave', () => {
    controls.mouseSteer = false;
  });
}

// Convenience: wire both listeners at once for the game canvas.
export function bindInput(canvas) {
  bindKeyboard(window);
  bindMouse(canvas);
}

export function resetControls() {
  for (const key of Object.keys(controls)) {
    if (typeof controls[key] === 'boolean') controls[key] = false;
  }
  controls.mouseX = 0;
  controls.mouseY = 0;
}
