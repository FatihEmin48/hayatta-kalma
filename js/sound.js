// Tüm ses tek bir WebAudio grafiğiyle, dosya/asset olmadan sentezlenir
// (oyunun "build adımı yok, çift tıkla çalışsın" ilkesine uygun).
//
// Modül adı bilerek `Audio` DEĞİL: tarayıcının yerleşik `window.Audio`
// (HTMLAudioElement) yapıcısını gölgelememek için `Sound`.
//
// Efekt sesleri ve müzik BAĞIMSIZ olarak açılıp kapatılabilir (ayrı gain
// düğümleri + ayrı localStorage tercihi).
//
// Mobil not: iOS/Android tarayıcılarında AudioContext bir kullanıcı jestiyle
// "unlock" edilmeden ses çıkmaz. Bu yüzden ilk dokunuş/tıklama/tuşta
// `unlock()` çağıran global dinleyiciler kuruyoruz (context'i resume edip bir
// sessiz buffer çalarak kilidi açar). Desteklenmeyen/headless ortamda tüm ses
// çağrıları sessizce no-op olur.
const Sound = (function () {
  let ctx = null;
  let masterGain = null, musicGain = null, sfxGain = null;
  let sfxEnabled = true;
  let musicEnabled = true;
  let unlocked = false;
  let musicOn = false;
  let schedulerId = null;
  let nextNoteTime = 0;
  let step = 0;
  const lastPlayed = {};

  const MASTER_VOL = 0.85;
  const MUSIC_VOL = 0.25;
  const STEP_DUR = 0.21;      // saniye/adım (~ sekizlik nota)
  const LOOKAHEAD = 0.15;     // ne kadar ileriyi zamanlayalım (s)

  const BASS = [110.00, 110.00, 130.81, 98.00];          // A2 A2 C3 G2
  const ARP = [220.00, 261.63, 329.63, 261.63,
               293.66, 329.63, 261.63, 220.00];          // A3 C4 E4 C4 D4 E4 C4 A3

  try {
    sfxEnabled = localStorage.getItem('hk_sfx') !== '0';
    musicEnabled = localStorage.getItem('hk_music') !== '0';
  } catch (e) { /* localStorage yok */ }

  function supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  function ensureCtx() {
    if (ctx || !supported()) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = MASTER_VOL;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = musicEnabled ? MUSIC_VOL : 0;
      musicGain.connect(masterGain);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = sfxEnabled ? 1 : 0;
      sfxGain.connect(masterGain);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  // Bir kullanıcı jestinden çağrılır (tarayıcı autoplay/mobil kilidi). Context'i
  // resume eder ve ilk seferinde bir sessiz buffer çalarak iOS kilidini açar.
  function unlock() {
    ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (unlocked) return;
    unlocked = true;
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) { /* yok say */ }
  }

  function setSfxEnabled(v) {
    sfxEnabled = !!v;
    try { localStorage.setItem('hk_sfx', sfxEnabled ? '1' : '0'); } catch (e) { /* yok say */ }
    if (sfxGain && ctx) sfxGain.gain.setTargetAtTime(sfxEnabled ? 1 : 0, ctx.currentTime, 0.02);
  }
  function isSfxEnabled() { return sfxEnabled; }

  function setMusicEnabled(v) {
    musicEnabled = !!v;
    try { localStorage.setItem('hk_music', musicEnabled ? '1' : '0'); } catch (e) { /* yok say */ }
    if (musicGain && ctx) musicGain.gain.setTargetAtTime(musicEnabled ? MUSIC_VOL : 0, ctx.currentTime, 0.02);
  }
  function isMusicEnabled() { return musicEnabled; }

  // Tek osilatörlük kısa "blip": hızlı attack + üstel decay.
  function blip(freq, dur, type, gainVal, dest, when) {
    if (!ctx) return;
    const t = (when === undefined ? ctx.currentTime : when);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gainVal, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Aynı SFX'i minGap saniyeden hızlı tekrar tetikleme (yüzlerce düşman aynı
  // anda ölürken sesin gürültü makinesine dönüşmesini engeller).
  function throttled(name, minGap) {
    const now = ctx ? ctx.currentTime : 0;
    if (lastPlayed[name] !== undefined && now - lastPlayed[name] < minGap) return false;
    lastPlayed[name] = now;
    return true;
  }

  function sfx(name) {
    if (!ctx || !sfxEnabled) return;
    const now = ctx.currentTime;
    switch (name) {
      case 'hit':
        if (!throttled('hit', 0.05)) return;
        blip(200 + Math.random() * 60, 0.06, 'square', 0.08);
        break;
      case 'death':
        if (!throttled('death', 0.045)) return;
        blip(150 + Math.random() * 30, 0.13, 'triangle', 0.13);
        break;
      case 'hurt':
        blip(90, 0.28, 'sawtooth', 0.28);
        blip(60, 0.3, 'sawtooth', 0.2, sfxGain, now + 0.02);
        break;
      case 'levelup':
        blip(523.25, 0.13, 'square', 0.18, sfxGain, now);
        blip(659.25, 0.13, 'square', 0.18, sfxGain, now + 0.09);
        blip(783.99, 0.20, 'square', 0.18, sfxGain, now + 0.18);
        break;
      case 'chest':
        blip(659.25, 0.11, 'square', 0.18, sfxGain, now);
        blip(880.00, 0.20, 'square', 0.18, sfxGain, now + 0.10);
        break;
      case 'evolve':
        blip(392.00, 0.16, 'sawtooth', 0.2, sfxGain, now);
        blip(587.33, 0.16, 'sawtooth', 0.2, sfxGain, now + 0.11);
        blip(784.00, 0.28, 'sawtooth', 0.2, sfxGain, now + 0.22);
        break;
      case 'shoot':
        if (!throttled('shoot', 0.07)) return;
        blip(680, 0.05, 'square', 0.04);
        break;
      case 'gameover':
        blip(220, 0.3, 'sawtooth', 0.22, sfxGain, now);
        blip(174.61, 0.35, 'sawtooth', 0.22, sfxGain, now + 0.16);
        blip(130.81, 0.5, 'sawtooth', 0.22, sfxGain, now + 0.34);
        break;
    }
  }

  function scheduleMusicStep(time, s) {
    if (!ctx || !musicEnabled) return;
    // Bas nota her 2 adımda bir.
    if (s % 2 === 0) {
      const bi = Math.floor(s / 2) % BASS.length;
      blip(BASS[bi], 0.42, 'triangle', 0.5, musicGain, time);
    }
    // Arpej her adımda, hafif.
    const an = ARP[s % ARP.length];
    blip(an, 0.16, 'square', 0.16, musicGain, time);
  }

  function scheduler() {
    if (!ctx) return;
    // Arka plan sekmesinde setInterval kısılıp nextNoteTime çok geri kalırsa
    // bir sürü notanın aynı anda patlamasını önle: geçmişteyse öne al.
    if (nextNoteTime < ctx.currentTime) nextNoteTime = ctx.currentTime + 0.05;
    while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
      scheduleMusicStep(nextNoteTime, step);
      nextNoteTime += STEP_DUR;
      step++;
    }
  }

  // Scheduler oyun başında hep çalışır; müzik kapalıyken sadece nota üretmez,
  // böylece oyun sırasında müziği açınca anında devreye girer.
  function startMusic() {
    ensureCtx();
    if (!ctx || musicOn) return;
    musicOn = true;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.1;
    schedulerId = setInterval(scheduler, 40);
  }

  function stopMusic() {
    musicOn = false;
    if (schedulerId) { clearInterval(schedulerId); schedulerId = null; }
  }

  // İlk kullanıcı jestinde ses kilidini aç (özellikle mobil için kritik).
  if (typeof window !== 'undefined' && window.addEventListener) {
    const onFirstGesture = () => unlock();
    ['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach(ev => {
      window.addEventListener(ev, onFirstGesture, { passive: true });
    });
  }

  return {
    resume: unlock, unlock, sfx, startMusic, stopMusic,
    setSfxEnabled, isSfxEnabled, setMusicEnabled, isMusicEnabled, supported,
  };
})();
