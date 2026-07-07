const UI = (function () {
  let els = {};

  function init() {
    els.hud = document.getElementById('hud');
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

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);

    els.gameWrap = document.getElementById('game-wrap');
    applyResponsiveScale();
    window.addEventListener('resize', applyResponsiveScale);
    window.addEventListener('orientationchange', applyResponsiveScale);
  }

  // Canvas keeps a fixed internal resolution (CANVAS_W x CANVAS_H); on small
  // screens we just shrink the whole #game-wrap (canvas + HUD + joystick)
  // uniformly via CSS transform so every element scales together in place.
  function applyResponsiveScale() {
    const margin = 0.98;
    const scale = Math.min(1, (window.innerWidth * margin) / CANVAS_W, (window.innerHeight * margin) / CANVAS_H);
    els.gameWrap.style.transform = `scale(${scale})`;
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

  function showGameOver(state, victory) {
    els.gameOverTitle.textContent = victory ? 'Hayatta Kaldın!' : 'Öldün';
    els.gameOverStats.textContent = `Süre: ${formatTime(state.timer)} · Seviye: ${state.player.level} · Öldürülen: ${state.kills}`;
    els.screenGameOver.classList.remove('hidden');
  }

  return { init, hideAllScreens, setHudVisible, syncHud, showLevelUp, hideLevelUp, showGameOver };
})();
