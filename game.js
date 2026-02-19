const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const overlayButton = document.getElementById('overlay-button');
const overlayPanel = document.getElementById('overlay-panel');
const jumpBtn = document.getElementById('jump-btn');
const startBtn = document.getElementById('start-btn');

const TOTAL_OBSTACLES = 10;
const GRAVITY = 0.7;
const JUMP_VELOCITY = -13.2;
const BASE_SPEED = 2.9;
const FINISH_SPEED = 2.1;
const TARGET_SIZES = {
  quokka: 48,
  cheese: 24,
  crow: 24,
};

let groundY = 0;
let lastTime = 0;
let obstacles = [];
let cleared = 0;
let mode = 'start';
let clouds = [];
let confetti = [];
let finish = {
  active: false,
  reached: false,
  cakeX: 0,
  cakeY: 0,
  cakeW: 46,
  cakeH: 38,
};

const assets = {
  quokka: new Image(),
  cheese: new Image(),
  crow: new Image(),
};

const spriteSizes = {
  quokka: { w: 42, h: 36 },
  cheese: { w: 32, h: 24 },
  crow: { w: 32, h: 24 },
};

let assetsReady = false;
let assetsLoaded = 0;

Object.entries({
  quokka: 'quokka.png',
  cheese: 'cheese.png',
  crow: 'crow.png',
}).forEach(([key, src]) => {
  assets[key].src = src;
  assets[key].addEventListener('load', () => {
    assetsLoaded += 1;
    if (assetsLoaded === 3) {
      assetsReady = true;
      updateSpriteSizes();
    }
  });
});

const quokka = {
  x: 90,
  y: 0,
  w: 42,
  h: 36,
  vy: 0,
  grounded: true,
};

function resize() {
  const width = Math.min(900, Math.max(360, window.innerWidth * 0.92));
  canvas.width = Math.floor(width);
  canvas.height = 320;
  groundY = canvas.height - 50;
  if (mode !== 'running') {
    quokka.y = groundY - quokka.h;
  }
  obstacles.forEach((obstacle) => {
    obstacle.y = obstacle.type === 'cheese'
      ? groundY - obstacle.h
      : groundY - obstacle.h - 26;
  });
  if (finish.active) {
    finish.cakeY = groundY - finish.cakeH;
    finish.cakeX = Math.min(canvas.width - finish.cakeW - 24, finish.cakeX);
  }
}

window.addEventListener('resize', resize);
resize();
buildClouds();

function updateSpriteSizes() {
  Object.keys(assets).forEach((key) => {
    const image = assets[key];
    if (!image.naturalWidth || !image.naturalHeight) return;
    const ratio = image.naturalWidth / image.naturalHeight;
    const targetH = TARGET_SIZES[key];
    spriteSizes[key].h = targetH;
    spriteSizes[key].w = Math.round(targetH * ratio);
  });

  quokka.w = spriteSizes.quokka.w;
  quokka.h = spriteSizes.quokka.h;
  if (mode !== 'running') {
    quokka.y = groundY - quokka.h;
  }

  obstacles.forEach((obstacle) => {
    const sizes = spriteSizes[obstacle.type];
    obstacle.w = sizes.w;
    obstacle.h = sizes.h;
    obstacle.y = obstacle.type === 'cheese'
      ? groundY - obstacle.h
      : groundY - obstacle.h - 26;
  });
}

function setOverlay({ title, subtitle = '', buttonLabel = '', visible = true, win = false }) {
  overlayTitle.textContent = title;
  overlayTitle.classList.toggle('win', win);
  overlaySubtitle.textContent = subtitle;
  if (overlayPanel) {
    overlayPanel.classList.toggle('win', win);
  }

  if (buttonLabel) {
    overlayButton.textContent = buttonLabel;
    overlayButton.classList.remove('is-hidden');
  } else {
    overlayButton.classList.add('is-hidden');
  }

  overlay.classList.toggle('is-visible', visible);
}

function updateScore() {
  scoreEl.textContent = `${cleared}/${TOTAL_OBSTACLES}`;
}

function resetGame() {
  cleared = 0;
  updateScore();
  quokka.y = groundY - quokka.h;
  quokka.vy = 0;
  quokka.grounded = true;
  quokka.x = 90;
  confetti = [];
  finish.active = false;
  finish.reached = false;
  buildObstacles();
  buildClouds();
}

