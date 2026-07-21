// Karakter seçimi: farklı başlangıç silahı + stat modları. Seçim
// localStorage'da tutulur. Karakter bonusları oyuncunun stat fonksiyonlarına
// (js/leveling.js getPlayer*) Meta yükseltmelerinin yanında eklenir.
const Characters = (function () {
  const KEY = 'hk_char';

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (CHARACTERS.some(c => c.id === s)) return s;
    } catch (e) { /* localStorage yok */ }
    return CHARACTERS[0].id;
  }

  let id = load();

  // Kilitli karakterler ancak ilgili başarım açılınca seçilebilir. Achievements
  // modülü henüz yüklenmemişse/yoksa savunmacı davran (kilitli say).
  function isUnlocked(c) {
    if (!c.unlock) return true;
    return typeof Achievements !== 'undefined' && Achievements.isDone(c.unlock);
  }

  function current() {
    const c = CHARACTERS.find(x => x.id === id) || CHARACTERS[0];
    // Seçili karakter (ör. tercih localStorage'da ama artık kilitliyse)
    // erişilemezse ilk açık karaktere düş.
    return isUnlocked(c) ? c : CHARACTERS[0];
  }

  function select(cid) {
    const c = CHARACTERS.find(x => x.id === cid);
    if (c && isUnlocked(c)) {
      id = cid;
      try { localStorage.setItem(KEY, cid); } catch (e) { /* yok say */ }
    }
    return current().id;
  }

  function mod(key) {
    const m = current().mods;
    return m[key] || 0;
  }

  function getId() { return current().id; }

  return { current, select, mod, getId, isUnlocked };
})();
