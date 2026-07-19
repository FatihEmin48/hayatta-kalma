function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by, rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

function inWhipArc(px, py, fx, fy, range, arcDeg, ex, ey) {
  const dx = ex - px, dy = ey - py, d2 = dx * dx + dy * dy;
  if (d2 > range * range) return false;
  const d = Math.sqrt(d2) || 1;
  const dot = (dx / d) * fx + (dy / d) * fy;
  // Small epsilon so a 360deg (fully-evolved) arc reliably passes every
  // angle across engines, not just where V8 happens to round cos(pi) to -1.
  return dot >= Math.cos((arcDeg * Math.PI / 180) / 2) - 1e-9;
}

function pickRandomUnique(arr, count) {
  const pool = arr.slice();
  const result = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

function removeDead(arr) {
  return arr.filter(item => !item.dead);
}

// Ağırlıklı rastgele seçim (items ve weights aynı uzunlukta).
function weightedPick(items, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
