import mongoose from "mongoose";
import { Bot, InlineKeyboard, session } from "grammy";
import { hydrate } from "@grammyjs/hydrate";
import { run, RunnerHandle } from "@grammyjs/runner";
import dotenv from "dotenv";
import { AnswerCallbackQueryOptions, MyContext, SessionData } from "./types";
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
import {
  addReferral,
  confirmPurchase,
  initiatePurchase,
} from "./services/referralService";
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
} from "./callbacks/admin";
import { back } from "./callbacks/back";
import {
  addChannel,
  deleteChannel,
  manageSubscriptions,
} from "./commands/admin/manageSubscribtion";

dotenv.config();

const BOT_API_TOKEN = process.env.BOT_TOKEN!;

export const bot = new Bot<MyContext>(BOT_API_TOKEN);

function initialSession(): SessionData {
  return {
    state: null,
    currentOrderId: null,
    pendingProduct: null,
    pendingPurchase: null,
    waitingForPost: false,
    waitingForAIPrompt: false,
    lastSubscriptionCheck: 0,
    pendingReferrer: undefined,
  };
}

bot.use(session({ initial: initialSession }));
bot.use(hydrate());

bot.drop((ctx) => {
  return !(
    ctx.message?.text ||
    ctx.message?.photo ||
    ctx.callbackQuery ||
    ctx.message?.forward_from_chat
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

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  const userId = ctx.from.id.toString();
  if (userId === process.env.ADMIN) return next();

  const allowed = [
    ctx.message?.text?.startsWith("/start"),
    ctx.callbackQuery?.data === "check_subscription",
  ].some(Boolean);

  if (allowed) return next();

  const isSubscribed = await checkSubscription(ctx);
  if (!isSubscribed) {
    await ctx.reply(await getSubscriptionMessage(), {
      reply_markup: await getSubscriptionButtons(),
    });
    return;
  }

  await next();
});

bot.command("start", start);
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
  if (ctx.session.state === "awaiting_channel_input") {
    const input = ctx.message.text.trim();

    // faqat @username yoki -100ID formatlariga ruxsat
    if (!/^(@\S+|-100\d+)$/.test(input)) {
      return ctx.reply(
        "❌ Noto‘g‘ri format!\nFaqat @username yoki -100XXXXXXXXX formatida yuboring.\n\nMasalan:\n@YulduzBozor\nyoki\n-1002229098897"
      );
    }

    // foydalanuvchi username yoki ID kiritganini aniqlaymiz
    const channelId = input;
    const channelName = input;

    try {
      // 🔹 avval getChat orqali tekshiramiz
      const chat = await bot.api.getChat(channelId);

      if (!chat) throw new Error("Chat topilmadi");

      // 🔹 botning o‘zi shu kanalda adminmi?
      const me = await bot.api.getChatMember(
        channelId,
        (
          await bot.api.getMe()
        ).id
      );

      if (!["administrator", "creator"].includes(me.status)) {
        return ctx.reply(
          "⚠️ Bot kanalga qo‘shilgan, lekin administrator emas.\n" +
            "Iltimos, botni admin qilib qo‘ying."
        );
      }

      // 🔹 ma’lumotni bazaga yozamiz
      await SubscriptionChannel.create({
        channelId: chat.id.toString(),
        channelName: chat.username ? `@${chat.username}` : chat.title || input,
      });

      await ctx.reply(
        `✅ Kanal qo‘shildi: ${chat.title || chat.username || input}`
      );
      ctx.session.state = null;
      await manageSubscriptions(ctx);
    } catch (err) {
      console.error("[DEBUG] Kanalni tekshirishda xato:", err);
      await ctx.reply(
        "❌ Xatolik: Kanal topilmadi yoki bot unga kira olmaydi.\n" +
          "Iltimos, botni kanalga admin qilib qo‘ying va qayta urinib ko‘ring."
      );
    }
    return;
  }

  if (ctx.session.state === "awaiting_purchase_amount") {
    const amount = parseInt(ctx.message?.text || "0");
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        "❌ Iltimos, to'g'ri stars miqdorini kiriting (masalan, 50)."
      );
      return;
    }
    await initiatePurchase(ctx, ctx.from!.id.toString(), amount);
  }
  await handleNewPost(ctx);
});

newPostCallbackHandlers(bot);

