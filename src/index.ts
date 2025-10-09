import "dotenv/config";
import { Bot, InlineKeyboard, session } from "grammy";
import mongoose from "mongoose";
import { hydrate } from "@grammyjs/hydrate";
import { run, RunnerHandle } from "@grammyjs/runner";
import { MyContext, SessionData } from "./types";
import { start } from "./commands/start";
import { referralHandler } from "./commands/referral";
import { profile } from "./callbacks/profile";
import { confirmPayment, denyPayment } from "./callbacks/payments";
import { Order } from "./models/Order";
import { Referral } from "./models/Referral";
import { SubscriptionChannel } from "./models/SubscriptionChannel";
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
import { escapeHTML } from "./utils/escapeHTML";
import { CHECK_INTERVAL, checkPendingOrders } from "./jobs/checkOrders";
import { isAdmin } from "./middlewares/admin";
import { addReferral, recordOrder } from "./services/referralService";
import {
  checkSubscription,
  getSubscriptionButtons,
  getSubscriptionMessage,
} from "./utils/checkSubscription";
import {
  admin_balance,
  admin_orders,
  admin_retries,
  admin_stats,
  adminCB,
  back_admin,
  handleDonateAmount,
  handleDonateComment,
  handleDonateUser,
  handleNewPost,
  newPostCallbackHandlers,
  newPostCommand,
  postDonate,
  postMenu,
  manageSubscriptions,
  addChannel,
  deleteChannel,
} from "./callbacks/admin";
import { back } from "./callbacks/back";

const BOT_API_TOKEN = process.env.BOT_TOKEN!;

export const bot = new Bot<MyContext>(BOT_API_TOKEN);

function initialSession(): SessionData {
  return { state: null, currentOrderId: null, pendingProduct: null };
}

bot.use(session({ initial: initialSession }));
bot.use(hydrate());

bot.drop((ctx) => {
  return !(
    ctx.message?.text ||
    ctx.message?.photo ||
    ctx.callbackQuery ||
    (ctx.message as any)?.forward_from_chat
  );
});

bot.api.setMyCommands([
  { command: "start", description: "Botni ishga tushirish" },
  {
    command: "donat",
    description: "Bizni qo‘llab-quvvatlash orqali donat qilish",
  },
  { command: "stats", description: "Referral statistikasini ko'rish" },
]);

bot.command("start", async (ctx) => {
  const isSubscribed = await checkSubscription(ctx);
  if (!isSubscribed) {
    return ctx.reply(
      `⚠️ Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling:\n${await getSubscriptionMessage()}`,
      {
        reply_markup: await getSubscriptionButtons(),
      }
    );
  }

  const payload = ctx.match as string | undefined;
  if (payload && payload !== "donatestats") {
    await addReferral(ctx.from!.id.toString(), payload);
  }
  await start(ctx);
});
bot.command("donat", donate);
bot.command(["stats"], referralHandler);
bot.command("admin", isAdmin, adminCB);

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
  if (ctx.session.waitingForPost || ctx.session.waitingForAIPrompt) {
    return handleNewPost(ctx);
  }
});

newPostCallbackHandlers(bot);

bot.callbackQuery(/^setLang:(uz|ru)$/, setLanguageCB);
bot.callbackQuery("buy_stars_menu", buyStarsMenu);
bot.callbackQuery(/buy_stars_(\d+)/, buyStarsDetail);
bot.callbackQuery(/confirm_(.+)/, async (ctx) => {
  const orderId = ctx.match[1];
  const order = await Order.findById(orderId);
  if (order) {
    await recordOrder(order.userId, order.productId, order.price);
  }
  await confirmPayment(ctx);
});
bot.callbackQuery(/deny_(.+)/, denyPayment);
bot.callbackQuery("profile", profile);
bot.callbackQuery("history", history);
bot.callbackQuery("donate", donateCB);
bot.callbackQuery(["referral_stats", "referral_top"], referralHandler);

bot.callbackQuery("buy_premium_menu", buyPremiumMenu);
bot.callbackQuery("buy_premium_gift", buyPremiumGift);
bot.callbackQuery("buy_premium_profile", buyPremiumProfile);
bot.callbackQuery(/buy_premium_gift_(\d+)/, buyPremiumGiftDetail);
bot.callbackQuery(/buy_premium_profile_(\d+)/, buyPremiumProfileDetail);

bot.callbackQuery("admin_orders", isAdmin, admin_orders);
bot.callbackQuery("admin_balance", isAdmin, admin_balance);
bot.callbackQuery("admin_retries", isAdmin, admin_retries);
bot.callbackQuery("admin_stats", isAdmin, admin_stats);
bot.callbackQuery("admin_menu", isAdmin, back_admin);
bot.callbackQuery("post_menu", postMenu);
bot.callbackQuery("newpost", newPostCommand);
bot.callbackQuery("donat_post", postDonate);
bot.callbackQuery("manage_subscriptions", isAdmin, manageSubscriptions);
bot.callbackQuery("add_channel", isAdmin, addChannel);
bot.callbackQuery(/delete_channel_(.+)/, isAdmin, deleteChannel);

// bot.on("message:photo", async (ctx) => {
//   const photos = ctx.message.photo;
//   const fileId = photos[photos.length - 1].file_id;
//   console.log("File ID:", fileId);
//   await ctx.reply(`Siz yuborgan rasm file_id: ${fileId}`);
// });

bot.on("message:photo", async (ctx) => {
  if (ctx.session.state !== "awaiting_check") return;

  const pending = ctx.session.pendingProduct;
  if (!pending) return ctx.reply("❌ Buyurtma topilmadi.");

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
    userId: ctx.from?.id.toString(),
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

  if (!process.env.CHECK_PAYMENT) {
    console.error("CHECK_PAYMENT aniqlanmagan!");
    await ctx.api.sendMessage(
      process.env.ADMIN!,
      "⚠️ Xato: CHECK_PAYMENT .env faylida aniqlanmagan!"
    );
    return ctx.reply("❌ Texnik xato yuz berdi. Administratorga xabar bering.");
  }

  try {
    console.log("CHECK_PAYMENT:", process.env.CHECK_PAYMENT);
    const msg = await ctx.api.sendPhoto(process.env.CHECK_PAYMENT, fileId, {
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
  } catch (err) {
    console.error("❌ sendPhoto xatosi:", err);
    await ctx.api.sendMessage(
      process.env.ADMIN!,
      `⚠️ sendPhoto xatosi: ${err}`
    );
    return ctx.reply("❌ Texnik xato yuz berdi. Administratorga xabar bering.");
  }

  ctx.session.state = null;
  ctx.session.pendingProduct = null;
});

bot.callbackQuery("back", back);

bot.catch((err) => {
  console.error(`Xatolik update ${err.ctx.update.update_id}:`, err.error);
});

async function startBot() {
  try {
    console.log("MongoDB ulanda Va Bot ishlamoqda!");
    await mongoose.connect(process.env.MONGODB_URI!);

    const handle: RunnerHandle = run(bot);
    console.log("✅ MongoDB ulandi va bot parallel runner bilan ishga tushdi");

    process.once("SIGINT", () => handle.stop());
    process.once("SIGTERM", () => handle.stop());
  } catch (error) {
    console.error("❌ Bot ishga tushirishda xatolik:", error);
  }
}

startBot().then(() => {
  console.log("Bot to'liq ishlamoqda!");
  setInterval(checkPendingOrders, CHECK_INTERVAL);
});
