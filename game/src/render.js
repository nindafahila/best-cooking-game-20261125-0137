// Warung Kilat — tampilan: semua yang terlihat di layar digambar dari state.
// Satu file, satu pekerjaan: DOM masuk lewat sini, logika main tidak menyentuh DOM.

import { INGREDIENTS, INGREDIENT_BY_ID, RECIPES, RECIPE_BY_ID, MAX_HEARTS } from './config.js';
import { matchRecipe } from './game.js';

const $ = (id) => document.getElementById(id);

let lastOrdersSignature = '';

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function patienceClass(fraction) {
  if (fraction > 0.5) return 'ok';
  if (fraction > 0.25) return 'warn';
  return 'crit';
}

// Resep yang paling dekat dengan isi piring, untuk petunjuk "masih butuh apa".
export function closestRecipeHint(plateIds) {
  if (plateIds.length === 0) return 'Klik bahan di bawah untuk meracik hidangan.';
  const matched = matchRecipe(plateIds);
  if (matched) {
    return matched.cookSeconds > 0
      ? `${matched.emoji} ${matched.name} — cocok! Tekan MASAK.`
      : `${matched.emoji} ${matched.name} — cocok! Langsung siap saji.`;
  }
  let best = null;
  let bestMissing = Infinity;
  for (const recipe of RECIPES) {
    const missing = recipe.ingredients.filter((id) => !plateIds.includes(id));
    const extra = plateIds.filter((id) => !recipe.ingredients.includes(id));
    const score = missing.length * 2 + extra.length;
    if (score < bestMissing) {
      bestMissing = score;
      best = { recipe, missing };
    }
  }
  if (!best || best.missing.length === 0) return 'Kombinasi ini bukan resep apa pun — buang dan coba lagi.';
  const names = best.missing.map((id) => INGREDIENT_BY_ID[id].name).join(', ');
  return `${best.recipe.emoji} ${best.recipe.name} masih butuh: ${names}.`;
}

function renderHearts(hearts) {
  let out = '';
  for (let i = 0; i < MAX_HEARTS; i += 1) {
    out += `<span class="heart ${i < hearts ? 'full' : 'lost'}">${i < hearts ? '❤️' : '🖤'}</span>`;
  }
  return out;
}

function renderOrders(state) {
  const board = $('order-board');
  const signature = state.orders.map((o) => `${o.id}:${Math.round(o.patience)}`).join('|');
  if (signature === lastOrdersSignature && board.children.length === state.orders.length) {
    updatePatienceBars(state);
    return;
  }
  lastOrdersSignature = signature;
  board.innerHTML = '';
  if (state.orders.length === 0) {
    board.innerHTML = '<div class="no-orders">Belum ada pesanan — pelanggan segera datang…</div>';
    return;
  }
  for (const order of state.orders) {
    const recipe = RECIPE_BY_ID[order.recipeId];
    const fraction = Math.max(0, order.patience / order.patienceMax);
    const card = document.createElement('div');
    card.className = `order-card ${patienceClass(fraction)}`;
    card.dataset.orderId = order.id;
    card.innerHTML = `
      <div class="order-dish">${recipe.emoji}</div>
      <div class="order-info">
        <div class="order-name">${recipe.name}</div>
        <div class="order-needs">${recipe.ingredients.map((id) => INGREDIENT_BY_ID[id].emoji).join(' ')}</div>
        <div class="patience"><div class="patience-fill" style="width:${Math.round(fraction * 100)}%"></div></div>
      </div>
      <div class="order-price">${recipe.price}🪙</div>`;
    board.appendChild(card);
  }
}

function updatePatienceBars(state) {
  for (const order of state.orders) {
    const card = document.querySelector(`.order-card[data-order-id="${order.id}"]`);
    if (!card) continue;
    const fraction = Math.max(0, order.patience / order.patienceMax);
    const fill = card.querySelector('.patience-fill');
    if (fill) fill.style.width = `${Math.round(fraction * 100)}%`;
    card.classList.remove('ok', 'warn', 'crit');
    card.classList.add(patienceClass(fraction));
  }
}

function renderPlate(state) {
  const plate = $('plate-items');
  plate.innerHTML = state.plate.length === 0
    ? '<div class="plate-empty">Piring kosong</div>'
    : state.plate.map((id) => {
      const ing = INGREDIENT_BY_ID[id];
      return `<span class="plate-chip" style="background:${ing.color}" title="${ing.name}">${ing.emoji}</span>`;
    }).join('');
  $('plate-hint').textContent = closestRecipeHint(state.plate);
  const matched = matchRecipe(state.plate);
  const cookButton = $('btn-cook');
  cookButton.disabled = !matched;
  cookButton.textContent = matched
    ? (matched.cookSeconds > 0 ? `🔥 MASAK ${matched.name.toUpperCase()}` : `✅ SAJIKAN ${matched.name.toUpperCase()}`)
    : '🔥 MASAK';
  $('btn-clear-plate').disabled = state.plate.length === 0;
}

