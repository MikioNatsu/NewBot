export interface StarProduct {
  stars: number;
  price: number;
}

export interface PremiumItem {
  id: number;
  price: number;
  month: number;
}

export const stars: StarProduct[] = [
  { stars: 50, price: 11000 },
  { stars: 100, price: 21000 },
  { stars: 250, price: 50000 },
  { stars: 500, price: 96000 },
  { stars: 1000, price: 190000 },
  { stars: 2500, price: 479999 },
  { stars: 5000, price: 938999 },
  { stars: 10000, price: 1823999 },
  { stars: 100000, price: 18499999 },
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
