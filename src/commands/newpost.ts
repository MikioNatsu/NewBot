import { InlineKeyboard } from "grammy";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { MyContext } from "../types.js";
import { premium, stars } from "../consts/product.js";

dotenv.config();

const ADMIN_ID = Number(process.env.ADMIN);
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const CHANNEL_ID = process.env.CHECK_PAYMENT!;

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
    .text("🤖 AI orqali yaratish", "ai_post");

  await ctx.reply("📰 Post yaratish usulini tanlang:", {
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
