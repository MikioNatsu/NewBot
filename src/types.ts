import { Context, SessionFlavor } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";
import { Message, Chat } from "grammy/types";

export interface SessionData {
  state:
    | "awaiting_check"
    | "awaiting_donate_user"
    | "awaiting_donate_comment"
    | "awaiting_donate_amount"
    | "awaiting_channel_id"
    | "awaiting_channel_name"
    | "awaiting_channel_input"
    | "awaiting_purchase_amount"
    | "awaiting_purchase_confirmation"
    | null;
  currentOrderId: string | null;
  pendingProduct: {
    stars: number;
    price: number;
  } | null;
  pendingPurchase: {
    stars: number;
  } | null;
  pendingDonate?: {
    user?: string;
    comment?: string;
    amount?: string;
  } | null;
  waitingForPost?: boolean;
  waitingForAIPrompt?: boolean;
  channelId?: string;
}

interface ExtendedMessage extends Message {
  forward_from_chat?: Chat & {
    type: string;
    id: number;
    username?: string;
    title?: string;
  };
}

export type MyContext = Context &
  SessionFlavor<SessionData> &
  HydrateFlavor<Context> & {
    startPayload?: string;
    message?: ExtendedMessage;
  };
