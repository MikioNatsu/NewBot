import { InlineKeyboard } from "grammy";
import { User } from "../models/User.js";
import { MyContext } from "../types.js";
import { Order } from "../models/Order.js";

export const profile = async (ctx: MyContext) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });

  if (!user) {
    return ctx.editMessageText(
      "⚠️ Siz hali ro‘yxatdan o‘tmagansiz.\nIltimos, /start buyrug‘ini bosing."
    );
  }

  const regisDate = user.createdAt.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const profileKeyboard = new InlineKeyboard()
    .text("⬅️ Orqaga", "back")
    .text("🗂 Tarix", "history");

  return ctx.editMessageMedia(
    {
      type: "photo",
      media:
        "AgACAgIAAxkBAAMHaN6xFPCmDNi7tY6ekdGiLW2kXecAAvv6MRvfA_lKi4nnLPKepKMBAAMCAAN5AAM2BA",
      caption: `
📋 <b>Profil ma’lumotlari</b>
━━━━━━━━━━━━━━━
👤 <b>Ism:</b> ${user.firstName}
🔗 <b>Username:</b> @${user.username || "—"}
📅 <b>Ro‘yxatdan o‘tgan sana:</b> ${regisDate}
━━━━━━━━━━━━━━━
`,
      parse_mode: "HTML",
    },
    {
      reply_markup: profileKeyboard,
    }
  );
};
