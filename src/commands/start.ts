// src/commands/start.ts
import { User } from "../models/User.js";
import { MyContext } from "../types.js";
import { mainKeyboard } from "../keyboards/UserKeyboards.js";
import { Donate } from "../models/Donate.js";
import { addReferral } from "../services/referralService.js";
import {
  checkSubscription,
  getSubscriptionMessage,
  getSubscriptionButtons,
} from "../utils/checkSubscription.js";

function escapeHTML(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const start = async (ctx: MyContext) => {
  const payload = ctx.match as string | undefined;

  // Donat statistikasi uchun alohida case
  if (payload === "donatestats") {
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

  // Referral payload ni sessionga saqlash
  if (payload && payload !== "donatestats") {
    ctx.session.pendingReferrer = payload;
    console.log(`[DEBUG] Referral link orqali keldi: ${payload}`);
  }

  // Admin uchun obuna tekshirishsiz o'tkazish
  if (ctx.from?.id.toString() === process.env.ADMIN) {
    return handleStartForUser(ctx);
  }

  // Obuna tekshirish
  const isSubscribed = await checkSubscription(ctx, { force: true });
  console.log(
    `[DEBUG] Obuna status: ${
      isSubscribed ? "Obuna bo'lgan" : "Obuna bo'lmagan"
    }`
  );

  if (!isSubscribed) {
    return ctx.reply(
      `⚠️ Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n${await getSubscriptionMessage()}\n\nObuna bo'lgandan keyin /start buyrug'ini qayta yuboring.`,
      {
        reply_markup: await getSubscriptionButtons(),
        parse_mode: "HTML",
      }
    );
  }

  // Obuna bo'lgan foydalanuvchi uchun
  await handleStartForUser(ctx);
};

async function handleStartForUser(ctx: MyContext) {
  const payload = ctx.session.pendingReferrer;
  const safeName = escapeHTML(ctx.from?.first_name || "Foydalanuvchi");

  if (!ctx.from) {
    return ctx.reply("⚠️ Telegram ID topilmadi. Bot ishlashi uchun ID kerak.");
  }

  const { id, first_name, username } = ctx.from;
  const userId = id.toString();

  try {
    // Referral qo'shish va stars berish (faqat obuna bo'lgan bo'lsa)
    const payload = ctx.match as string | undefined;
    await addReferral(userId, payload);
    console.log(
      `[DEBUG] Referral qo'shildi va stars berildi (agar mavjud bo'lsa)`
    );

    const existingUser = await User.findOne({ telegramId: id });
    if (existingUser) {
      return ctx.replyWithPhoto(
        `AgACAgIAAxkBAAICzWjlJLwl4ehGc8FBhSiAswl8uuwZAALSAzIbz3YoS4_i77etvEPfAQADAgADeQADNgQ`,
        {
          caption: `👋 <b>Hurmatli </b>\<b><a href="tg://user?id=${ctx.from?.id}">${safeName}</a>!</b>\n\n<b>Botimizning bosh menyusiga xush kelibsiz!</b>\n\nBu yerda siz barcha imkoniyatlarni qulay va tezkor tarzda topasiz:\n<blockquote>⭐️ <b>Premium xizmatlar</b>\n💳 <b>To'lovlar va sovg'alalar</b>\n📢 <b>Yangiliklar va qo'llab-quvvatlash</b></blockquote>\n\n<i>Biz siz uchun hammasini soddalashtirdik — endi faqat menyudan kerakli bo'limni tanlashingiz kifoya.</i> 🚀\n\n<b>⬇️ Quyidagi tugmalardan foydalaning ⬇️</b>`,
          reply_markup: mainKeyboard,
          parse_mode: "HTML",
        }
      );
    }

    // Yangi foydalanuvchi
    const newUser = new User({
      telegramId: id,
      firstName: first_name,
      username,
    });
    await newUser.save();

    return ctx.replyWithPhoto(
      `AgACAgIAAxkBAAICzWjlJLwl4ehGc8FBhSiAswl8uuwZAALSAzIbz3YoS4_i77etvEPfAQADAgADeQADNgQ`,
      {
        caption: `<b>🎉 Botimizga xush kelibsiz, <a href="tg://user?id=${ctx.from?.id}">${safeName}</a>!\n\nSizni oramizda ko'rganimizdan mamnunmiz. 🚀\n\nBu yerda siz:\n<blockquote>⭐️ Premium xizmatlardan foydalanishingiz\n💳 To'lovlarni qulay amalga oshirishingiz\n🎁 Sovg'alalar va maxsus takliflarni qo'lga kiritishingiz\n📢 Eng so'nggi yangiliklardan xabardor bo'lishingiz mumkin.</blockquote>\n\n<i>Biz ishonamizki, siz bizning doimiy va qadrlangan haridorimizga aylanasiz!</i> 💙\n\n⬇️ Quyidagi tugmalardan foydalanib, o'zingizga kerakli bo'limni tanlang ⬇️ </b>`,
        reply_markup: mainKeyboard,
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.error("Start buyrug'ida xato:", error);
    ctx.reply("❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.");
  } finally {
    // Referral payload ni tozalash (bir marta ishlatish uchun)
    ctx.session.pendingReferrer = null;
  }
}
