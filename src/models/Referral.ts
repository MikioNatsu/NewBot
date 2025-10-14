// src/models/Referral.ts
import { Schema, model, Document } from "mongoose";

export interface IReferral extends Document {
  userId: string;
  referrerId?: string;
  referrals: { userId: string; referredAt: Date }[];
  orders: {
    userId: string;
    productId: number;
    price: number;
    createdAt: Date;
  }[];
  totalEarnings: number;
  totalStars: number;
  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    userId: { type: String, required: true, unique: true },
    referrerId: { type: String },
    referrals: [
      {
        userId: { type: String, required: true },
        referredAt: { type: Date, default: Date.now },
      },
    ],
    orders: [
      {
        userId: { type: String, required: true },
        productId: { type: Number, required: true },
        price: { type: Number, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    totalEarnings: { type: Number, default: 0 },
    totalStars: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Referral = model<IReferral>("Referral", referralSchema);
