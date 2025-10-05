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
  { stars: 50, price: 12500 },
  { stars: 100, price: 23000 },
  { stars: 250, price: 54000 },
  { stars: 500, price: 102000 },
  { stars: 1000, price: 199999 },
  { stars: 2500, price: 499999 },
  { stars: 5000, price: 978999 },
  { stars: 10000, price: 1923999 },
  { stars: 100000, price: 19099999 },
];

export const premium: {
  gift: PremiumItem[];
  profile: PremiumItem[];
} = {
  gift: [
    { id: 0, price: 162000, month: 3 },
    { id: 1, price: 217000, month: 6 },
    { id: 2, price: 399000, month: 12 },
  ],
  profile: [
    { id: 3, price: 42000, month: 1 },
    { id: 4, price: 299999, month: 12 },
  ],
};
