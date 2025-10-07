import { InlineKeyboard } from "grammy";

export const adminKeyboard = new InlineKeyboard()
  .text("↗️ Post yaratish", "post_menu")
  .row()
  .text("📋 Buyurtmalar ro'yxati", "admin_orders")
  .text("💰 Balansni tekshirish", "admin_balance")
  .row()
  .text("🔄 Retrying buyurtmalar", "admin_retries")
  .text("📊 Statistikalar", "admin_stats")
  .row()
  .text("🏠 Chiqish", "back");
// Admin orders list

export const postMenuKeyboard = new InlineKeyboard()
  .text("AI POST", "newpost")
  .text("DONAT POST", "donat_post")
  .row()
  .text("⬅️ Orqaga", "admin_menu");

export const adminBackKeyboard = new InlineKeyboard().text(
  "⬅️ Orqaga",
  "admin_menu"
);
