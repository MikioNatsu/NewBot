import { InlineKeyboard } from "grammy";
import { Order } from "../models/Order";
import { getBalance } from "../services/smmService";
import { MyContext } from "../types";
import {
  adminBackKeyboard,
  adminKeyboard,
  postMenuKeyboard,
} from "../keyboards/AdminKeyboards";
import { User } from "../models/User";
import { premium, stars } from "../consts/product";
import "dotenv/config";
import { Donate } from "../models/Donate";
import { bot } from "..";
import { SubscriptionChannel } from "../models/SubscriptionChannel";

const ADMIN_ID = Number(process.env.ADMIN);
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const CHANNEL_ID = process.env.CHECK_PAYMENT!;
const POST_CHANNEL = process.env.POST_CHANNEL!;

// 🔹 Admin bosh menyu
export const adminCB = async (ctx: MyContext) => {
  await ctx.reply(
    "👨‍💻 <b>Admin Panelga xush kelibsiz!</b>\n\n" +
      "Quyidagi funksiyalardan birini tanlang va boshqaring 🔧",
    {
      parse_mode: "HTML",
      reply_markup: adminKeyboard,
    }
  );
};

export const postMenu = async (ctx: MyContext) => {
  await ctx.editMessageText(
    "📝 <b>Yangi post yaratish!</b>\n\n" +
      "Quyidagi turdagi  postlardan birini tanlang 👇\n",
    {
      parse_mode: "HTML",
      reply_markup: postMenuKeyboard,
    }
  );
};

// 🔹 Pending buyurtmalar
export const admin_orders = async (ctx: MyContext) => {
  const pendingOrders = await Order.find({ status: "pending" }).limit(10);
  if (pendingOrders.length === 0) {
    return ctx.editMessageText(
      "❌ <b>Hozirda <i>pending</i> buyurtmalar yo‘q.</b>",
      {
        parse_mode: "HTML",
        reply_markup: adminBackKeyboard,
      }
    );
  }

  let message = "📋 <b>So‘nggi Pending Buyurtmalar</b>\n\n";
  pendingOrders.forEach((order, index) => {
    message +=
      `#${index + 1}\n🧾 <b>ID:</b> <code>${order._id}</code>\n` +
      `⭐️ <b>Stars:</b> ${order.productId}\n` +
      `👤 <b>Foydalanuvchi:</b> ${order.userId}\n` +
      `📦 <b>Status:</b> <i>${order.status}</i>\n\n`;
  });

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: adminBackKeyboard,
  });
  await ctx.answerCallbackQuery();
};

// 🔹 Balans
export const admin_balance = async (ctx: MyContext) => {
  try {
    const balance = await getBalance();
    await ctx.editMessageText(
      `💰 <b>Joriy balans:</b> <code>${balance.balance}</code> ${balance.currency}`,
      {
        parse_mode: "HTML",
        reply_markup: adminBackKeyboard,
      }
    );
  } catch (err) {
    await ctx.editMessageText(
      `❌ <b>Balansni olishda xatolik yuz berdi.</b>\n<i>${err}</i>`,
      { parse_mode: "HTML" }
    );
  }
  await ctx.answerCallbackQuery();
};

// 🔹 Retrying buyurtmalar
export const admin_retries = async (ctx: MyContext) => {
  const retryingOrders = await Order.find({ status: "retrying" });
  if (retryingOrders.length === 0) {
    return ctx.editMessageText("✅ <b>Hozirda retrying buyurtmalar yo‘q.</b>", {
      parse_mode: "HTML",
      reply_markup: adminBackKeyboard,
    });
  }

  let message = "🔄 <b>Retrying Buyurtmalar</b>\n\n";
  retryingOrders.forEach((order, index) => {
    message +=
      `#${index + 1}\n🧾 <b>ID:</b> <code>${order._id}</code>\n` +
      `⭐️ <b>Stars:</b> ${order.productId}\n` +
      `⏰ <b>Oxirgi tekshiruv:</b> ${
        order.updatedAt?.toLocaleString() || "N/A"
      }\n\n`;
  });

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: adminBackKeyboard,
  });
  await ctx.answerCallbackQuery();
};

