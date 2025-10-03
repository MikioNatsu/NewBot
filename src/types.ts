import { Context, SessionFlavor } from "grammy";
import { HydrateFlavor } from "@grammyjs/hydrate";

export interface SessionData {
  state:
    | "awaiting_check"
    | "awaiting_donate_user"
    | "awaiting_donate_comment"
    | "awaiting_donate_amount"
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
}

export type MyContext = Context &
  SessionFlavor<SessionData> &
  HydrateFlavor<Context> & {
    startPayload?: string;
  };
