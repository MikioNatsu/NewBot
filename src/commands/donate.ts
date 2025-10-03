import { InlineKeyboard } from "grammy";
import { MyContext } from "../types";

const donateContent = {
  type: "photo" as const,
  media:
    "AgACAgIAAxkBAAMJaN6xNC03nKEhyenhwr24GfQ11z8AAv36MRvfA_lKcngzNwlbM2UBAAMCAAN5AAM2BA",
  caption: `
<b>💎 Donat qilish</b>

👉 Bizni qo‘llab-quvvatlash orqali siz xizmatimizni yanada rivojlantirishga hissa qo‘shasiz.  
Sizning har bir yordamingiz biz uchun muhim! ❤️

<b>📝 Izoh:</b> Telegram username yoki ID kiritishni unutmang.

<b>To‘lov usullari:</b>
▫️ <b><a href="https://tirikchilik.uz/MikioNatsu">Tirikchilik.uz</a></b> orqali to‘lov  
▫️ Kartaga to‘lov
  `,
  parse_mode: "HTML" as const,
};

const donateKeyboard = new InlineKeyboard()
  .url("💳 Tirikchilik.uz", "https://tirikchilik.uz/MikioNatsu")
  .row()
  .text("🔙 Asosiy menyu", "back");

// 1) Yangi xabar yuborish uchun
export const donate = async (ctx: MyContext) => {
  await ctx.replyWithPhoto(donateContent.media, {
    caption: donateContent.caption,
    parse_mode: donateContent.parse_mode,
    reply_markup: donateKeyboard,
  });
};

// 2) Callback orqali mavjud xabarni yangilash uchun
export const donateCB = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageMedia(donateContent, {
    reply_markup: donateKeyboard,
  });
};
