import { Schema, model, Document, Types } from "mongoose";

export interface IDonate extends Document {
  user: number;
  comment: string;
  amount: number;
  sayedThanks: string[]; // rahmat aytgan userlar
  createdAt: Date;
}

const DonateSchema = new Schema<IDonate>({
  user: { type: Number, required: true },
  comment: { type: String, default: "-" },
  amount: { type: Number, required: true },
  sayedThanks: [{ type: String, default: [] }],
  createdAt: { type: Date, default: Date.now },
});

export const Donate = model<IDonate>("Donate", DonateSchema);
