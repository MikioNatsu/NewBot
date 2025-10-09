// src/models/SubscriptionChannel.ts (o'zgarmagan, saqlang)
import { Schema, model, Document } from "mongoose";

export interface ISubscriptionChannel extends Document {
  channelId: string; // Kanal ID si, masalan '-1002229098897'
  channelName: string; // Kanal nomi, masalan '@YulduzBozor'
  createdAt: Date;
}

const subscriptionChannelSchema = new Schema<ISubscriptionChannel>(
  {
    channelId: { type: String, required: true, unique: true },
    channelName: { type: String, required: true },
  },
  { timestamps: true }
);

export const SubscriptionChannel = model<ISubscriptionChannel>(
  "SubscriptionChannel",
  subscriptionChannelSchema
);
