import { mainKeyboard } from "../keyboards/UserKeyboards";
import { MyContext } from "../types";
import { escapeHTML } from "../utils/escapeHTML";

export const back = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery({ text: "⏳ Iltimos, kuting..." });
  const safeName = escapeHTML(ctx.from?.first_name || "Foydalanuvchi");

  await ctx.editMessageMedia(
    {
      type: "photo",
      media:
        "AgACAgIAAxkBAAMFaN6wzPx0gbDumI73fsq_bPXTa7AAAvf6MRvfA_lKGxrq7pILe9UBAAMCAAN5AAM2BA",
      caption: `👋 <b>Hurmatli</b> <a href="tg://user?id=${ctx.from?.id}">${safeName}</a>!\n\n<b>Botimizning bosh menyusiga xush kelibsiz!</b>\n\nBu yerda siz barcha imkoniyatlarni qulay va tezkor tarzda topasiz:\n<blockquote>⭐️ <b>Premium xizmatlar</b>\n💳 <b>To‘lovlar va sovg‘alar</b>\n📢 <b>Yangiliklar va qo‘llab-quvvatlash</b></blockquote>\n\n<i>Biz siz uchun hammasini soddalashtirdik — endi faqat menyudan kerakli bo‘limni tanlashingiz kifoya.</i> 🚀\n\n<b>⬇️ Quyidagi tugmalardan foydalaning ⬇️</b>`,
      parse_mode: "HTML",
    },
    {
      reply_markup: mainKeyboard,
    }
  );
};
