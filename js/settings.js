// Erişilebilirlik/ekran ayarları (localStorage). Boolean bayraklar; oyun
// bunları çizim/efekt noktalarında kontrol eder (effects.js, render.js).
const Settings = (function () {
  const KEY = 'hk_settings';
  const defs = { shake: true, damageNumbers: true, flash: true };

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const d = raw ? JSON.parse(raw) : {};
      const o = Object.assign({}, defs);
      for (const k in defs) if (typeof d[k] === 'boolean') o[k] = d[k];
      return o;
    } catch (e) {
      return Object.assign({}, defs);
    }
  }

  let data = read();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* yok say */ }
  }

  function get(k) { return data[k]; }
  function set(k, v) { if (k in data) { data[k] = !!v; save(); } }
  function toggle(k) { set(k, !data[k]); return data[k]; }

  return { get, set, toggle };
})();
