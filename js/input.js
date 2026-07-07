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
  return normalize(x, y);
}

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
