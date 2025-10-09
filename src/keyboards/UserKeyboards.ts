import { InlineKeyboard } from "grammy";

export const mainKeyboard = new InlineKeyboard()
  .text("⭐️ Stars xarid qilish", "buy_stars_menu")
  .text("💎 Premium xarid qilish", "buy_premium_menu")
  .row()
  .text("📊 Referral statistikasi", "referral_stats")
  .row()
  .text("💸 Donat", "donate")
  .text("📈 Profil", "profile");

export const premiumKeyboard = new InlineKeyboard()
  .text("🎁 Gift sifatida sotib olish", "buy_premium_gift")
  .text("👤 Profilga kirib olib berish", "buy_premium_profile")
  .row()
  .text("⬅️ Orqaga", "back");
