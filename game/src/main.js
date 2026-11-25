// Warung Kilat — titik masuk: merangkai state, tampilan, masukan, dan bunyi,
// menjalankan loop permainan, dan menyiapkan adegan demo (?shot=...) untuk
// tangkapan layar: setiap adegan adalah state asli game yang dibekukan.

import { RECIPE_BY_ID } from './config.js';
import {
  createGameState,
  startShift,
  tickGame,
  drainEvents,
  addIngredientToPlate,
  clearPlate,
  cookPlate,
  takeFromStove,
  serveOrder,
} from './game.js';
import { render, renderIngredients, showToast, showPopup, showStickyPopup } from './render.js';
import { bindInput } from './input.js';
import {
  playClick,
  playPop,
  playDing,
  playCoin,
  playFail,
  playLevelUp,
  startSizzle,
  stopSizzle,
  setMuted,
  isMuted,
} from './sound.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') ?? 7) || 7;
const shotName = params.get('shot');
const state = createGameState(seed);

// Adegan demo: susunan pesanan, piring, dan kompor yang sudah jadi, supaya
// tangkapan layar menampilkan dapur yang ramai tanpa harus memainkannya dulu.
function buildDemoState(name) {
  const demo = createGameState(seed);
  demo.screen = 'playing';
  demo.frozen = true;
  const order = (recipeId, patienceFraction) => {
    const recipe = RECIPE_BY_ID[recipeId];
    const patienceMax = 48;
    return {
      id: `demo-${recipeId}`,
      recipeId,
      patience: Math.round(patienceMax * patienceFraction),
      patienceMax,
    };
  };
  if (name === 'cover') {
    demo.timeLeft = 107;
    demo.score = 1250;
    demo.coins = 1250;
    demo.combo = 3;
    demo.bestCombo = 3;
    demo.level = 2;
    demo.servedCount = 11;
    demo.orders = [order('nasgor', 0.62), order('geprek', 0.78), order('sate', 0.45)];
    demo.plate = ['nasi', 'telur'];
    demo.stove = [
      { recipeId: 'mieayam', elapsed: 4.3, cookSeconds: 7, doneNotified: false },
      null,
    ];
    demo.ready = { recipeId: 'geprek', perfect: true };
  } else if (name === 'cook') {
    demo.timeLeft = 133;
    demo.score = 640;
    demo.coins = 640;
    demo.combo = 2;
    demo.bestCombo = 2;
    demo.level = 2;
    demo.servedCount = 6;
    demo.orders = [order('sate', 0.55), order('mieayam', 0.82)];
    demo.plate = ['mie', 'ayam'];
    demo.stove = [
      { recipeId: 'sate', elapsed: 6.6, cookSeconds: 8, doneNotified: false },
      { recipeId: 'mieayam', elapsed: 3.1, cookSeconds: 7, doneNotified: false },
    ];
    demo.ready = null;
  } else if (name === 'serve') {
    demo.timeLeft = 58;
    demo.score = 2450;
    demo.coins = 2450;
    demo.combo = 4;
    demo.bestCombo = 5;
    demo.level = 3;
    demo.servedCount = 21;
    demo.orders = [order('nasgor', 0.85), order('gado', 0.5)];
    demo.plate = [];
    demo.stove = [null, null];
    demo.ready = { recipeId: 'nasgor', perfect: true };
    window.setTimeout(() => showStickyPopup('+320 🪙'), 300);
  } else if (name === 'rush') {
    demo.timeLeft = 32;
    demo.score = 3120;
    demo.coins = 3120;
    demo.combo = 5;
    demo.bestCombo = 6;
    demo.level = 4;
    demo.servedCount = 27;
    demo.hearts = 1;
    demo.orders = [
      order('nasgor', 0.12),
      order('sate', 0.38),
      order('mieayam', 0.66),
      order('geprek', 0.9),
    ];
    demo.plate = ['ayam', 'sambal'];
    demo.stove = [
      { recipeId: 'sate', elapsed: 9.4, cookSeconds: 8, doneNotified: true },
      { recipeId: 'nasgor', elapsed: 3.0, cookSeconds: 6, doneNotified: false },
    ];
    demo.ready = null;
  }
  return demo;
}

if (shotName) Object.assign(state, buildDemoState(shotName));

function handleEvents() {
  for (const event of drainEvents(state)) {
    if (event.type === 'ingredient-added') playClick();
    if (event.type === 'recipe-matched') playPop();
    if (event.type === 'cooking-started') playClick();
    if (event.type === 'dish-cooked') {
      playDing();
      showToast('Matang! Angkat sebelum gosong.');
    }
    if (event.type === 'dish-burnt') {
      playFail();
      showToast('Gosong! Hidangan terbuang.');
    }
    if (event.type === 'served') {
      playCoin();
      showPopup(`+${event.gained} 🪙`, 'score');
    }
    if (event.type === 'order-expired') {
      playFail();
      showToast('Pesanan hangus — pelanggan pergi kecewa!');
    }
    if (event.type === 'level-up') {
      playLevelUp();
      showToast(`Level ${event.level}! Pesanan datang lebih cepat.`);
    }
    if (event.type === 'shift-end') stopSizzle();
  }
  const cooking = state.stove.some((slot) => slot !== null);
  if (cooking && state.screen === 'playing') startSizzle();
  else stopSizzle();
}

const callbacks = {
  onIngredient(ingredientId) {
    const result = addIngredientToPlate(state, ingredientId);
    if (!result.ok && result.reason === 'plate-full') {
      showToast('Piring penuh — masak atau buang dulu.');
      playFail();
    }
  },
  onCook() {
    const result = cookPlate(state);
    if (!result.ok) {
      if (result.reason === 'no-recipe') showToast('Belum ada resep yang cocok di piring.');
      if (result.reason === 'stove-full') showToast('Semua kompor penuh!');
      if (result.reason === 'ready-occupied') showToast('Sajikan dulu piring yang sudah siap.');
      playFail();
    }
  },
  onClearPlate() {
    if (clearPlate(state)) playClick();
  },
  onTake(slot) {
    const result = takeFromStove(state, slot);
    if (!result.ok) {
      if (result.reason === 'too-early') showToast('Belum matang — tunggu sebentar lagi!');
      if (result.reason === 'ready-occupied') showToast('Sajikan dulu piring yang sudah siap.');
      playFail();
    } else if (result.perfect) {
      showToast('Matang sempurna! Bonus +25.');
    }
  },
  onServe(orderId) {
    if (!state.ready) {
      showToast('Belum ada hidangan siap saji.');
      return;
    }
    const result = serveOrder(state, orderId);
    if (!result.ok && result.reason === 'wrong-dish') {
      showToast('Hidangan ini bukan pesanan pelanggan itu!');
      playFail();
    }
  },
  onStart() {
    if (state.screen === 'title') {
      startShift(state);
      playPop();
    }
  },
  onRestart() {
    if (state.screen === 'over') {
      startShift(state);
      playPop();
    }
  },
  onStartOrRestart() {
    if (state.screen === 'title') callbacks.onStart();
    else if (state.screen === 'over') callbacks.onRestart();
  },
  onToggleMute() {
    setMuted(!isMuted());
    document.getElementById('btn-mute').textContent = isMuted() ? '🔇 Suara Mati' : '🔊 Suara Nyala';
  },
};

renderIngredients();
bindInput(callbacks);

let lastNow = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  tickGame(state, dt);
  handleEvents();
  render(state);
  window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);

// Untuk keperluan debug dan play-test otomatis.
window.__warung = { state };
