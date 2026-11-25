// Warung Kilat — inti permainan: state, pesanan, perakitan, masakan, sajian.
// Satu file, satu pekerjaan: semua aturan main tinggal di sini, tanpa DOM.

import {
  INGREDIENTS,
  RECIPES,
  RECIPE_BY_ID,
  SHIFT_SECONDS,
  MAX_HEARTS,
  STOVE_SLOTS,
  MAX_TIP,
  levelTuning,
} from './config.js';
import { mulberry32, pickRandom } from './random.js';

let orderCounter = 0;

export function createGameState(seed = 20261125) {
  return {
    screen: 'title',
    seed,
    rng: mulberry32(seed),
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    servedCount: 0,
    failedCount: 0,
    burntCount: 0,
    hearts: MAX_HEARTS,
    level: 1,
    timeLeft: SHIFT_SECONDS,
    orders: [],
    plate: [],
    stove: Array.from({ length: STOVE_SLOTS }, () => null),
    ready: null,
    orderTimer: 4,
    frozen: false,
    events: [],
  };
}

export function startShift(state) {
  const fresh = createGameState(state.seed);
  fresh.screen = 'playing';
  Object.assign(state, fresh);
  spawnOrder(state);
  spawnOrder(state);
  pushEvent(state, { type: 'shift-start' });
}

function pushEvent(state, event) {
  state.events.push(event);
}

export function drainEvents(state) {
  return state.events.splice(0, state.events.length);
}

export function levelOf(servedCount) {
  return Math.floor(servedCount / 5) + 1;
}

export function spawnOrder(state) {
  const tuning = levelTuning(state.level);
  if (state.orders.length >= tuning.maxOrders) return null;
  const onBoard = new Set(state.orders.map((order) => order.recipeId));
  const fresh = RECIPES.filter((recipe) => !onBoard.has(recipe.id));
  const recipe = pickRandom(state.rng, fresh.length > 0 ? fresh : RECIPES);
  const order = {
    id: `order-${orderCounter += 1}`,
    recipeId: recipe.id,
    patience: tuning.patienceSeconds,
    patienceMax: tuning.patienceSeconds,
  };
  state.orders.push(order);
  pushEvent(state, { type: 'order-arrived', orderId: order.id });
  return order;
}

// Satu langkah waktu permainan (dt dalam detik). Menggerakkan timer shift,
// kesabaran pelanggan, dan kompor; mengembalikan apa pun lewat events.
export function tickGame(state, dt) {
  if (state.screen !== 'playing' || state.frozen || dt <= 0) return;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    endShift(state, 'time');
    return;
  }

  state.orderTimer -= dt;
  if (state.orderTimer <= 0) {
    spawnOrder(state);
    state.orderTimer = levelTuning(state.level).orderEverySeconds;
  }

  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((item) => item.id !== order.id);
      state.hearts -= 1;
      state.failedCount += 1;
      state.combo = 0;
      pushEvent(state, { type: 'order-expired', orderId: order.id });
      if (state.hearts <= 0) {
        endShift(state, 'hearts');
        return;
      }
    }
  }

  state.stove.forEach((slot, index) => {
    if (!slot) return;
    slot.elapsed += dt;
    const ratio = slot.elapsed / slot.cookSeconds;
    if (ratio >= 1.3) {
      state.stove[index] = null;
      state.burntCount += 1;
      state.combo = 0;
      pushEvent(state, { type: 'dish-burnt', slot: index });
    } else if (ratio >= 1 && !slot.doneNotified) {
      slot.doneNotified = true;
      pushEvent(state, { type: 'dish-cooked', slot: index });
    }
  });
}

function endShift(state, reason) {
  state.screen = 'over';
  state.endReason = reason;
  pushEvent(state, { type: 'shift-end', reason });
}

// Bahan apa pun boleh masuk piring, maksimal sebanyak bahan resep terpanjang.
export function addIngredientToPlate(state, ingredientId) {
  if (state.screen !== 'playing') return { ok: false, reason: 'not-playing' };
  if (!INGREDIENTS.some((ing) => ing.id === ingredientId)) {
    return { ok: false, reason: 'unknown-ingredient' };
  }
  const longest = Math.max(...RECIPES.map((recipe) => recipe.ingredients.length));
  if (state.plate.length >= longest) return { ok: false, reason: 'plate-full' };
  state.plate.push(ingredientId);
  pushEvent(state, { type: 'ingredient-added', ingredientId });
  const recipe = matchRecipe(state.plate);
  if (recipe) pushEvent(state, { type: 'recipe-matched', recipeId: recipe.id });
  return { ok: true, matched: recipe };
}