function renderStove(state) {
  const wrap = $('stove-slots');
  wrap.innerHTML = '';
  state.stove.forEach((slot, index) => {
    const div = document.createElement('div');
    if (!slot) {
      div.className = 'burner empty';
      div.innerHTML = `<div class="burner-ring">🍳</div><div class="burner-label">Kompor ${index + 1} — kosong</div>`;
    } else {
      const recipe = RECIPE_BY_ID[slot.recipeId];
      const ratio = slot.elapsed / slot.cookSeconds;
      const percent = Math.min(100, Math.round(ratio * 100));
      const done = ratio >= 1;
      const danger = ratio > 1.15;
      div.className = `burner cooking ${done ? 'done' : ''} ${danger ? 'danger' : ''}`;
      div.innerHTML = `
        <div class="burner-ring">${done ? '✅' : '🔥'}</div>
        <div class="burner-dish">${recipe.emoji} ${recipe.name}</div>
        <div class="cook-bar"><div class="cook-fill" style="width:${percent}%"></div></div>
        <div class="burner-label">${done ? 'MATANG! Klik untuk angkat' : danger ? 'KEPANASAN!' : `Memasak… ${percent}%`}</div>
        <button class="btn-take" data-slot="${index}" ${done ? '' : 'disabled'}>🍽️ ANGKAT</button>`;
    }
    wrap.appendChild(div);
  });
}

function renderReady(state) {
  const box = $('ready-dish');
  if (!state.ready) {
    box.innerHTML = '<div class="ready-empty">Belum ada piring siap saji</div>';
    $('ready-hint').textContent = 'Selesaikan satu hidangan, lalu klik pesanan yang cocok.';
    return;
  }
  const recipe = RECIPE_BY_ID[state.ready.recipeId];
  box.innerHTML = `
    <div class="ready-plate ${state.ready.perfect ? 'perfect' : ''}">
      <div class="ready-emoji">${recipe.emoji}</div>
      <div class="ready-name">${recipe.name}</div>
      ${state.ready.perfect ? '<div class="ready-star">⭐ SEMPURNA!</div>' : ''}
    </div>`;
  $('ready-hint').textContent = 'Piring siap! Klik pesanan yang memesan hidangan ini.';
}

function renderHud(state) {
  $('hud-time').textContent = formatTime(state.timeLeft);
  $('hud-time').classList.toggle('low', state.timeLeft <= 30);
  $('hud-score').textContent = state.score.toLocaleString('id-ID');
  $('hud-coins').textContent = `🪙 ${state.coins.toLocaleString('id-ID')}`;
  $('hud-hearts').innerHTML = renderHearts(state.hearts);
  $('hud-level').textContent = `Level ${state.level}`;
  $('hud-combo').textContent = state.combo > 1 ? `🔥 Kombo x${state.combo}` : '';
}

export function renderIngredients() {
  const counter = $('ingredient-counter');
  counter.innerHTML = '';
  for (const ing of INGREDIENTS) {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.dataset.ingredientId = ing.id;
    button.style.setProperty('--ing-color', ing.color);
    button.innerHTML = `<span class="ing-emoji">${ing.emoji}</span><span class="ing-name">${ing.name}</span><kbd>${ing.key}</kbd>`;
    counter.appendChild(button);
  }
}

let toastTimer = 0;
export function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

export function showPopup(text, kind = 'score') {
  const layer = $('fx-layer');
  const popup = document.createElement('div');
  popup.className = `fx-pop ${kind}`;
  popup.textContent = text;
  popup.style.left = `${38 + Math.random() * 24}%`;
  popup.style.top = '34%';
  layer.appendChild(popup);
  popup.addEventListener('animationend', () => popup.remove());
}

// Pop-up yang menetap (untuk adegan demo tangkapan layar).
export function showStickyPopup(text) {
  const layer = $('fx-layer');
  const popup = document.createElement('div');
  popup.className = 'fx-pop sticky';
  popup.textContent = text;
  popup.style.left = '44%';
  popup.style.top = '37%';
  layer.appendChild(popup);
}

export function render(state) {
  renderHud(state);
  renderOrders(state);
  renderPlate(state);
  renderStove(state);
  renderReady(state);
  $('screen-title').classList.toggle('hidden', state.screen !== 'title');
  $('screen-over').classList.toggle('hidden', state.screen !== 'over');
  if (state.screen === 'over') {
    $('final-score').textContent = state.score.toLocaleString('id-ID');
    $('final-served').textContent = state.servedCount;
    $('final-best-combo').textContent = `x${state.bestCombo}`;
    $('final-reason').textContent = state.endReason === 'hearts'
      ? 'Semua hati habis — pelanggan kecewa dan pergi.'
      : 'Shift selesai! Waktunya istirahat.';
  }
}
