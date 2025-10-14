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

// --- 100 stars = 1.65$ + 5% (1$ = 12500 so'm) ---
const PRICE_PER_STAR = 216.56;

// --- Narxni faqat yuqoriga yaxlitlash (.500 yoki .990) ---
function formatPrice(price: number): number {
  const rounded = Math.round(price);
  const mod = rounded % 1000;

  if (mod <= 500) {
    return rounded - mod + 500; // yuqoriga .500 gacha
  } else {
    return rounded - mod + 990; // yoki .990 gacha
  }
}

export const stars: StarProduct[] = [
  { stars: 50, price: formatPrice(50 * PRICE_PER_STAR) },
  { stars: 100, price: formatPrice(100 * PRICE_PER_STAR) },
  { stars: 250, price: formatPrice(250 * PRICE_PER_STAR) },
  { stars: 500, price: formatPrice(500 * PRICE_PER_STAR) },
  { stars: 1000, price: formatPrice(1000 * PRICE_PER_STAR) },
  { stars: 2500, price: formatPrice(2500 * PRICE_PER_STAR) },
  { stars: 5000, price: formatPrice(5000 * PRICE_PER_STAR) },
  { stars: 10000, price: formatPrice(10000 * PRICE_PER_STAR) },
  { stars: 100000, price: formatPrice(100000 * PRICE_PER_STAR) },
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