export function clearPlate(state) {
  if (state.plate.length === 0) return false;
  state.plate = [];
  pushEvent(state, { type: 'plate-cleared' });
  return true;
}

// Piring cocok dengan resep bila isinya sama persis (urutan tidak penting).
export function matchRecipe(plateIds) {
  const sorted = [...plateIds].sort().join('|');
  return RECIPES.find((recipe) => [...recipe.ingredients].sort().join('|') === sorted) ?? null;
}

export function plateRecipe(state) {
  return matchRecipe(state.plate);
}

// Piring yang sudah cocok resepnya naik ke kompor (bila resep butuh dimasak)
// atau langsung jadi piring siap saji (hidangan dingin).
export function cookPlate(state) {
  const recipe = plateRecipe(state);
  if (!recipe) return { ok: false, reason: 'no-recipe' };
  if (recipe.cookSeconds === 0) {
    if (state.ready) return { ok: false, reason: 'ready-occupied' };
    state.ready = { recipeId: recipe.id, perfect: true };
    state.plate = [];
    pushEvent(state, { type: 'dish-ready', recipeId: recipe.id });
    return { ok: true, cooked: false };
  }
  const slot = state.stove.findIndex((item) => item === null);
  if (slot === -1) return { ok: false, reason: 'stove-full' };
  state.stove[slot] = {
    recipeId: recipe.id,
    elapsed: 0,
    cookSeconds: recipe.cookSeconds,
    doneNotified: false,
  };
  state.plate = [];
  pushEvent(state, { type: 'cooking-started', slot, recipeId: recipe.id });
  return { ok: true, cooked: true, slot };
}

// Angkat masakan dari kompor ke piring saji. Diambil di zona matang sempurna
// (80–100%) berarti bonus; terlambat sedikit masih bisa disajikan.
export function takeFromStove(state, slot) {
  const cooking = state.stove[slot];
  if (!cooking) return { ok: false, reason: 'slot-empty' };
  if (state.ready) return { ok: false, reason: 'ready-occupied' };
  const ratio = cooking.elapsed / cooking.cookSeconds;
  if (ratio < 0.55) return { ok: false, reason: 'too-early' };
  const perfect = ratio >= 0.8 && ratio <= 1.1;
  state.ready = { recipeId: cooking.recipeId, perfect };
  state.stove[slot] = null;
  pushEvent(state, { type: 'dish-ready', recipeId: cooking.recipeId, perfect });
  return { ok: true, perfect };
}

// Sajikan piring siap ke pesanan yang cocok. Skor = harga + tip kesabaran
// + bonus kombo; kombo naik tiap sajian beruntun tanpa kegagalan.
export function serveOrder(state, orderId) {
  if (!state.ready) return { ok: false, reason: 'nothing-ready' };
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return { ok: false, reason: 'no-order' };
  if (order.recipeId !== state.ready.recipeId) {
    return { ok: false, reason: 'wrong-dish' };
  }
  const recipe = RECIPE_BY_ID[order.recipeId];
  const patienceFraction = Math.max(0, order.patience / order.patienceMax);
  const tip = Math.round(patienceFraction * MAX_TIP);
  const comboBonus = state.combo * 10;
  const perfectBonus = state.ready.perfect ? 25 : 0;
  const gained = recipe.price + tip + comboBonus + perfectBonus;
  state.score += gained;
  state.coins += gained;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.servedCount += 1;
  state.ready = null;
  state.orders = state.orders.filter((item) => item.id !== orderId);
  const newLevel = levelOf(state.servedCount);
  if (newLevel > state.level) {
    state.level = newLevel;
    pushEvent(state, { type: 'level-up', level: newLevel });
  }
  pushEvent(state, { type: 'served', orderId, gained, recipeId: recipe.id });
  return { ok: true, gained };
}

export function orderById(state, orderId) {
  return state.orders.find((order) => order.id === orderId) ?? null;
}