bot.callbackQuery(/^setLang:(uz|ru)$/, setLanguageCB);
bot.callbackQuery("buy_stars_menu", buyStarsMenu);
bot.callbackQuery(/buy_stars_(\d+)/, buyStarsDetail);
bot.callbackQuery(/confirm_([0-9a-fA-F]{24})/, async (ctx) => {
  const orderId = ctx.match[1];
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      await ctx.answerCallbackQuery({
        text: "❌ Buyurtma topilmadi",
        show_alert: true,
      });
      return;
    }
    await confirmPayment(ctx);
  } catch (error) {
    console.error("Confirm callback error:", error);
    await ctx.answerCallbackQuery({
      text: "❌ Xato yuz berdi",
      show_alert: true,
    });
  }
});
bot.callbackQuery(/deny_([0-9a-fA-F]{24})/, denyPayment);
bot.callbackQuery("profile", profile);
bot.callbackQuery("history", history);
bot.callbackQuery("donate", donateCB);
bot.callbackQuery(
  ["referral_stats", "referral_top", "referral_back"],
  referralHandler
);
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
bot.callbackQuery("initiate_purchase", async (ctx) => {
  await initiatePurchase(ctx, ctx.from!.id.toString());
});
bot.callbackQuery(/confirm_purchase_(\d+)/, async (ctx) => {
  const starsToPurchase = parseInt(ctx.match[1]);
  await confirmPurchase(ctx, ctx.from!.id.toString(), starsToPurchase);
});
bot.callbackQuery("cancel_purchase", async (ctx) => {
  ctx.session.state = null;
  ctx.session.pendingPurchase = null;
  await ctx.editMessageText("❌ Purchase bekor qilindi.", {
    reply_markup: new InlineKeyboard().text("🏠 Menyu", "back"),
  });
  await ctx.answerCallbackQuery({ text: "Bekor qilindi" });
});

bot.callbackQuery("check_subscription", async (ctx: MyContext) => {
  const isSubscribed = await checkSubscription(ctx, { force: true });
  console.log(
    `[DEBUG] Inline button orqali qayta tekshirish: ${
      isSubscribed ? "Obuna bo'lgan" : "Obuna bo'lmagan"
    }`
  );

  if (isSubscribed) {
    await ctx.answerCallbackQuery("✅ Obuna bo'ldingiz! /start ni bosing.");

    await addReferral(
      ctx.from!.id.toString(),
      ctx.session.pendingReferrer ?? undefined
    );
    // Obuna bo'lganda avto referral trigger
    console.log(`[DEBUG] Obuna status o'zgardi va referral trigger ishlatildi`);
  } else {
    await ctx.answerCallbackQuery({
      text: "❌ Obuna hali bo'lmagan. Kanallarga obuna bo'ling va qayta bosing.",
      show_alert: true,
    } as AnswerCallbackQueryOptions);
  }
});

bot.on("message:photo", async (ctx) => {
  if (ctx.session.state !== "awaiting_check") return;

  const pending = ctx.session.pendingProduct;
  if (!pending) return ctx.reply("❌ Buyurtma topilmadi.");

  if (!ctx.from?.username) {
    return ctx.reply(
      `⚠️ Hurmatli <b>${escapeHTML(
        ctx.from?.first_name || "foydalanuvchi"
      )}</b>!\n\n` +
        `Sizda <b>Telegram username</b> mavjud emas.\nChekni yuborishdan oldin <b>username</b> o‘rnatishingiz kerak.\n\n` +
        `🛠 Username – bu sizning profilingiz uchun unikal @(belgi) bilan boshlanuvchi nom (masalan, <code>@starlink_${
          Math.floor(Math.random() * 1000) + 1
        }</code>).\nU o‘rnatilgandan so‘ng bot orqali buyurtmalarni tezroq tasdiqlash mumkin bo‘ladi.`,
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
    const msg = await ctx.api.sendPhoto(process.env.CHECK_PAYMENT, fileId, {
      caption:
        `🧾 Yangi chek!\n\n👤 User: <a href="tg://user?id=${
          order.userId
        }">${escapeHTML(ctx.from?.first_name)}</a>\n` +
        `⭐ Stars: ${order.productId}\n💵 Narx: ${order.price.toLocaleString(
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

    await ctx.reply(
      `━━━━━━━━━━━━━━━\n✅ 𝗖𝗵𝗲𝗸 𝗾𝗮𝗯𝘂𝗹 𝗾𝗶𝗹𝗶𝗻𝗱𝗶\n━━━━━━━━━━━━━━━\n\n👨‍💻 Administrator tomonidan tekshirilmoqda.\n⏳ Iltimos, biroz kuting – tez orada javob olasiz.`
    );
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

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    } as mongoose.mongo.MongoClientOptions);

    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 20000);

async function startBot() {
  try {
    await connectDB();
    const handle: RunnerHandle = run(bot);
    console.log("✅ MongoDB ulandi va bot parallel runner bilan ishga tushdi");
    setInterval(checkPendingOrders, CHECK_INTERVAL);
    console.log("Order checking started");

    process.once("SIGINT", () => handle.stop());
    process.once("SIGTERM", () => handle.stop());
  } catch (error) {
    console.error("❌ Bot ishga tushirishda xatolik:", error);
    process.exit(1);
  }
}

startBot().then(() => {
  console.log("Bot to'liq ishlamoqda!");
});
