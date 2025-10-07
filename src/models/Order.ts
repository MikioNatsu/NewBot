import { Schema, model, Document, Types } from "mongoose";

export interface IOrder extends Document {
  _id: Types.ObjectId;
  userId: string;
  productId: number;
  price: number;
  apiOrderId?: number | null;
  lastCheck?: Date | null;
  status: "pending" | "confirmed" | "denied" | "completed" | "retrying";
  channelMessageId?: number;
  link?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: String, required: true },
    productId: { type: Number, required: true },
    price: { type: Number, required: true },
    apiOrderId: { type: Number, default: null },
    lastCheck: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "confirmed", "denied", "completed", "retrying"],
      default: "pending",
    },
    channelMessageId: { type: Number },
    link: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Order = model<IOrder>("Order", orderSchema);
