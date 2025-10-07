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
  { stars: 250, price: 52000 },
  { stars: 500, price: 99999 },
  { stars: 1000, price: 196000 },
  { stars: 2500, price: 489999 },
  { stars: 5000, price: 969999 },
  { stars: 10000, price: 1923999 },
  { stars: 100000, price: 19199999 },
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
