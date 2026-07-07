const keyState = {};

window.addEventListener('keydown', (e) => {
  keyState[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keyState[e.key.toLowerCase()] = false;
});

function getMoveVector() {
  let x = 0, y = 0;
  if (keyState['a'] || keyState['arrowleft']) x -= 1;
  if (keyState['d'] || keyState['arrowright']) x += 1;
  if (keyState['w'] || keyState['arrowup']) y -= 1;
  if (keyState['s'] || keyState['arrowdown']) y += 1;

  const keyboardVec = normalize(x, y);
  if (keyboardVec.x !== 0 || keyboardVec.y !== 0) return keyboardVec;
  return touchMoveVector;
}

// Bottom-left virtual joystick for touch devices. Only shown/active when the
// device reports touch support; keyboard input always takes precedence over
// it in getMoveVector() above, so the two schemes never fight each other.
let touchMoveVector = { x: 0, y: 0 };
const JOYSTICK_MAX_RADIUS = 40;
const JOYSTICK_DEADZONE = 6;
let joystickTouchId = null;
let joystickCenter = { x: 0, y: 0 };

function initJoystick() {
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  if (!base || !knob) return;

  function updateKnob(clientX, clientY) {
    let dx = clientX - joystickCenter.x;
    let dy = clientY - joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > JOYSTICK_MAX_RADIUS) {
      dx = (dx / dist) * JOYSTICK_MAX_RADIUS;
      dy = (dy / dist) * JOYSTICK_MAX_RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchMoveVector = dist > JOYSTICK_DEADZONE ? normalize(dx, dy) : { x: 0, y: 0 };
  }

  function resetKnob() {
    joystickTouchId = null;
    touchMoveVector = { x: 0, y: 0 };
    knob.style.transform = 'translate(0px, 0px)';
  }

  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = base.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateKnob(touch.clientX, touch.clientY);
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (joystickTouchId === null) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        e.preventDefault();
        updateKnob(touch.clientX, touch.clientY);
      }
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) resetKnob();
    }
  });
  window.addEventListener('touchcancel', resetKnob);
}

window.addEventListener('DOMContentLoaded', () => {
  if ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)) {
    document.body.classList.add('touch-enabled');
    initJoystick();
  }
});

let levelUpKeyHandler = null;
function setLevelUpKeyHandler(fn) {
  levelUpKeyHandler = fn;
}
window.addEventListener('keydown', (e) => {
  if (!levelUpKeyHandler) return;
  if (e.key === '1' || e.key === '2' || e.key === '3') {
    levelUpKeyHandler(parseInt(e.key, 10) - 1);
  }
});
