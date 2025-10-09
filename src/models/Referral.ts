import { Schema, model, Document, Types } from "mongoose";

export interface IReferral extends Document {
  userId: string;
  referrerId?: string;
  referrals: string[];
  orders: {
    userId: string;
    productId: number;
    price: number;
    createdAt: Date;
  }[];
  bonusPercentage: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    userId: { type: String, required: true, unique: true },
    referrerId: { type: String }, // Kim taklif qilgan bo'lsa
    referrals: [{ type: String }], // Taklif qilingan foydalanuvchilar
    orders: [
      {
        userId: { type: String, required: true },
        productId: { type: Number, required: true },
        price: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    bonusPercentage: { type: Number, default: 0 }, // Bonus foizi (0-95%)
    totalEarnings: { type: Number, default: 0 }, // Umumiy foyda (yashirin)
  },
  { timestamps: true }
);

export const Referral = model<IReferral>("Referral", referralSchema);
