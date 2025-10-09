import { Context, SessionFlavor } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";

export interface SessionData {
  state:
    | "awaiting_check"
    | "awaiting_donate_user"
    | "awaiting_donate_comment"
    | "awaiting_donate_amount"
    | "awaiting_channel_id"
    | "awaiting_channel_name"
    | "awaiting_channel_input"
    | null;
  currentOrderId: string | null;
  pendingProduct: {
    stars: number;
    price: number;
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

export type MyContext = Context &
  SessionFlavor<SessionData> &
  HydrateFlavor<Context> & {
    startPayload?: string;
  };
