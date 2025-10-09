// src/callbacks/buyStars.ts
import "dotenv/config";
import { InlineKeyboard } from "grammy";
import { MyContext } from "../types";
import { stars } from "../consts/product";
import { User } from "../models/User";

export const buyStarsMenu = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();

  const starsKeyboard = new InlineKeyboard();

  for (let i = 0; i < stars.length; i += 2) {
    const first = stars[i];
    const second = stars[i + 1];

    if (second) {
      starsKeyboard
        .text(`${first.stars} ⭐️`, `buy_stars_${first.stars}`)
        .text(`${second.stars} ⭐️`, `buy_stars_${second.stars}`)
        .row();
    } else {
      starsKeyboard
        .text(`${first.stars} ⭐️`, `buy_stars_${first.stars}`)
        .row();
    }
  }

  starsKeyboard.text("⬅️ Orqaga", "back").row();

  try {
    const message = ctx.callbackQuery?.message;

    if (!message) {
      return await ctx.reply("❌ Xatolik: message topilmadi.");
    }

    if ("text" in message && message.text) {
      // Agar oddiy matn bo‘lsa
      await ctx.editMessageText(
        `⭐️ *Stars sotib olish*\n\n` +
          `📦 *Paketni tanlang va to'lov qilishingiz mumkin*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Har bir paket avtomatik ravishda hisobingizga qo‘shiladi.\n` +
          `🔒 To‘lovdan keyin chekni yuboring — admin tasdiqlaydi.\n\n` +
          `⬇️ *Tanlang:*`,
        {
          reply_markup: starsKeyboard,
          parse_mode: "Markdown",
        }
      );
    } else if ("caption" in message) {
      // Agar media (photo/video/document) bo‘lsa
      await ctx.editMessageCaption({
        caption:
          `⭐️ *Stars sotib olish*\n\n` +
          `📦 *Paketni tanlang va to'lov qilishingiz mumkin*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Har bir paket avtomatik ravishda hisobingizga qo‘shiladi.\n` +
          `🔒 To‘lovdan keyin chekni yuboring — admin tasdiqlaydi.\n\n` +
          `⬇️ *Tanlang:*`,
        reply_markup: starsKeyboard,
        parse_mode: "Markdown",
      });
    } else {
      // Fallback
      await ctx.reply(
        `⭐️ *Stars sotib olish*\n\n` +
          `📦 *Paketni tanlang va to'lov qilishingiz mumkin*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Har bir paket avtomatik ravishda hisobingizga qo‘shiladi.\n` +
          `🔒 To‘lovdan keyin chekni yuboring — admin tasdiqlaydi.\n\n` +
          `⬇️ *Tanlang:*`,
        {
          reply_markup: starsKeyboard,
          parse_mode: "Markdown",
        }
      );
    }
  } catch (err) {
    console.error("❌ editMessage xatosi:", err);
    await ctx.reply("⚠️ Xatolik yuz berdi, keyinroq urinib ko‘ring.");
  }
};

export const buyStarsDetail = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery({ text: "Waiting for payment..." });

  if (!ctx.match) return ctx.reply("❌ Noto‘g‘ri buyruq.");

  const starsCount = parseInt(ctx.match[1], 10);
  const user = await User.findOne({ telegramId: ctx.from?.id });
  if (!user) return ctx.reply("❌ Foydalanuvchi topilmadi.");

  const product = stars.find((p) => p.stars === starsCount);
  if (!product) return ctx.reply("❌ Bunday mahsulot yo‘q.");

  // ❌ DB ga yozmaymiz, faqat session ichida vaqtincha saqlaymiz
  ctx.session.state = "awaiting_check";
  ctx.session.pendingProduct = {
    stars: product.stars,
    price: product.price,
  };

  const card = process.env.UZCARD as string;

  await ctx.editMessageCaption({
    caption: `💳 <b>To‘lov uchun karta:</b>\n<code>${card.replace(
      /(\d{4})(?=\d)/g,
      "$1 "
    )}</code>\n\n⭐️ <b>Yulduzlar:</b> ${product.stars.toLocaleString(
      "uz-UZ"
    )}\n💵 <b>Narx:</b> ${product.price.toLocaleString(
      "uz-UZ"
    )} so‘m\n\n📸 <i>To‘lov qilganingizdan so‘ng chekni shu yerga yuboring.</i>`,
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard().text("⬅️ Orqaga", "buy_stars_menu"),
  });
};
