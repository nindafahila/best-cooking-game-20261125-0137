// Warung Kilat — masukan: klik mouse dan tombol keyboard.
// Satu file, satu pekerjaan: mengubah klik/ketukan menjadi panggilan logika.

import { INGREDIENTS } from './config.js';

export function bindInput(callbacks) {
  document.getElementById('ingredient-counter').addEventListener('click', (event) => {
    const button = event.target.closest('[data-ingredient-id]');
    if (!button) return;
    callbacks.onIngredient(button.dataset.ingredientId);
  });

  document.getElementById('btn-cook').addEventListener('click', () => callbacks.onCook());
  document.getElementById('btn-clear-plate').addEventListener('click', () => callbacks.onClearPlate());

  document.getElementById('stove-slots').addEventListener('click', (event) => {
    const button = event.target.closest('[data-slot]');
    if (!button) return;
    callbacks.onTake(Number(button.dataset.slot));
  });

  document.getElementById('order-board').addEventListener('click', (event) => {
    const card = event.target.closest('[data-order-id]');
    if (!card) return;
    callbacks.onServe(card.dataset.orderId);
  });

  document.getElementById('btn-start').addEventListener('click', () => callbacks.onStart());
  document.getElementById('btn-restart').addEventListener('click', () => callbacks.onRestart());
  document.getElementById('btn-mute').addEventListener('click', () => callbacks.onToggleMute());

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    const ingredient = INGREDIENTS.find((ing) => ing.key === key);
    if (ingredient) {
      callbacks.onIngredient(ingredient.id);
      return;
    }
    if (key === 'c') callbacks.onCook();
    if (key === 'x') callbacks.onClearPlate();
    if (key === 'm') callbacks.onToggleMute();
    if (key === 'enter') callbacks.onStartOrRestart();
  });
}
