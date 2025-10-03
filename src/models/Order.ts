// src/models/Order.ts
import { Schema, model, Document, Types } from "mongoose";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  userId: string;
  productId: number;
  price: number;
  status: "pending" | "confirmed" | "denied";
  createdAt: Date;
  channelMessageId?: number;
  apiOrderId?: number;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true },
    productId: { type: Number, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "denied"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    channelMessageId: { type: Number },
    apiOrderId: { type: Number },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", orderSchema);
