import { InlineKeyboard } from "grammy";
import { premiumKeyboard } from "../keyboards/UserKeyboards.js";
import { MyContext } from "../types.js";
import { premium } from "../consts/product.js";
import { User } from "../models/User.js";

export const buyPremiumMenu = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  ctx.editMessageCaption({
    caption: `
━━━━━━━━━━━━━━━
✨ <b>Premium xizmatlar</b>
━━━━━━━━━━━━━━━

<b>📌 Qanday turda <b>premium</b> sotib olishni istaysiz?

⭐️ Premium afzalliklari:
<blockquote> • 4 GB gacha fayl yuklash
 • Cheksiz kanallar va chatlar
 • Reklamalarsiz interfeys
 • Ikki barobar tezkor yuklash
 • Eksklyuziv stiker va emoji ✨</blockquote>

⬇️ Quyidan kerakli variantni tanlang! </b>
`,
    parse_mode: "HTML",
    reply_markup: premiumKeyboard,
  });
};

export const buyPremiumGift = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  const keyboards = new InlineKeyboard();

  premium.gift.forEach((gift) => {
    keyboards
      .text(`${gift.month} oylik premium`, `buy_premium_gift_${gift.month}`)
      .row();
  });
  keyboards.text("⬅️ Orqaga", "buy_premium_menu");

  ctx.editMessageCaption({
    caption: `
━━━━━━━━━━━━━━━
✨ <b>Gift sifatida Premium xizmatlar</b>
━━━━━━━━━━━━━━━

Nechchi oylik premium sotib olishni rejalashtiryapsiz? 

⭐️ <b>Premium obuna orqali imkoniyatlar:
<blockquote>• Cheklovlarsiz foydalanish  
• Tezroq yuklash va jo‘natish  
• Maxsus sticker va emoji’lar  
• Eksklyuziv belgi (badge)  
• Tezkor qo‘llab-quvvatlash  
• Maxsus bonuslar va imtiyozlar
</blockquote>

⬇️ Quyidan kerakli muddatni tanlang va o‘z imkoniyatlaringizni kengaytiring!
</b>`,
    parse_mode: "HTML",
    reply_markup: keyboards,
  });
};

export const buyPremiumProfile = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  const keyboards = new InlineKeyboard();

  premium.profile.forEach((gift) => {
    keyboards
      .text(`${gift.month} oylik premium`, `buy_premium_profile_${gift.month}`)
      .row();
  });
  keyboards.text("⬅️ Orqaga", "buy_premium_menu");

  ctx.editMessageCaption({
    caption: `
━━━━━━━━━━━━━━━
✨ <b>Profilga kirib Premium olib berish </b>
━━━━━━━━━━━━━━━

Nechchi oylik premium sotib olishni rejalashtiryapsiz? 

⭐️ <b>Premium obuna orqali imkoniyatlar:
<blockquote>• Cheklovlarsiz foydalanish  
• Tezroq yuklash va jo‘natish  
• Maxsus sticker va emoji’lar  
• Eksklyuziv belgi (badge)  
• Tezkor qo‘llab-quvvatlash  
• Maxsus bonuslar va imtiyozlar
</blockquote>

⬇️ Quyidan kerakli muddatni tanlang va o‘z imkoniyatlaringizni kengaytiring!
</b>`,
    parse_mode: "HTML",
    reply_markup: keyboards,
  });
};

export const buyPremiumGiftDetail = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  if (!ctx.match) {
    return ctx.reply("❌ Xato! Iltimos, boshqa biror tugmani bosing.");
  }
  const month = parseInt(ctx.match[1]);
  const product = premium.gift.find((p) => p.month === month);

  if (!product) {
    return ctx.reply("❌ Bunday premium paketi mavjud emas.");
  }

  ctx.editMessageCaption({
    caption:
      `✨ Siz <b>${month} oylik</b> premium sotib olmoqchisiz.\n` +
      `💰 Narx: <b>${product.price} so'm</b>\n\n`,
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("⬅️ Orqaga", "buy_premium_menu")
      .url("👤 Admin", `https://t.me/mikionatsu`),
  });
};

export const buyPremiumProfileDetail = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  if (!ctx.match) {
    return ctx.reply("❌ Xato! Iltimos, boshqa biror tugmani bosing.");
  }
  const month = parseInt(ctx.match[1]);
  const product = premium.profile.find((p) => p.month === month);

  if (!product) {
    return ctx.reply("❌ Bunday premium paketi mavjud emas.");
  }

  ctx.editMessageCaption({
    caption:
      `✨ Siz <b>${month} oylik</b> premium sotib olmoqchisiz.\n` +
      `💰 Narx: <b>${product.price} so'm</b>\n\n`,
    parse_mode: "HTML",
    reply_markup: new InlineKeyboard()
      .text("⬅️ Orqaga", "buy_premium_menu")
      .url("👤 Admin", "https://t.me/mikionatsu"),
  });
};

export const payForPremiumGift = async (ctx: MyContext) => {
  try {
    await ctx.answerCallbackQuery();
    if (!ctx.match) {
      return ctx.reply("❌ Xato! Iltimos, boshqa biror tugmani bosing.");
    }
    const month = parseInt(ctx.match[1]);
    const product = premium.gift.find((p) => p.month === month);

    if (!product) {
      return ctx.reply("❌ Bunday premium paketi mavjud emas.");
    }

    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (!user) {
      return ctx.reply(
        "⚠️ Siz hali ro‘yxatdan o‘tmagansiz.\nIltimos, /start buyrug‘ini bosing."
      );
    }

    await ctx.editMessageCaption({
      caption: `✅ Tabriklaymiz!\nSiz <b>${month} oylik</b> premium sotib oldingiz!\n\n`,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🏘 Menu", "back"),
    });

    const adminId = process.env.ADMIN;
    if (adminId) {
      await ctx.api.sendMessage(
        adminId,
        `📢 <b>Yangi sotib olish!</b>\n\n👤 Foydalanuvchi: <a href="tg://user?id=${ctx.from?.id}">${ctx.from?.first_name}</a>\n` +
          `🆔 ID: <code>${ctx.from?.id}</code>\n` +
          `⭐️ Sotib olindi: <b>${product.month} oylik premium⭐️</b>\n💳 Narxi: <b>${product.price} so'm</b>\n`,
        { parse_mode: "HTML" }
      );
    }
  } catch (err) {
    console.error(err);
  }
};

export const payForPremiumProfile = async (ctx: MyContext) => {
  try {
    await ctx.answerCallbackQuery();
    if (!ctx.match) {
      return ctx.reply("❌ Xato! Iltimos, boshqa biror tugmani bosing.");
    }
    const month = parseInt(ctx.match[1]);
    const product = premium.profile.find((p) => p.month === month);

    if (!product) {
      return ctx.reply("❌ Bunday premium paketi mavjud emas.");
    }

    const user = await User.findOne({ telegramId: ctx.from?.id });
    if (!user) {
      return ctx.reply(
        "⚠️ Siz hali ro‘yxatdan o‘tmagansiz.\nIltimos, /start buyrug‘ini bosing."
      );
    }

    await user.save();

    await ctx.editMessageCaption({
      caption: `✅ Tabriklaymiz!\nSiz <b>${month} oylik</b> premium sotib oldingiz!\n\n`,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("🏘 Menu", "back"),
    });
  } catch (err) {
    console.error(err);
  }
};
