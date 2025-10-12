import { InlineKeyboard } from "grammy";
import { User } from "../models/User.js";
import { MyContext } from "../types.js";
import { Referral } from "../models/Referral.js";

export const profile = async (ctx: MyContext) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });

  if (!user) {
    return ctx.editMessageText("⚠️ Ro‘yxatdan o‘tmagansiz. /start");
  }

  const regisDate = user.createdAt.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const referral = await Referral.findOne({ userId: ctx.from?.id.toString() });
  const totalStars = referral ? referral.totalStars : 0;
  const starsDisplay = `⭐ Stars: ${totalStars.toFixed(1)}\n`;

  const profileKeyboard = new InlineKeyboard()
    .text("💸 Yulduz chiqarish", "initiate_purchase")
    .row()
    .text("⬅️ Orqaga", "back")
    .text("🗂 Tarix", "history");

  return ctx.editMessageMedia(
    {
      type: "photo",
      media:
        "AgACAgIAAxkBAAIC0WjlJglL60bCPP-JSf5WbyL81cyVAALYAzIbz3YoS7qMuOh9XTJLAQADAgADeQADNgQ",
      caption: `
📋 <b>Profil</b>
───────────────
👤 Ism: ${user.firstName}
🔗 Username: @${user.username || "—"}
📅 Sana: ${regisDate}
${starsDisplay}───────────────
`,
      parse_mode: "HTML",
    },
    {
      reply_markup: profileKeyboard,
    }
  );
};