function buildObstacles() {
  const types = [];
  for (let i = 0; i < TOTAL_OBSTACLES; i += 1) {
    types.push(Math.random() < 0.55 ? 'cheese' : 'crow');
  }
  if (!types.includes('cheese')) types[0] = 'cheese';
  if (!types.includes('crow')) types[1] = 'crow';

  obstacles = [];
  let x = canvas.width + 160;

  for (let i = 0; i < TOTAL_OBSTACLES; i += 1) {
    const type = types[i];
    const sizes = spriteSizes[type];
    const obstacle = {
      type,
      w: sizes.w,
      h: sizes.h,
      x,
      y: 0,
      cleared: false,
      remove: false,
    };
    obstacle.y = type === 'cheese'
      ? groundY - obstacle.h
      : groundY - obstacle.h - 26;
    obstacles.push(obstacle);
    x += 220 + Math.random() * 120;
  }
}

function startGame() {
  mode = 'running';
  setOverlay({ title: '', visible: false });
  setControlsActive(true);
  setStartButtonVisible(false);
  resetGame();
}

function startFinish() {
  mode = 'finish';
  finish.active = true;
  finish.reached = false;
  finish.cakeW = 46;
  finish.cakeH = 38;
  finish.cakeX = Math.min(canvas.width - finish.cakeW - 24, quokka.x + 220);
  finish.cakeY = groundY - finish.cakeH;
  obstacles = [];
}

function gameOver(reason = 'bonk') {
  const message = reason === 'caught'
    ? 'Pica by a crow.'
    : 'Ate too much cheese.';
  mode = 'gameover';
  setOverlay({
    title: 'Oh no! Game over',
    subtitle: message,
    buttonLabel: 'Try again',
    visible: true,
  });
  setControlsActive(false);
  setStartButtonVisible(false);
}

function winGame() {
  mode = 'win';
  spawnConfetti();
  setOverlay({
    title: 'Feliz Cumpleaños Quokka.\nI love you so much!',
    subtitle: '',
    buttonLabel: 'Play again',
    visible: true,
    win: true,
  });
  setControlsActive(false);
  setStartButtonVisible(false);
}

function rectsOverlap(a, b) {
  const pad = b.type === 'crow' ? 6 : 4;
  return (
    a.x < b.x + b.w - pad &&
    a.x + a.w > b.x + pad &&
    a.y < b.y + b.h - pad &&
    a.y + a.h > b.y + pad
  );
}

function update(dt) {
  quokka.vy += GRAVITY * dt;
  quokka.y += quokka.vy * dt;

  if (quokka.y >= groundY - quokka.h) {
    quokka.y = groundY - quokka.h;
    quokka.vy = 0;
    quokka.grounded = true;
  } else {
    quokka.grounded = false;
  }

  if (mode === 'running') {
    for (let i = 0; i < obstacles.length; i += 1) {
      const obstacle = obstacles[i];
      obstacle.x -= BASE_SPEED * dt;

      if (!obstacle.cleared && rectsOverlap(quokka, obstacle)) {
        gameOver(obstacle.type === 'crow' ? 'caught' : 'bonk');
        break;
      }

      if (!obstacle.cleared && obstacle.x + obstacle.w < quokka.x - 6) {
        obstacle.cleared = true;
        cleared += 1;
        updateScore();
        if (cleared >= TOTAL_OBSTACLES) {
          startFinish();
          break;
        }
      }
    }

    obstacles = obstacles.filter((obstacle) => !obstacle.remove && obstacle.x + obstacle.w > -50);
  }

  if (mode === 'finish' && finish.active && !finish.reached) {
    if (quokka.grounded) {
      quokka.x += FINISH_SPEED * dt;
      if (quokka.x + quokka.w >= finish.cakeX - 4) {
        finish.reached = true;
        winGame();
      }
    }
  }

  clouds.forEach((cloud) => {
    cloud.x -= (BASE_SPEED * 0.35 + cloud.speed) * dt;
    if (cloud.x + cloud.w < -40) {
      cloud.x = canvas.width + Math.random() * 120;
      cloud.y = 20 + Math.random() * 80;
    }
  });

}

