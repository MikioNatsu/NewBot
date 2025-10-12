import { InlineKeyboard } from "grammy";

export const adminKeyboard = new InlineKeyboard()
  .text("📢 Broadcast", "broadcast_menu")
  .row()
  .text("↗️ Post yaratish", "post_menu")
  .row()
  .text("📋 Buyurtmalar ro'yxati", "admin_orders")
  .text("💰 Balansni tekshirish", "admin_balance")
  .row()
  .text("🔄 Retrying buyurtmalar", "admin_retries")
  .text("📊 Statistikalar", "admin_stats")
  .row()
  .text("📢 Majburiy kanallarni boshqarish", "manage_subscriptions")
  .row()
  .text("🏠 Chiqish", "back");

export const adminBackKeyboard = new InlineKeyboard().text(
  "⬅️ Orqaga",
  "admin_menu"
);

export const postMenuKeyboard = new InlineKeyboard()
  .text("🤖 AI POST", "ai_post")
  .text("💸 DONAT POST", "donat_post")
  .row()
  .text("⬅️ Orqaga", "admin_menu");
