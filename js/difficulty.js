// Zorluk seçimi (Kolay / Normal / Zor). Seçim localStorage'da; çarpan
// createInitialState'te state.difficultyMult'e kopyalanıp düşman spawn
// ölçeğiyle çarpılır (js/enemies.js).
const Difficulty = (function () {
  const KEY = 'hk_difficulty';

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (DIFFICULTIES.some(d => d.id === s)) return s;
    } catch (e) { /* localStorage yok */ }
    return 'normal';
  }

  let id = load();

  function current() { return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[1]; }
  function select(did) {
    if (DIFFICULTIES.some(d => d.id === did)) {
      id = did;
      try { localStorage.setItem(KEY, did); } catch (e) { /* yok say */ }
    }
    return id;
  }
  function getId() { return id; }
  function mult() { return current().mult; }

  return { current, select, getId, mult };
})();
