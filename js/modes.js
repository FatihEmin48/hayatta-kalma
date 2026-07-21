// Oyun modu seçimi (Normal / Boss Yağmuru / Süre Saldırısı). Seçim
// localStorage'da tutulur; mod ayarları createInitialState'e (state.modeConfig)
// kopyalanıp run boyunca kullanılır.
const Modes = (function () {
  const KEY = 'hk_mode';

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (GAME_MODES.some(m => m.id === s)) return s;
    } catch (e) { /* localStorage yok */ }
    return GAME_MODES[0].id;
  }

  let id = load();

  function current() { return GAME_MODES.find(m => m.id === id) || GAME_MODES[0]; }
  function select(mid) {
    if (GAME_MODES.some(m => m.id === mid)) {
      id = mid;
      try { localStorage.setItem(KEY, mid); } catch (e) { /* yok say */ }
    }
    return id;
  }
  function getId() { return id; }

  return { current, select, getId };
})();
