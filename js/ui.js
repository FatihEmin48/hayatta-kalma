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
    els.levelUpChoices = document.getElementById('levelup-choices');
    els.gameOverTitle = document.getElementById('gameover-title');
    els.gameOverStats = document.getElementById('gameover-stats');
    els.gameOverScore = document.getElementById('gameover-score');
    els.gameOverHighScores = document.getElementById('gameover-highscores');
    els.startHighScores = document.getElementById('start-highscores');
    els.clearScoresBtn = document.getElementById('clear-scores-btn');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    refreshStartHighScores();
    els.clearScoresBtn.addEventListener('click', () => {
      Scores.clear();
      refreshStartHighScores();
    });

    els.muteBtn = document.getElementById('mute-btn');
    updateMuteButton();
    els.muteBtn.addEventListener('click', () => {
      Sound.resume();       // tıklama bir kullanıcı jesti → context'i de aç
      Sound.toggleMute();
      updateMuteButton();
    });
    // 'M' klavye kısayolu (level-up sırasında 1/2/3 ile çakışmaz).
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        Sound.toggleMute();
        updateMuteButton();
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
  }

  function setHudVisible(visible) {
    els.hud.classList.toggle('hidden', !visible);
  }

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

  function showLevelUp(choices) {
    els.levelUpChoices.innerHTML = '';
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<div class="choice-key">${i + 1}</div><div class="choice-name">${choice.name}</div><div class="choice-desc">${choice.desc}</div>`;
      btn.addEventListener('click', () => selectLevelUpChoice(i));
      els.levelUpChoices.appendChild(btn);
    });
    els.screenLevelUp.classList.remove('hidden');
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

  function refreshStartHighScores() {
    const list = Scores.load();
    renderHighScores(els.startHighScores, list, -1);
    els.clearScoresBtn.classList.toggle('hidden', list.length === 0);
  }

  function showGameOver(state, victory, scoreResult) {
    els.gameOverTitle.textContent = victory ? 'Hayatta Kaldın!' : 'Öldün';
    els.gameOverStats.textContent = `Süre: ${formatTime(state.timer)} · Seviye: ${state.player.level} · Öldürülen: ${state.kills}`;

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

  function updateMuteButton() {
    if (!els.muteBtn) return;
    const muted = Sound.isMuted();
    els.muteBtn.textContent = muted ? '🔇' : '🔊';
    els.muteBtn.classList.toggle('muted', muted);
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  return { init, hideAllScreens, setHudVisible, syncHud, showLevelUp, hideLevelUp, showGameOver, showToast, updateMuteButton };
})();
