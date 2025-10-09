import { User } from "../models/User.js";
import { MyContext } from "../types.js";
import { mainKeyboard } from "../keyboards/UserKeyboards.js";
import { Donate } from "../models/Donate.js";

function escapeHTML(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const start = async (ctx: MyContext) => {
  const payload = ctx.match as string | undefined;
  const total = await Donate.countDocuments();
  const sum = await Donate.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const weNeed = Number(process.env.WENEED ?? 0);
  const totalSum = sum.length > 0 ? sum[0].total : 0;
  function makeProgressBar(current: number, goal: number, size = 10): string {
    const progress = Math.min(1, current / goal);
    const filled = Math.round(progress * size);
    const empty = size - filled;
    return "█".repeat(filled) + "▒".repeat(empty);
  }

  if (payload === "donatestats") {
    return ctx.reply(
      `📊 <b>Donat Statistika</b>\n\n` +
        `👥 <b>Donatlar:</b> <code>${total} ta </code>\n` +
        `💰 <b>Umumiy summa:</b> <code>${totalSum.toLocaleString(
          "uz-UZ"
        )} so‘m</code>\n\n` +
        `🎯 <i>Maqsad:</i> ${weNeed.toLocaleString("uz-UZ")} so‘m\n\n` +
        `📈 Progress: ${Math.min(
          100,
          Math.floor((totalSum / weNeed) * 100)
        )}% 🔥\n` +
        `${makeProgressBar(totalSum, weNeed)}\n\n` +
        `🙏 <b>Hamma donaterlarga rahmat!</b> 💙`,
      { parse_mode: "HTML" }
    );
  }

  const safeName = escapeHTML(ctx.from?.first_name || "Foydalanuvchi");
  if (!ctx.from) {
    return ctx.reply("⚠️ Telegram ID topilmadi. Bot ishlashi uchun ID kerak.");
  }

  const { id, first_name, username } = ctx.from;

  try {
    const existingUser = await User.findOne({ telegramId: id });
    if (existingUser) {
      return ctx.replyWithPhoto(
        `AgACAgIAAxkBAAICzWjlJLwl4ehGc8FBhSiAswl8uuwZAALSAzIbz3YoS4_i77etvEPfAQADAgADeQADNgQ`,
        {
          caption: `👋 <b>Hurmatli </b>\<b><a href="tg://user?id=${ctx.from?.id}">${safeName}</a>!</b>\n\n<b>Botimizning bosh menyusiga xush kelibsiz!</b>\n\nBu yerda siz barcha imkoniyatlarni qulay va tezkor tarzda topasiz:\n<blockquote>⭐️ <b>Premium xizmatlar</b>\n💳 <b>To‘lovlar va sovg‘alar</b>\n📢 <b>Yangiliklar va qo‘llab-quvvatlash</b></blockquote>\n\n<i>Biz siz uchun hammasini soddalashtirdik — endi faqat menyudan kerakli bo‘limni tanlashingiz kifoya.</i> 🚀\n\n<b>⬇️ Quyidagi tugmalardan foydalaning ⬇️</b>`,
          reply_markup: mainKeyboard,
          parse_mode: "HTML",
        }
      );
    }

    const newUser = new User({
      telegramId: id,
      firstName: first_name,
      username,
    });
    await newUser.save();

    return ctx.replyWithPhoto(
      `AgACAgIAAxkBAAICzWjlJLwl4ehGc8FBhSiAswl8uuwZAALSAzIbz3YoS4_i77etvEPfAQADAgADeQADNgQ`,
      {
        caption: `<b>🎉 Botimizga xush kelibsiz, <a href="tg://user?id=${ctx.from?.id}">${safeName}</a>!\n\nSizni oramizda ko‘rganimizdan mamnunmiz. 🚀\n\nBu yerda siz:\n<blockquote>⭐️ Premium xizmatlardan foydalanishingiz\n💳 To‘lovlarni qulay amalga oshirishingiz\n🎁 Sovg‘alar va maxsus takliflarni qo‘lga kiritishingiz\n📢 Eng so‘nggi yangiliklardan xabardor bo‘lishingiz mumkin.</blockquote>\n\n<i>Biz ishonamizki, siz bizning doimiy va qadrlangan haridorimizga aylanasiz!</i> 💙\n\n⬇️ Quyidagi tugmalardan foydalanib, o‘zingizga kerakli bo‘limni tanlang ⬇️ </b>`,
        reply_markup: mainKeyboard,
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.error("Start buyrug‘ida xato:", error);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.");
  }
};
