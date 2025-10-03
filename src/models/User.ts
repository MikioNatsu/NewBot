import { Document, Schema, model } from "mongoose";

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  username: string;
  language?: "uz" | "ru";
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    firstName: { type: String, required: true },
    username: { type: String },
    language: { type: String, enum: ["uz", "ru"], default: "uz" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export const User = model<IUser>("User", userSchema);