// 🔹 Statistikalar
export const admin_stats = async (ctx: MyContext) => {
  const totalOrders = await Order.countDocuments();
  const completed = await Order.countDocuments({ status: "completed" });
  const retrying = await Order.countDocuments({ status: "retrying" });
  const users = await User.distinct("telegramId").then((u) => u.length);
  const balance = await getBalance();

  const message =
    "📊 <b>Umumiy Statistikalar</b>\n\n" +
    `🧾 <b>Jami buyurtmalar:</b> ${totalOrders}\n` +
    `✅ <b>Yakunlangan:</b> ${completed}\n` +
    `🔁 <b>Retrying:</b> ${retrying}\n` +
    `👥 <b>Foydalanuvchilar:</b> ${users}\n\n` +
    `💰 <b>Balans:</b> <code>${balance.balance}</code> ${balance.currency}`;

  await ctx.editMessageText(message, {
    parse_mode: "HTML",
    reply_markup: adminBackKeyboard,
  });
  await ctx.answerCallbackQuery();
};

// 🔹 Orqaga qaytish
export const back_admin = async (ctx: MyContext) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "👨‍💻 <b>Admin Panelga qaytdingiz!</b>\n\n" +
      "Quyidagi bo‘limlardan birini tanlang 🔽",
    {
      parse_mode: "HTML",
      reply_markup: adminKeyboard,
    }
  );
};

interface PendingPost {
  text: string;
}

const pendingPosts = new Map<number, PendingPost>();

// 🎯 /newpost komandasi
export async function newPostCommand(ctx: MyContext) {
  if (ctx.from?.id !== ADMIN_ID) {
    return ctx.reply("🚫 Sizda bu buyruqdan foydalanish huquqi yo‘q.");
  }

  const keyboard = new InlineKeyboard()
    .text("📝 O‘zim yozaman", "manual_post")
    .row()
    .text("🤖 AI orqali yaratish", "ai_post")
    .row()
    .text("⬅️ Orqaga", "post_menu");

  await ctx.editMessageText("📰 Post yaratish usulini tanlang:", {
    reply_markup: keyboard,
  });
}

