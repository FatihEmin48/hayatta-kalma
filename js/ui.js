const UI = (function () {
  let els = {};
  let toastTimer = null;

  function init() {
    els.hud = document.getElementById('hud');
    els.toast = document.getElementById('toast');
    els.hpFill = document.getElementById('hp-fill');
    els.hpText = document.getElementById('hp-text');
    els.xpFill = document.getElementById('xp-fill');
    els.levelText = document.getElementById('level-text');
    els.timerText = document.getElementById('timer-text');
    els.killsText = document.getElementById('kills-text');

    els.screenStart = document.getElementById('screen-start');
    els.screenLevelUp = document.getElementById('screen-levelup');
    els.screenGameOver = document.getElementById('screen-gameover');
    els.screenPause = document.getElementById('screen-pause');
    els.pauseBtn = document.getElementById('pause-btn');
    els.dashBtn = document.getElementById('dash-btn');
    els.levelUpChoices = document.getElementById('levelup-choices');
    els.levelUpActions = document.getElementById('levelup-actions');
    els.gameOverTitle = document.getElementById('gameover-title');
    els.gameOverStats = document.getElementById('gameover-stats');
    els.gameOverScore = document.getElementById('gameover-score');
    els.gameOverSummary = document.getElementById('gameover-summary');
    els.gameOverGold = document.getElementById('gameover-gold');
    els.gameOverHighScores = document.getElementById('gameover-highscores');
    els.startHighScores = document.getElementById('start-highscores');
    els.clearScoresBtn = document.getElementById('clear-scores-btn');
    els.shop = document.getElementById('shop');
    els.shopToggle = document.getElementById('shop-toggle');
    els.charSelect = document.getElementById('char-select');
    els.modeSelect = document.getElementById('mode-select');
    els.achievements = document.getElementById('achievements');
    els.achToggle = document.getElementById('ach-toggle');
    els.career = document.getElementById('career');
    els.careerToggle = document.getElementById('career-toggle');
    els.codex = document.getElementById('codex');
    els.codexToggle = document.getElementById('codex-toggle');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('menu-btn').addEventListener('click', returnToMenu);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('pause-menu-btn').addEventListener('click', returnToMenu);
    els.pauseBtn.addEventListener('click', togglePause);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePause();
      // 'r' = level-up'ta yeniden çevir (hareket tuşu değil, güvenli). Atlama
      // bilerek klavyeye bağlı değil: 's' hareket tuşu, kazara atlamayı önle.
      else if ((e.key === 'r' || e.key === 'R') && state.mode === STATE.LEVEL_UP) levelUpReroll();
    });

    renderShop();
    els.shopToggle.addEventListener('click', () => {
      els.shop.classList.toggle('hidden');
      renderShop();
    });
    renderCharacters();
    renderModes();
    refreshAchievements();
    els.achToggle.addEventListener('click', () => {
      els.achievements.classList.toggle('hidden');
      refreshAchievements();
    });
    refreshCareer();
    els.careerToggle.addEventListener('click', () => {
      els.career.classList.toggle('hidden');
      refreshCareer();
    });
    els.codexToggle.addEventListener('click', () => {
      els.codex.classList.toggle('hidden');
      if (!els.codex.classList.contains('hidden')) renderCodex();
    });

    refreshStartHighScores();
    els.clearScoresBtn.addEventListener('click', () => {
      Scores.clear();
      refreshStartHighScores();
    });


    // Ses ayarları: ⚙️ butonu, efekt sesi ve müziği bağımsız açıp kapatan
    // iki anahtarlı bir panel açar. Her ekranda (start/oyun/game-over) erişilir.
    els.settingsBtn = document.getElementById('settings-btn');
    els.settingsPanel = document.getElementById('settings-panel');
    els.toggleSfx = document.getElementById('toggle-sfx');
    els.toggleMusic = document.getElementById('toggle-music');
    updateSoundControls();
    els.settingsBtn.addEventListener('click', () => {
      Sound.resume();       // tıklama bir kullanıcı jesti → ses kilidini aç
      els.settingsPanel.classList.toggle('hidden');
    });
    els.toggleSfx.addEventListener('click', () => {
      Sound.resume();
      Sound.setSfxEnabled(!Sound.isSfxEnabled());
      updateSoundControls();
    });
    els.toggleMusic.addEventListener('click', () => {
      Sound.resume();
      Sound.setMusicEnabled(!Sound.isMusicEnabled());
      updateSoundControls();
    });
    // 'M' klavye kısayolu: her ikisini birden aç/kapat (level-up'taki 1/2/3
    // ile çakışmaz).
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        const anyOn = Sound.isSfxEnabled() || Sound.isMusicEnabled();
        Sound.setSfxEnabled(!anyOn);
        Sound.setMusicEnabled(!anyOn);
        updateSoundControls();
      }
    });

    els.canvas = document.getElementById('game');
    applyCanvasSize();
    window.addEventListener('resize', applyCanvasSize);
    window.addEventListener('orientationchange', applyCanvasSize);
  }

  // Resizes the canvas's actual drawing buffer (not just its CSS box) to
  // match the device viewport, and keeps CANVAS_W/CANVAS_H (used everywhere
  // for camera clamping, background drawing, off-screen spawn points, etc.)
  // in sync. This replaces scaling a fixed 960x540 box down to fit — that
  // left most of a tall phone screen as empty letterbox space since the
  // game's aspect ratio didn't match a portrait phone's.
  function applyCanvasSize() {
    const w = clamp(Math.round(window.innerWidth), 320, 1600);
    const h = clamp(Math.round(window.innerHeight), 320, 1000);
    CANVAS_W = w;
    CANVAS_H = h;
    els.canvas.width = w;
    els.canvas.height = h;
  }

  function hideAllScreens() {
    els.screenStart.classList.add('hidden');
    els.screenLevelUp.classList.add('hidden');
    els.screenGameOver.classList.add('hidden');
    els.screenPause.classList.add('hidden');
  }

  function setHudVisible(visible) {
    els.hud.classList.toggle('hidden', !visible);
    els.pauseBtn.classList.toggle('hidden', !visible); // ⏸️ yalnız oyun içinde
    els.dashBtn.classList.toggle('hidden', !visible);  // ⚡ (CSS ile sadece dokunmatikte)
  }

  function showPause() { els.screenPause.classList.remove('hidden'); }
  function hidePause() { els.screenPause.classList.add('hidden'); }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function syncHud(state) {
    if (state.mode === STATE.START) return;

    const player = state.player;
    const maxHp = getPlayerMaxHp(player);

    els.hpFill.style.width = `${clamp(player.hp / maxHp, 0, 1) * 100}%`;
    els.hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${Math.round(maxHp)}`;
    els.xpFill.style.width = `${clamp(player.xp / player.xpToNext, 0, 1) * 100}%`;
    els.levelText.textContent = `Seviye ${player.level}`;
    els.timerText.textContent = formatTime(state.timer);
    els.killsText.textContent = `Öldürülen: ${state.kills}`;
  }

  function showLevelUp(choices, meta) {
    els.levelUpChoices.innerHTML = '';
    choices.forEach((choice, i) => {
      const card = document.createElement('div');
      card.className = 'choice-card' + (meta && meta.lockedIndex === i ? ' locked' : '');

      const pick = document.createElement('button');
      pick.className = 'choice-btn';
      pick.innerHTML = `<div class="choice-key">${i + 1}</div><div class="choice-name">${choice.name}</div><div class="choice-desc">${choice.desc}</div>`;
      pick.addEventListener('click', () => selectLevelUpChoice(i));

      const tools = document.createElement('div');
      tools.className = 'choice-tools';
      const lockBtn = document.createElement('button');
      lockBtn.className = 'mini-btn';
      lockBtn.textContent = (meta && meta.lockedIndex === i) ? '🔒' : '🔓';
      lockBtn.title = 'Kilitle (yeniden çevirince korunur)';
      lockBtn.addEventListener('click', () => levelUpLock(i));
      const banBtn = document.createElement('button');
      banBtn.className = 'mini-btn';
      banBtn.textContent = '✖';
      banBtn.title = 'Sil (bu oyunda bir daha çıkmaz)';
      if (!meta || meta.banishLeft <= 0) banBtn.disabled = true;
      banBtn.addEventListener('click', () => levelUpBanish(i));
      tools.appendChild(lockBtn);
      tools.appendChild(banBtn);

      card.appendChild(pick);
      card.appendChild(tools);
      els.levelUpChoices.appendChild(card);
    });

    renderLevelUpActions(meta);
    els.screenLevelUp.classList.remove('hidden');
  }

  function renderLevelUpActions(meta) {
    if (!els.levelUpActions) return;
    els.levelUpActions.innerHTML = '';

    const reroll = document.createElement('button');
    reroll.className = 'ghost-btn';
    reroll.textContent = `🎲 Yeniden Çevir (🪙 ${meta ? meta.rerollCost : 0})`;
    if (!meta || meta.gold < meta.rerollCost) reroll.disabled = true;
    reroll.addEventListener('click', levelUpReroll);

    const skip = document.createElement('button');
    skip.className = 'ghost-btn';
    skip.textContent = 'Atla';
    skip.addEventListener('click', levelUpSkip);

    const info = document.createElement('div');
    info.className = 'levelup-info';
    info.textContent = `🪙 ${meta ? meta.gold : 0} · Sil hakkı: ${meta ? meta.banishLeft : 0}`;

    els.levelUpActions.appendChild(reroll);
    els.levelUpActions.appendChild(skip);
    els.levelUpActions.appendChild(info);
  }

  function hideLevelUp() {
    els.screenLevelUp.classList.add('hidden');
  }

  // Bir yüksek-skor listesini bir kaba <table> olarak basar; highlightIndex
  // satırı (o an biten run) vurgulanır. Liste boşsa kabı gizler.
  function renderHighScores(container, list, highlightIndex) {
    if (!container) return;
    if (!list || list.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');
    let rows = '';
    list.forEach((e, i) => {
      const cls = i === highlightIndex ? ' class="me"' : '';
      rows += `<tr${cls}><td>${i + 1}</td><td>${e.score}</td><td>${formatTime(e.time)}</td><td>${e.level}</td><td>${e.kills}</td></tr>`;
    });
    container.innerHTML =
      `<h3>En Yüksek Puanlar</h3>` +
      `<table class="hs-table">` +
      `<thead><tr><th>#</th><th>Puan</th><th>Süre</th><th>Sv</th><th>Öldürme</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>`;
  }

  // Kalıcı yükseltme mağazası (başlangıç ekranı). Toggle butonunda güncel
  // altın gösterilir; her satırda seviye + maliyet, karşılanamıyorsa/maks ise
  // buton pasif.
  function renderShop() {
    if (!els.shop) return;
    const gold = Meta.getGold();
    els.shopToggle.textContent = `🛒 Mağaza · 🪙 ${gold}`;
    if (els.shop.classList.contains('hidden')) return;

    let rows = '';
    for (const u of META_UPGRADES) {
      const lvl = Meta.getLevel(u.id);
      const cost = Meta.costFor(u.id);
      const maxed = cost === null;
      const afford = !maxed && gold >= cost;
      const label = maxed ? 'MAKS' : `🪙 ${cost}`;
      const disabled = maxed || !afford ? 'disabled' : '';
      rows +=
        `<div class="shop-row">` +
        `<div class="shop-info"><span class="shop-name">${u.name}</span>` +
        `<span class="shop-lvl">Sv ${lvl}/${u.maxLevel}</span>` +
        `<div class="shop-desc">${u.desc}</div></div>` +
        `<button class="shop-buy" data-id="${u.id}" ${disabled}>${label}</button>`;
      rows += `</div>`;
    }
    els.shop.innerHTML = `<div class="shop-head"><h3>Mağaza</h3><span class="gold">🪙 ${gold}</span></div>${rows}`;

    const buyBtns = els.shop.querySelectorAll ? els.shop.querySelectorAll('.shop-buy') : [];
    buyBtns.forEach(b => b.addEventListener('click', () => {
      if (Meta.buy(b.getAttribute('data-id'))) {
        Sound.resume();
        Sound.sfx('chest');
        renderShop();
      }
    }));
  }

  // Başlangıç ekranı karakter seçici: her karakter bir buton, seçili olan
  // vurgulanır, altında açıklaması; kilitli karakterler pasif + kilit ipucu.
  function renderCharacters() {
    if (!els.charSelect) return;
    const curId = Characters.getId();
    let btns = '';
    for (const c of CHARACTERS) {
      const unlocked = Characters.isUnlocked(c);
      const active = c.id === curId ? ' active' : '';
      const lockedCls = unlocked ? '' : ' locked';
      const label = unlocked ? c.name : `🔒 ${c.name}`;
      btns += `<button class="char-btn${active}${lockedCls}" data-id="${c.id}" ${unlocked ? '' : 'disabled'}>${label}</button>`;
    }
    const cur = Characters.current();
    els.charSelect.innerHTML =
      `<div class="char-title">Karakter</div>` +
      `<div class="char-btns">${btns}</div>` +
      `<div class="char-desc">${cur.desc}</div>`;
    const btnEls = els.charSelect.querySelectorAll ? els.charSelect.querySelectorAll('.char-btn') : [];
    btnEls.forEach(b => b.addEventListener('click', () => {
      Characters.select(b.getAttribute('data-id'));
      renderCharacters();
    }));
  }

  // Oyun modu seçici (karakter seçiciyle aynı stil).
  function renderModes() {
    if (!els.modeSelect) return;
    const curId = Modes.getId();
    let btns = '';
    for (const m of GAME_MODES) {
      const active = m.id === curId ? ' active' : '';
      btns += `<button class="char-btn${active}" data-id="${m.id}">${m.name}</button>`;
    }
    els.modeSelect.innerHTML =
      `<div class="char-title">Oyun Modu</div>` +
      `<div class="char-btns">${btns}</div>` +
      `<div class="char-desc">${Modes.current().desc}</div>`;
    const btnEls = els.modeSelect.querySelectorAll ? els.modeSelect.querySelectorAll('.char-btn') : [];
    btnEls.forEach(b => b.addEventListener('click', () => {
      Modes.select(b.getAttribute('data-id'));
      renderModes();
    }));
  }

  function renderAchievements() {
    if (!els.achievements) return;
    let rows = '';
    for (const a of Achievements.all()) {
      const done = Achievements.isDone(a.id);
      rows +=
        `<div class="ach-row ${done ? 'done' : ''}">` +
        `<span class="ach-icon">${done ? '✅' : '🔒'}</span>` +
        `<span class="ach-info"><span class="ach-name">${a.name}</span>` +
        `<span class="ach-desc">${a.desc}</span></span></div>`;
    }
    els.achievements.innerHTML = rows;
  }

  function refreshAchievements() {
    if (!els.achToggle) return;
    els.achToggle.textContent = `🏆 Başarımlar (${Achievements.doneCount()}/${Achievements.all().length})`;
    if (!els.achievements.classList.contains('hidden')) renderAchievements();
  }

  function codexEnemyDesc(e) {
    if (e.splitter) return 'ölünce bölünür';
    if (e.ranged) return 'uzaktan mermi atar';
    if (e.exploder) return 'ölünce patlar';
    if (e.erratic) return 'hızlı, zikzak hareket';
    if (e.id === 'tank') return 'yavaş ama dayanıklı';
    return 'temel düşman';
  }

  // Rehber/Codex: silahlar + evrim tarifleri, düşmanlar, biyomlar (config'ten).
  function renderCodex() {
    if (!els.codex) return;
    let html = '<div class="codex-h">Silahlar & Evrimler</div>';
    for (const w of WEAPON_DEFS) {
      let line = `<b>${w.name}</b>`;
      const evo = EVOLUTION_DEFS.find(e => e.weaponId === w.id);
      if (evo) {
        const p = PASSIVE_DEFS.find(x => x.id === evo.passiveId);
        line += ` → <span class="codex-evo">${evo.name}</span> <span class="codex-sub">(${w.name} maks + ${p ? p.name : evo.passiveId} maks)</span>`;
      }
      html += `<div class="codex-row">${line}</div>`;
    }
    html += '<div class="codex-h">Düşmanlar</div>';
    for (const e of ENEMY_DEFS) {
      html += `<div class="codex-row"><b>${e.name}</b> <span class="codex-sub">${codexEnemyDesc(e)}</span></div>`;
    }
    html += `<div class="codex-row"><b>Boss</b> <span class="codex-sub">iri, radyal mermi, can barı, büyük ödül</span></div>`;
    html += '<div class="codex-h">Biyomlar</div>';
    for (const b of BIOMES) {
      html += `<div class="codex-row"><b>${b.name}</b> <span class="codex-sub">${b.hazard || 'tehlikesiz'}</span></div>`;
    }
    els.codex.innerHTML = html;
  }

  function renderCareer() {
    if (!els.career) return;
    const d = Career.get();
    const rows = [
      ['Oynanan oyun', d.runs],
      ['Toplam öldürme', d.kills],
      ['Toplam süre', formatTime(d.time)],
      ['Öldürülen boss', d.bosses],
      ['En yüksek combo', 'x' + d.bestCombo],
      ['En yüksek seviye', d.bestLevel],
      ['Toplam kazanılan altın', d.gold],
    ];
    els.career.innerHTML = rows.map(([k, v]) =>
      `<div class="ach-row done"><span class="ach-info"><span class="ach-name">${k}</span>` +
      `<span class="ach-desc">${v}</span></span></div>`).join('');
  }

  function refreshCareer() {
    if (!els.careerToggle) return;
    els.careerToggle.textContent = `📈 Kariyer (${Career.get().runs} oyun)`;
    if (!els.career.classList.contains('hidden')) renderCareer();
  }

  // Game-over ekranından başlangıç menüsüne dönünce çağrılır.
  function showStartMenu() {
    hideAllScreens();
    els.screenStart.classList.remove('hidden');
    renderShop();
    renderCharacters();
    renderModes();
    refreshAchievements();
    refreshCareer();
    refreshStartHighScores();
  }

  function refreshStartHighScores() {
    const list = Scores.load();
    renderHighScores(els.startHighScores, list, -1);
    els.clearScoresBtn.classList.toggle('hidden', list.length === 0);
  }

  function showGameOver(state, victory, scoreResult, goldEarned) {
    els.gameOverTitle.textContent = victory ? 'Hayatta Kaldın!' : 'Öldün';
    els.gameOverStats.textContent = `Süre: ${formatTime(state.timer)} · Seviye: ${state.player.level} · Öldürülen: ${state.kills} · En yüksek combo: x${state.maxCombo}`;

    // Run özeti: hasar/sn + toplam hasar + en etkili silah.
    const dps = state.timer > 0 ? state.totalDamage / state.timer : 0;
    let bestId = null, bestDmg = 0;
    for (const k in state.weaponDamage) {
      if (state.weaponDamage[k] > bestDmg) { bestDmg = state.weaponDamage[k]; bestId = k; }
    }
    let summary = `Hasar/sn: ${Math.round(dps)} · Toplam hasar: ${Math.round(state.totalDamage)}`;
    if (bestId) {
      const wd = WEAPON_DEFS.find(w => w.id === bestId);
      const name = wd ? wd.name : (bestId === 'companion' ? 'Yoldaş' : bestId);
      const pct = state.totalDamage > 0 ? Math.round(bestDmg / state.totalDamage * 100) : 0;
      summary += ` · En etkili: ${name} (%${pct})`;
    }
    els.gameOverSummary.textContent = summary;

    if (goldEarned !== undefined) {
      els.gameOverGold.textContent = `🪙 +${goldEarned} altın kazandın · Toplam: ${Meta.getGold()}`;
    } else {
      els.gameOverGold.textContent = '';
    }

    if (scoreResult) {
      let line = `Puan: ${scoreResult.entry.score}`;
      if (scoreResult.isRecord) line += ' 🏆 Yeni Rekor!';
      else if (scoreResult.madeList) line += ` · ${scoreResult.index + 1}. sıraya girdin!`;
      els.gameOverScore.textContent = line;
      renderHighScores(els.gameOverHighScores, scoreResult.list, scoreResult.index);
    } else {
      els.gameOverScore.textContent = '';
      renderHighScores(els.gameOverHighScores, Scores.load(), -1);
    }
    els.screenGameOver.classList.remove('hidden');
  }

  function updateSoundControls() {
    if (!els.toggleSfx) return;
    const sfxOn = Sound.isSfxEnabled();
    const musicOn = Sound.isMusicEnabled();
    els.toggleSfx.textContent = `${sfxOn ? '🔊' : '🔇'} Efektler: ${sfxOn ? 'Açık' : 'Kapalı'}`;
    els.toggleSfx.classList.toggle('off', !sfxOn);
    els.toggleMusic.textContent = `${musicOn ? '🎵' : '🔇'} Müzik: ${musicOn ? 'Açık' : 'Kapalı'}`;
    els.toggleMusic.classList.toggle('off', !musicOn);
    // Ayarların tümü kapalıysa ⚙️ butonuna sessiz işareti koy.
    els.settingsBtn.textContent = (!sfxOn && !musicOn) ? '🔇' : '⚙️';
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  return { init, hideAllScreens, setHudVisible, syncHud, showLevelUp, hideLevelUp, showGameOver, showToast, updateSoundControls, showStartMenu, showPause, hidePause };
})();
