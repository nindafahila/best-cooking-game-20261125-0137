// Warung Kilat — data dapur: bahan, resep, dan setelan permainan.
// Semua nama, hidangan, dan harga adalah ciptaan sendiri untuk game ini.

export const SHIFT_SECONDS = 180; // satu shift: 3 menit
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const STOVE_SLOTS = 2;

// Bahan yang tersedia di meja dapur. key = tombol keyboard 1..0.
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', emoji: '🍚', color: '#fff7e0', key: '1' },
  { id: 'mie', name: 'Mie', emoji: '🍜', color: '#ffe9b8', key: '2' },
  { id: 'ayam', name: 'Ayam', emoji: '🍗', color: '#ffd9a0', key: '3' },
  { id: 'telur', name: 'Telur', emoji: '🥚', color: '#fff3c4', key: '4' },
  { id: 'sayur', name: 'Sayur', emoji: '🥬', color: '#d9f2c2', key: '5' },
  { id: 'sambal', name: 'Sambal', emoji: '🌶️', color: '#ffc9b8', key: '6' },
  { id: 'kecap', name: 'Kecap', emoji: '🍶', color: '#e8d5b5', key: '7' },
  { id: 'bawang', name: 'Bawang', emoji: '🧅', color: '#f3e2f5', key: '8' },
  { id: 'teh', name: 'Teh', emoji: '🍵', color: '#e0d3b8', key: '9' },
  { id: 'es', name: 'Es Batu', emoji: '🧊', color: '#d6ecff', key: '0' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, ing]),
);

// Resep warung. cookSeconds = 0 berarti hidangan dingin, langsung siap saji.
export const RECIPES = [
  {
    id: 'nasgor',
    name: 'Nasi Goreng',
    emoji: '🍛',
    ingredients: ['nasi', 'telur', 'kecap', 'bawang'],
    cookSeconds: 6,
    price: 120,
    color: '#ffb347',
  },
  {
    id: 'mieayam',
    name: 'Mie Ayam',
    emoji: '🍜',
    ingredients: ['mie', 'ayam', 'sayur'],
    cookSeconds: 7,
    price: 110,
    color: '#f7c948',
  },
  {
    id: 'sate',
    name: 'Sate Ayam',
    emoji: '🍡',
    ingredients: ['ayam', 'bawang', 'sambal'],
    cookSeconds: 8,
    price: 140,
    color: '#ff8a5c',
  },
  {
    id: 'gado',
    name: 'Gado-Gado',
    emoji: '🥗',
    ingredients: ['sayur', 'telur', 'sambal'],
    cookSeconds: 0,
    price: 90,
    color: '#8fce6e',
  },
  {
    id: 'geprek',
    name: 'Ayam Geprek',
    emoji: '🍗',
    ingredients: ['ayam', 'sambal'],
    cookSeconds: 5,
    price: 100,
    color: '#ff6b4a',
  },
  {
    id: 'esteh',
    name: 'Es Teh Manis',
    emoji: '🧋',
    ingredients: ['teh', 'es'],
    cookSeconds: 0,
    price: 60,
    color: '#d9a05b',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(
  RECIPES.map((recipe) => [recipe.id, recipe]),
);

// Pesanan baru makin cepat dan pelanggan makin tidak sabar saat level naik.
export function levelTuning(level) {
  return {
    orderEverySeconds: Math.max(7, 15 - level * 1.2),
    patienceSeconds: Math.max(28, 52 - level * 3),
    maxOrders: Math.min(MAX_ORDERS, 2 + Math.floor(level / 2)),
  };
}

// Tip maksimal (koin) bila pesanan disajikan saat pelanggan masih sabar penuh.
export const MAX_TIP = 60;
