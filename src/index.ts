import "dotenv/config";
import {
  Bot,
  GrammyError,
  HttpError,
  InlineKeyboard,
  Middleware,
  session,
} from "grammy";
import mongoose from "mongoose";
import { hydrate } from "@grammyjs/hydrate";
import { MyContext, SessionData } from "./types";
import { start } from "./commands/start";
import { profile } from "./callbacks/profile";
import { confirmPayment, denyPayment } from "./callbacks/payments";
import { Order } from "./models/Order";
import { buyStarsDetail, buyStarsMenu } from "./callbacks/stars";
import { history } from "./callbacks/history";
import { mainKeyboard } from "./keyboards/UserKeyboards";
import {
  buyPremiumGift,
  buyPremiumGiftDetail,
  buyPremiumMenu,
  buyPremiumProfile,
  buyPremiumProfileDetail,
} from "./callbacks/premium";
import { donate, donateCB } from "./commands/donate";
import { setLanguageCB } from "./callbacks/lang";
import {
  handleDonateAmount,
  handleDonateComment,
  handleDonateUser,
  postDonate,
} from "./commands/post";
import { Donate } from "./models/Donate";
import { escapeHTML } from "./utils/escapeHTML";

const BOT_API_TOKEN = process.env.BOT_TOKEN!;
const CHANNEL_ID = process.env.CHECK_PAYMENT!;

export const bot = new Bot<MyContext>(BOT_API_TOKEN);

function initialSession(): SessionData {
  return { state: null, currentOrderId: null, pendingProduct: null };
}

bot.use(session({ initial: initialSession }));
bot.use(hydrate());

bot.api.setMyCommands([
  { command: "start", description: "Botni ishga tushirish" },
  {
    command: "donat",
    description: "Bizni qo‘llab-quvvatlash orqali donat qilish",
  },
]);
bot.command("start", start);
bot.command("donat", donate);
bot.command("post", postDonate);

bot.on("message:text", async (ctx) => {
  if (ctx.session.state === "awaiting_donate_user") {
    return handleDonateUser(ctx);
  }
  if (ctx.session.state === "awaiting_donate_comment") {
    return handleDonateComment(ctx);
  }
  if (ctx.session.state === "awaiting_donate_amount") {
    return handleDonateAmount(ctx);
  }
});

bot.callbackQuery(/^setLang:(uz|ru)$/, setLanguageCB);
bot.callbackQuery("buy_stars_menu", buyStarsMenu);
bot.callbackQuery(/buy_stars_(\d+)/, buyStarsDetail);
bot.callbackQuery(/confirm_(.+)/, confirmPayment);
bot.callbackQuery(/deny_(.+)/, denyPayment);
bot.callbackQuery("profile", profile);
bot.callbackQuery("history", history);
bot.callbackQuery("donate", donateCB);

// Premium menyusi
bot.callbackQuery("buy_premium_menu", buyPremiumMenu);

bot.callbackQuery("buy_premium_gift", buyPremiumGift);
bot.callbackQuery("buy_premium_profile", buyPremiumProfile);

bot.callbackQuery(/buy_premium_gift_(\d+)/, buyPremiumGiftDetail);

bot.callbackQuery(/buy_premium_profile_(\d+)/, buyPremiumProfileDetail);

// bot.on("message:photo", async (ctx) => {
//   const photos = ctx.message.photo;
//   const fileId = photos[photos.length - 1].file_id; // eng sifatli (oxirgi) variantni oladi
//   console.log("File ID:", fileId);

//   await ctx.reply(`Siz yuborgan rasm file_id: ${fileId}`);
// });
bot.on("message:photo", async (ctx) => {
  if (ctx.session.state !== "awaiting_check") return;

  const pending = ctx.session.pendingProduct;
  if (!pending) return ctx.reply("❌ Buyurtma topilmadi.");

  // Agar username bo‘lmasa foydalanuvchiga chiroyli ogohlantirish beramiz
  if (!ctx.from?.username) {
    return ctx.reply(
      `⚠️ Hurmatli <b>${escapeHTML(
        ctx.from?.first_name || "foydalanuvchi"
      )}</b>!\n\n` +
        `Sizda <b>Telegram username</b> mavjud emas. 
Chekni yuborishdan oldin <b>username</b> o‘rnatishingiz kerak.\n\n` +
        `🛠 Username – bu sizning profilingiz uchun unikal @(belgi) bilan boshlanuvchi nom (masalan, <code>@starlink_${
          Math.floor(Math.random() * 1000) + 1
        }</code>). 
U o‘rnatilgandan so‘ng bot orqali buyurtmalarni tezroq tasdiqlash mumkin bo‘ladi.`,
      {
        parse_mode: "HTML",
        reply_markup: new InlineKeyboard().text("⬅️ Orqaga", "back"),
      }
    );
  }

  const order = await Order.create({
    userId: ctx.from?.id,
    productId: pending.stars,
    price: pending.price,
    status: "pending",
    createdAt: new Date(),
  });

  const keyboard = new InlineKeyboard()
    .text("✅ Tasdiqlash", `confirm_${order._id}`)
    .text("❌ Rad etish", `deny_${order._id}`);

  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1].file_id;

  const msg = await ctx.api.sendPhoto(CHANNEL_ID, fileId, {
    caption:
      `🧾 Yangi chek!\n\n👤 User: <a href="tg://user?id=${
        order.userId
      }">${escapeHTML(ctx.from?.first_name)}</a>\n` +
      `⭐️ Stars: ${order.productId}\n💵 Narx: ${order.price.toLocaleString(
        "uz-UZ"
      )} so‘m\n📅 ${new Date().toLocaleString("uz-UZ")}\n📌 *Holati*: ${
        order.status === "pending"
          ? "⏳ Kutilmoqda"
          : order.status === "confirmed"
          ? "✅ Tasdiqlangan"
          : "🚫 Rad etilgan"
      }`,
    reply_markup: keyboard,
    parse_mode: "HTML",
  });

  order.channelMessageId = msg.message_id;
  await order.save();

  await ctx.reply(`━━━━━━━━━━━━━━━
✅ 𝗖𝗵𝗲𝗸 𝗾𝗮𝗯𝘂𝗹 𝗾𝗶𝗹𝗶𝗻𝗱𝗶  
━━━━━━━━━━━━━━━

👨‍💻 Administrator tomonidan tekshirilmoqda.  
⏳ Iltimos, biroz kuting – tez orada javob olasiz.
`);

  // Sessionni tozalaymiz
  ctx.session.state = null;
  ctx.session.pendingProduct = null;
});

bot.callbackQuery("back", async (ctx) => {
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
});
bot.catch((err) => {
  console.error(`Xatolik update ${err.ctx.update.update_id}:`, err.error);
});

async function startBot() {
  try {
    console.log("MongoDB ulanda Va Bot ishlamoqda!");
    await mongoose.connect(process.env.MONGODB_URI!);
    bot.start();
    console.log("✅ MongoDB ulandi va bot ishga tushdi");
  } catch (error) {
    console.error("❌ Bot ishga tushirishda xatolik:", error);
  }
}

startBot();