// 🧠 AI orqali post yaratish
async function generateAIPost(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: `
Siz professional Telegram post generatorisiz. Sizning vazifangiz — "YulduzBozor" kanali uchun jozibali, ishonchli va savdoga undovchi post yaratish.

📦 Ma'lumotlar:
- Kanal nomi: <b>YulduzBozor</b>
- Bot: <b>@YulduzBozorBot</b>
- Admin: <b>@MikioNatsu</b>
- Yetkazib berish: 1–5 daqiqa ichida ⚡
- Muvaffaqiyatli buyurtmalar: @YulduzBozor_orders
- To‘lov turi: kartaga tashlab, admin tasdiqlaydi 💳
- Asosiy mahsulotlar:
  • Telegram Stars ⭐ (50 → 100,000 gacha)
  • Telegram Premium 💎 (1 oydan 12 oygacha)
- Narxlar juda arzon! 🔥
- Brend ohangi:
  🎉 Do‘stona va jozibali (Telegram auditoriyasiga mos)
  💎 Premium va ishonchli
  ⚡ Tez, zamonaviy va marketing uslubida
  ❤️ Samimiy va soddaligi bilan ishonchli

⭐ <b>Telegram Stars narxlari:</b>
${stars
  .map(
    (item) =>
      `⭐ ${item.stars.toLocaleString(
        "en-US"
      )} — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

💎 <b>Telegram Premium narxlari:</b>

🎁 <i>Sovg‘a qilish uchun:</i>
${premium.gift
  .map(
    (item) =>
      `🎁 ${item.month} oy — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

👤 <i>Profilingiz uchun:</i>
${premium.profile
  .map(
    (item) =>
      `💎 ${item.month} oy — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

📋 Post yaratishda talablar:
1. Postni <b>HTML formatda</b> yozing.
2. Har doim <b>emojilar</b>dan foydalaning (ammo haddan tashqari ko‘p emas).
3. Matnni <b>3–5 bo‘limli</b> tarzda yozing (masalan: kirish, narxlar, afzalliklar, chaqiriq).
4. Reklama uslubida, lekin ishonchli va tabiiy yozing.
5. Yakunda foydalanuvchini <b>@YulduzBozorBot</b> orqali xaridga undang.
6. Ba’zan sarlavhalarni “⭐”, “💎”, “⚡” kabi emoji bilan ajratib bering.

🎯 Maqsad: odam postni o‘qib, botga o‘tib xarid qilishni xohlashi kerak.

Misol:
<b>⭐ Telegram Stars – eng arzon narxlarda!</b>
💬 50 ta – 11 000 so‘m
💬 100 ta – 21 000 so‘m
...
⚡ 1–5 daqiqada yetkazib beramiz!

👇 Buyurtma berish:
👉 <a href="https://t.me/YulduzBozorBot">@YulduzBozorBot</a>
Do not use <br> tags; use \n for new lines instead. Make sure the text is valid for sendMessage
Endi shu uslubda har safar yangi, jonli, kreativ va o‘zgacha post yarating.
`,
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("AI API xatolik:", await response.text());
      return null;
    }

    const data: any = await response.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("AI bilan bog‘lanishda xatolik:", err);
    return null;
  }
}

// 📩 Admin matn yuborganida
export async function handleNewPost(ctx: MyContext) {
  if (!ctx.from || !ctx.session) return;

  if (ctx.session.waitingForPost) {
    const text = ctx.message?.text;
    if (!text) return ctx.reply("❗ Faqat matn yuboring.");

    pendingPosts.set(ctx.from.id, { text });
    ctx.session.waitingForPost = false;

    await showPreview(ctx, text);
  } else if (ctx.session.waitingForAIPrompt) {
    ctx.session.waitingForAIPrompt = false;
    const prompt = ctx.message?.text ?? "";
    if (!prompt) return;

    await ctx.reply("⏳ AI post yaratayapti, kuting...");

    const aiText = await generateAIPost(prompt);
    if (!aiText) return ctx.reply("⚠️ AI bilan bog‘lanishda xatolik.");

    pendingPosts.set(ctx.from.id, { text: aiText });
    await showPreview(ctx, aiText);
  }
}

// 🔘 Callbacklar
export function newPostCallbackHandlers(bot: any) {
  // 📝 O‘zim yozaman
  bot.callbackQuery("manual_post", async (ctx: MyContext) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    ctx.session.waitingForPost = true;
    await ctx.editMessageText("📝 Post matnini yuboring:");
  });

  // 🤖 AI orqali yaratish
  bot.callbackQuery("ai_post", async (ctx: MyContext) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    ctx.session.waitingForAIPrompt = true;
    await ctx.editMessageText(
      "💡 Post mavzusini yozing (masalan: Telegram Premium afzalliklari):"
    );
  });

  // ✅ Tasdiqlash
  bot.callbackQuery("confirm_post", async (ctx: MyContext) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    const pending = pendingPosts.get(ctx.from.id);
    if (!pending) return ctx.answerCallbackQuery("❗ Post topilmadi.");

    await ctx.answerCallbackQuery();
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });

    if (!CHANNEL_ID) {
      return ctx.reply("⚠️ CHANNEL_ID .env faylida belgilanmagan.");
    }

    await ctx.api.sendMessage(CHANNEL_ID, pending.text, {
      parse_mode: "HTML",
    });

    await ctx.reply("✅ Post kanalga yuborildi.");
    pendingPosts.delete(ctx.from.id);
  });

  // ♻️ Qayta yozish (AI regenerate)
  bot.callbackQuery("regenerate_post", async (ctx: MyContext) => {
    if (ctx.from?.id !== ADMIN_ID) return;

    const pending = pendingPosts.get(ctx.from.id);
    if (!pending) return ctx.answerCallbackQuery("Post topilmadi.");

    await ctx.answerCallbackQuery("♻️ AI qayta yozmoqda...");
    const newText = await generateAIPost(
      "Shu postni boshqa uslubda, o‘zgacha formatda va biroz qisqaroq yoz: " +
        pending.text
    );

    if (!newText) return ctx.reply("⚠️ Qayta generatsiya qilishda xatolik.");
    pendingPosts.set(ctx.from.id, { text: newText });
    await showPreview(ctx, newText);
  });

  // ❌ Bekor qilish
  bot.callbackQuery("cancel_post", async (ctx: MyContext) => {
    if (ctx.from?.id !== ADMIN_ID) return;
    pendingPosts.delete(ctx.from.id);
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await ctx.answerCallbackQuery("❌ Bekor qilindi.");
    await ctx.reply("🚫 Post bekor qilindi.");
  });
}

// 🔹 Preview funksiyasi
async function showPreview(ctx: MyContext, text: string) {
  const keyboard = new InlineKeyboard()
    .text("✅ Tasdiqlash", "confirm_post")
    .text("♻️ Qayta yozish", "regenerate_post")
    .row()
    .text("❌ Bekor qilish", "cancel_post");

  await ctx.reply(`📢 <b>Post namunasi:</b>\n\n${text}`, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
}

/////////////////

// Donater rank funksiyasi
function getDonateRank(amount: number): string {
  if (amount < 10000) return "😅 Bomj Donater";
  if (amount < 50000) return "🪙 Yaxshi Donater";
  if (amount < 100000) return "💎 Premium Donater";
  if (amount < 500000) return "🔥 Super Donater";
  if (amount < 1000000) return "👑 Legend Donater";
  return "🌌 All-In Qahramon";
}

// Boshlash (faqat admin)
export const postDonate = async (ctx: MyContext) => {
  ctx.session.state = "awaiting_donate_user";
  ctx.session.pendingDonate = {};
  await ctx.editMessageText("👤 Donat kim tomonidan?", {
    reply_markup: adminBackKeyboard,
  });
};

// Step 1: User
export const handleDonateUser = async (ctx: MyContext) => {
  ctx.session.pendingDonate = { user: ctx.message?.text || "Noma’lum" };
  ctx.session.state = "awaiting_donate_comment";
  await ctx.reply("📝 Izoh kiriting:");
};

// Step 2: Comment
export const handleDonateComment = async (ctx: MyContext) => {
  ctx.session.pendingDonate = {
    ...ctx.session.pendingDonate,
    comment: ctx.message?.text || "-",
  };
  ctx.session.state = "awaiting_donate_amount";
  await ctx.reply("💵 Summani kiriting (so‘mda):");
};

// Step 3: Amount + Send to channel + Save to DB
export const handleDonateAmount = async (ctx: MyContext) => {
  const amountNum = Number(ctx.message?.text || "0");
  const { user, comment } = ctx.session.pendingDonate!;

  const rank = getDonateRank(amountNum);

  // 📌 DB ga yozamiz
  await Donate.create({
    user,
    comment,
    amount: amountNum,
    createdAt: new Date(),
  });

  await ctx.api.sendMessage(
    POST_CHANNEL,
    `✨ <b>Yangi Donat Qabul Qilindi!</b> ✨

👤 <b>Kim tomonidan:</b> ${user}
💵 <b>Summasi:</b> <code>${amountNum.toLocaleString("uz-UZ")} so‘m</code>
📝 <b>Izoh:</b> ${comment || "—"}
📅 <b>Sana:</b> ${new Date().toLocaleString("uz-UZ")}

🏆 <b>Daraja:</b> ${rank}`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📊 Statistika",
              url: `https://t.me/${
                (
                  await bot.api.getMe()
                ).username
              }?start=donatestats`,
            },
          ],
        ],
      },
    }
  );

  await ctx.reply("✅ Donat xabari kanalga yuborildi!");

  // reset session
  ctx.session.state = null;
  ctx.session.pendingDonate = null;
};

export async function manageSubscriptions(ctx: MyContext) {
  const channels = await SubscriptionChannel.find({});
  let message = "📢 Majburiy obuna kanallari:\n\n";
  channels.forEach((ch, index) => {
    message += `${index + 1}. ${ch.channelName} (${ch.channelId})\n`;
  });
  if (channels.length === 0) message += "Hali kanal qo'shilmagan.";

  const keyboard = new InlineKeyboard()
    .text("➕ Kanal qo'shish", "add_channel")
    .row();
  channels.forEach((ch) => {
    keyboard
      .text(`❌ O'chirish: ${ch.channelName}`, `delete_channel_${ch._id}`)
      .row();
  });
  keyboard.text("⬅️ Orqaga", "admin_menu");

  await ctx.editMessageText(message, { reply_markup: keyboard });
}

export async function addChannel(ctx: MyContext) {
  ctx.session.state = "awaiting_channel_id";
  await ctx.editMessageText(
    "📢 Yangi kanal ID sini yuboring (masalan, -1002229098897):"
  );
}

export async function deleteChannel(ctx: MyContext) {
  if (!ctx.match) {
    return ctx.answerCallbackQuery("❌ Kanal ID topilmadi!");
  }
  const channelId = ctx.match?.[1]; // Optional chaining qo'shildi
  if (!channelId) {
    await ctx.answerCallbackQuery("❌ Kanal ID topilmadi!");
    return;
  }
  await SubscriptionChannel.findByIdAndDelete(channelId);
  await ctx.answerCallbackQuery("✅ Kanal o'chirildi!");
  await manageSubscriptions(ctx);
}
