import { MyContext } from "../types";
import { User } from "../models/User.js";
import { InlineKeyboard } from "grammy";
import { mainKeyboard } from "../keyboards/UserKeyboards.js";

function escapeHTML(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tilni tanlash tugmalari
const languageKeyboard = new InlineKeyboard()
  .text("🇺🇿 O‘zbekcha", "setLang:uz")
  .row()
  .text("🇷🇺 Русский", "setLang:ru");

// Tilni o‘zgartirish komandasi
export const languageCommand = async (ctx: MyContext) => {
  await ctx.reply(
    "📌 Iltimos, yangi tilni tanlang / Пожалуйста, выберите язык:",
    {
      reply_markup: languageKeyboard,
    }
  );
};

// Callback: tilni saqlash va start xabarini chiqarish
export const setLanguageCB = async (ctx: MyContext) => {
  if (!ctx.from) return;

  const match = ctx.match?.[1]; // "uz" yoki "ru"
  if (!match || (match !== "uz" && match !== "ru")) return;

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  user.language = match as "uz" | "ru";
  await user.save();

  const safeName = escapeHTML(ctx.from.first_name || "Foydalanuvchi");

  const startCaption =
    user.language === "uz"
      ? `<b>🎉 Botimizga xush kelibsiz, <a href="tg://user?id=${ctx.from.id}">${safeName}</a>!</b>\n\nBu yerda siz barcha imkoniyatlarni qulay va tezkor tarzda topasiz:\n<blockquote>⭐️ Premium xizmatlar\n💳 To‘lovlar va sovg‘alar\n📢 Yangiliklar va qo‘llab-quvvatlash</blockquote>\n\n<i>Biz siz uchun hammasini soddalashtirdik — endi faqat menyudan kerakli bo‘limni tanlashingiz kifoya.</i> 🚀`
      : `<b>🎉 Добро пожаловать, <a href="tg://user?id=${ctx.from.id}">${safeName}</a>!</b>\n\nЗдесь вы найдете все возможности бота в удобной и быстрой форме:\n<blockquote>⭐️ Премиум услуги\n💳 Платежи и подарки\n📢 Новости и поддержка</blockquote>\n\n<i>Мы сделали все максимально просто — теперь достаточно выбрать нужный раздел в меню.</i> 🚀`;

  await ctx.replyWithPhoto(
    "AgACAgIAAxkBAAMEaNaXX1rRiXOd59k9cDc96XVdc80AAm_3MRsaPrFKbrqbY_sXe9EBAAMCAAN5AAM2BA",
    {
      caption: startCaption,
      parse_mode: "HTML",
      reply_markup: mainKeyboard,
    }
  );

  await ctx.answerCallbackQuery({ text: "✅ Til tanlandi!" });
};
