const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const overlayButton = document.getElementById('overlay-button');
const overlayPanel = document.getElementById('overlay-panel');

const TOTAL_OBSTACLES = 10;
const GRAVITY = 0.85;
const JUMP_VELOCITY = -12.5;
const BASE_SPEED = 3.3;

let groundY = 0;
let lastTime = 0;
let obstacles = [];
let effects = [];
let cleared = 0;
let mode = 'start';
let clouds = [];

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
      : groundY - obstacle.h - 20;
  });
}

window.addEventListener('resize', resize);
resize();
buildClouds();

function setOverlay({ title, subtitle = '', buttonLabel = '', visible = true, win = false }) {
  overlayTitle.textContent = title;
  overlayTitle.classList.toggle('win', win);
  overlaySubtitle.textContent = subtitle;

  if (buttonLabel) {
    overlayButton.textContent = buttonLabel;
    overlayButton.classList.remove('is-hidden');
  } else {
    overlayButton.classList.add('is-hidden');
  }

  overlay.classList.toggle('is-visible', visible);
}

function updateScore() {
  scoreEl.textContent = `Obstacles cleared: ${cleared}/${TOTAL_OBSTACLES}`;
}

function resetGame() {
  cleared = 0;
  updateScore();
  effects = [];
  quokka.y = groundY - quokka.h;
  quokka.vy = 0;
  quokka.grounded = true;
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
    const obstacle = {
      type,
      w: type === 'cheese' ? 34 : 36,
      h: type === 'cheese' ? 28 : 26,
      x,
      y: 0,
      cleared: false,
      remove: false,
    };
    obstacle.y = type === 'cheese'
      ? groundY - obstacle.h
      : groundY - obstacle.h - 20;
    obstacles.push(obstacle);
    x += 180 + Math.random() * 90;
  }
}

function startGame() {
  mode = 'running';
  setOverlay({ title: '', visible: false });
  resetGame();
}

function gameOver(reason = 'bonk') {
  const message = reason === 'caught'
    ? 'Caught by a crow.'
    : 'The quokka bonked an obstacle.';
  mode = 'gameover';
  setOverlay({
    title: 'Game over',
    subtitle: message,
    buttonLabel: 'Try again',
    visible: true,
  });
}

function winGame() {
  mode = 'win';
  setOverlay({
    title: 'Feliz Cumpleaños Quokka. I love you',
    subtitle: '',
    buttonLabel: 'Play again',
    visible: true,
    win: true,
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function tryDeflect() {
  if (mode !== 'running') return;
  const range = 70;
  const candidates = obstacles.filter((obstacle) => (
    obstacle.type === 'crow' &&
    !obstacle.cleared &&
    obstacle.x < quokka.x + range &&
    obstacle.x + obstacle.w > quokka.x - 5
  ));

  if (candidates.length === 0) return;

  candidates.sort((a, b) => Math.abs(a.x - quokka.x) - Math.abs(b.x - quokka.x));
  const target = candidates[0];
  target.cleared = true;
  target.remove = true;
  cleared += 1;
  updateScore();

  effects.push({
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
    ttl: 18,
  });

  if (cleared >= TOTAL_OBSTACLES) {
    winGame();
  }
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
        winGame();
        break;
      }
    }
  }

  obstacles = obstacles.filter((obstacle) => !obstacle.remove && obstacle.x + obstacle.w > -50);

  clouds.forEach((cloud) => {
    cloud.x -= (BASE_SPEED * 0.35 + cloud.speed) * dt;
    if (cloud.x + cloud.w < -40) {
      cloud.x = canvas.width + Math.random() * 120;
      cloud.y = 20 + Math.random() * 80;
    }
  });

  effects.forEach((effect) => {
    effect.ttl -= dt * 1.3;
  });
  effects = effects.filter((effect) => effect.ttl > 0);
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

  ctx.fillStyle = '#f6f0e2';
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 22, 18, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8dbc0';
  ctx.beginPath();
  ctx.ellipse(x + 12, y + 10, 6, 8, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + 28, y + 8, 6, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d0c1b';
  ctx.beginPath();
  ctx.arc(x + 14, y + 20, 2.2, 0, Math.PI * 2);
  ctx.arc(x + 26, y + 20, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + 20, y + 27, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2d0c1b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 28);
  ctx.lineTo(x + 20, y + 32);
  ctx.stroke();
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

    if (obstacle.type === 'cheese') {
      ctx.font = '24px serif';
      ctx.fillText('🧀', obstacle.x - 2, obstacle.y + obstacle.h);
    } else {
      ctx.font = '24px serif';
      ctx.fillText('🐦', obstacle.x - 2, obstacle.y + obstacle.h);
    }
  });
}

function drawEffects() {
  effects.forEach((effect) => {
    const alpha = Math.max(0, Math.min(1, effect.ttl / 18));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 8 * alpha, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 214, 0, ${alpha})`;
    ctx.fillText('✦', effect.x - 4, effect.y + 4);
  });
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawClouds();
  drawGround();
  drawObstacles();
  drawQuokka();
  drawEffects();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(2, (timestamp - lastTime) / 16.67);
  lastTime = timestamp;

  if (mode === 'running') {
    update(dt);
  }

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
  if (event.code === 'KeyD') {
    event.preventDefault();
    tryDeflect();
  }

  if ((mode === 'gameover' || mode === 'win') && event.code === 'Space') {
    startGame();
  }
});

overlayButton.addEventListener('click', () => {
  startGame();
});

setOverlay({
  title: 'Press Space to start',
  subtitle: 'Space/↑ to jump • D to deflect crows',
  buttonLabel: '',
  visible: true,
});
