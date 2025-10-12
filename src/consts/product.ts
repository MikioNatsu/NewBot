// src/consts/product.ts

export interface StarProduct {
  stars: number;
  price: number;
}

export interface PremiumItem {
  id: number;
  price: number;
  month: number;
}

// --- Narxni hafta kuniga qarab moslashtirish funksiyasi ---
function adjustPrice(price: number): number {
  const today = new Date().getDay(); // 0 = Yakshanba, 6 = Shanba
  const weekendMultiplier = 1.15;

  if (today === 0 || today === 6) {
    return Math.round(price * weekendMultiplier);
  }
  return price;
}

export const stars: StarProduct[] = [
  { stars: 50, price: adjustPrice(11000) },
  { stars: 100, price: adjustPrice(21000) },
  { stars: 250, price: adjustPrice(52000) },
  { stars: 500, price: adjustPrice(99999) },
  { stars: 1000, price: adjustPrice(196990) },
  { stars: 2500, price: adjustPrice(492200) },
  { stars: 5000, price: adjustPrice(984400) },
  { stars: 10000, price: adjustPrice(1969000) },
  { stars: 100000, price: adjustPrice(19688000) },
];

export const premium: {
  gift: PremiumItem[];
  profile: PremiumItem[];
} = {
  gift: [
    { id: 0, price: 159000, month: 3 },
    { id: 1, price: 214000, month: 6 },
    { id: 2, price: 390000, month: 12 },
  ],
  profile: [
    { id: 3, price: 42000, month: 1 },
    { id: 4, price: 299999, month: 12 },
  ],
};