function spawnConfetti() {
  confetti = [];
  const colors = ['#ff6f91', '#ffd166', '#8be9c9', '#7aa2ff', '#f7b6c8'];
  const count = 150;
  for (let i = 0; i < count; i += 1) {
    confetti.push({
      x: canvas.width * 0.2 + Math.random() * canvas.width * 0.6,
      y: -20 - Math.random() * 60,
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3,
      size: 4 + Math.random() * 4,
      rotation: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: colors[i % colors.length],
      ttl: 260 + Math.random() * 60,
    });
  }
}

function updateConfetti(dt) {
  if (confetti.length === 0) return;
  const gravity = 0.08;
  confetti.forEach((piece) => {
    piece.vy += gravity * dt;
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.rotation += piece.vr * dt;
    piece.ttl -= dt * 0.7;
  });
  confetti = confetti.filter((piece) => piece.ttl > 0 && piece.y < canvas.height + 40);
}

function buildClouds() {
  clouds = [];
  const count = 5;
  for (let i = 0; i < count; i += 1) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 20 + Math.random() * 80,
      w: 60 + Math.random() * 40,
      h: 20 + Math.random() * 10,
      speed: Math.random() * 0.4,
    });
  }
}

function drawQuokka() {
  const x = quokka.x;
  const y = quokka.y;

  if (assetsReady) {
    ctx.drawImage(assets.quokka, x, y, quokka.w, quokka.h);
    return;
  }

  ctx.fillStyle = '#f6f0e2';
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 22, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround() {
  ctx.strokeStyle = '#e59ab0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 8);
  ctx.lineTo(canvas.width, groundY + 8);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < canvas.width; i += 40) {
    ctx.beginPath();
    ctx.arc(i + (Date.now() / 80) % 40, groundY + 14, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCake() {
  if (!finish.active) return;
  const x = finish.cakeX;
  const y = finish.cakeY;

  ctx.fillStyle = '#f8e7c8';
  ctx.fillRect(x, y + 12, finish.cakeW, finish.cakeH - 12);

  ctx.fillStyle = '#f7b6c8';
  ctx.fillRect(x, y + 6, finish.cakeW, 10);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 6, y, finish.cakeW - 12, 8);

  ctx.fillStyle = '#ff6f91';
  ctx.fillRect(x + finish.cakeW / 2 - 2, y - 8, 4, 10);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(x + finish.cakeW / 2, y - 10, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawConfetti() {
  if (confetti.length === 0) return;
  confetti.forEach((piece) => {
    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
    ctx.restore();
  });
}

function drawClouds() {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  clouds.forEach((cloud) => {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.5, cloud.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cloud.x + cloud.w * 0.3, cloud.y + cloud.h * 0.2, cloud.w * 0.35, cloud.h * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cloud.x - cloud.w * 0.25, cloud.y + cloud.h * 0.15, cloud.w * 0.28, cloud.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    if (obstacle.remove) return;

    if (assetsReady) {
      const image = obstacle.type === 'cheese' ? assets.cheese : assets.crow;
      ctx.drawImage(image, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      return;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawClouds();
  drawGround();
  drawCake();
  drawObstacles();
  drawQuokka();
  drawConfetti();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(2, (timestamp - lastTime) / 16.67);
  lastTime = timestamp;

  if (mode === 'running' || mode === 'finish') {
    update(dt);
  }
  updateConfetti(dt);

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

function handleJump() {
  if (mode === 'start') {
    startGame();
  }
  if (mode !== 'running') return;
  if (quokka.grounded) {
    quokka.vy = JUMP_VELOCITY;
    quokka.grounded = false;
  }
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    handleJump();
  }

  if ((mode === 'gameover' || mode === 'win') && event.code === 'Space') {
    startGame();
  }
});

overlayButton.addEventListener('click', () => {
  startGame();
});

function bindControl(button, action) {
  if (!button) return;
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    action();
  }, { passive: false });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    action();
  });
}

bindControl(jumpBtn, handleJump);

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  handleJump();
}, { passive: false });

function setControlsActive(active) {
  if (!jumpBtn) return;
  const controls = document.getElementById('mobile-controls');
  if (!controls) return;
  controls.classList.toggle('is-active', active);
}

function setStartButtonVisible(visible) {
  if (!startBtn) return;
  startBtn.classList.toggle('is-hidden', !visible);
}

startBtn.addEventListener('click', () => {
  startGame();
});

setOverlay({
  title: 'Press Jump for Picas to start',
  subtitle: 'Space/↑ or Jump button to hop',
  buttonLabel: '',
  visible: true,
});

setControlsActive(false);
setStartButtonVisible(true);
