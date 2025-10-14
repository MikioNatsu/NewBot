import "dotenv/config";
import { stars, premium } from "../consts/product";
import { InlineKeyboard } from "grammy";
import { MyContext } from "../types";
import { User } from "../models/User";
import { Donate } from "../models/Donate";
import { Order } from "../models/Order";
import { bot } from "..";
import { back_admin } from "../callbacks/admin";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;

// AI funksiyasi boshiga ko'chirildi va log qo'shildi
export async function generateAIPost(prompt: string): Promise<string | null> {
  console.log(`[LOG] generateAIPost chaqirildi, prompt: "${prompt}"`);
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
          model: "openai/gpt-5",
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
      console.error("[ERROR] AI API xatolik:", await response.text());
      return null;
    }

    const data: any = await response.json();
    console.log("[LOG] AI javob oldi:", data?.choices?.[0]?.message?.content);
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("[ERROR] AI bog'lanish xatosi:", err);
    return null;
  }
}

interface PendingBroadcast {
  text?: string;
  photo?: string;
  video?: string;
  keyboard?: InlineKeyboard;
  target?: "all" | "donaters" | "premium";
  schedule?: Date;
}

const pendingBroadcasts = new Map<number, PendingBroadcast>();

// === 🧭 Asosiy menyu ===
export const broadcastMenu = async (ctx: MyContext) => {
  console.log("[LOG] broadcastMenu chaqirildi, user ID:", ctx.from?.id);
  if (ctx.from?.id !== Number(process.env.ADMIN)) return;

  await ctx.editMessageText(
    "📢 <b>Barcha foydalanuvchilarga xabar yuborish</b>\n\n" +
      "Quyidagi funksiyalar mavjud:\n" +
      "• Matn yozish (qo‘lda yoki AI orqali)\n" +
      "• Rasm / video qo‘shish\n" +
      "• Inline tugma qo‘shish (URL yoki callback)\n" +
      "• Auditoriyani tanlash (barcha, donaterlar, premium)\n" +
      "• Rejalashtirilgan yuborish\n" +
      "• Preview ko‘rish va yuborish",
    {
      parse_mode: "HTML",
      reply_markup: broadcastKeyboard(pendingBroadcasts.has(ctx.from?.id ?? 0)),
    }
  );
};

const bc_menu = new InlineKeyboard().text("🔙 BC ga qaytish", "broadcast_menu");

// === 🔘 Klaviatura ===
function broadcastKeyboard(hasPending: boolean = false): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("📝 Manual matn yozish", "broadcast_manual_text")
    .row()
    .text("🤖 AI matn generatsiya", "broadcast_ai_text")
    .row()
    .text("🖼️ Rasm qo‘shish", "broadcast_add_photo")
    .text("🎥 Video qo‘shish", "broadcast_add_video")
    .row()
    .text("🔘 Button qo‘shish", "broadcast_add_button")
    .row()
    .text("👥 Auditoriyani tanlash", "broadcast_target")
    .row()
    .text("⏰ Rejalashtirish", "broadcast_schedule")
    .row();

  if (hasPending) {
    kb.text("👀 Preview", "broadcast_preview")
      .row()
      .text("✅ Yuborish", "broadcast_send")
      .text("♻️ Qayta boshlash", "broadcast_reset")
      .row()
      .text("❌ Bekor qilish", "broadcast_cancel")
      .row();
  }

  kb.text("⬅️ Orqaga", "admin_menu");
  return kb;
}

// === 📩 Callback Handlerlar ===
export function broadcastCallbackHandlers(bot: any) {
  const adminOnly = (ctx: MyContext) =>
    ctx.from?.id === Number(process.env.ADMIN);

  bot.callbackQuery("broadcast_manual_text", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_manual_text callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastText = true;
    await ctx.editMessageText("📝 Xabar matnini yuboring (HTML formatda):", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_ai_text", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_ai_text callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastAIPrompt = true;
    await ctx.editMessageText(
      "💡 AI uchun prompt yozing (masalan: Yangi aksiya haqida xabar):",
      {
        reply_markup: bc_menu,
      }
    );
  });

  bot.callbackQuery("broadcast_add_photo", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_add_photo callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastPhoto = true;
    await ctx.editMessageText("🖼️ Rasm URL yoki file_id yuboring:", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_add_video", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_add_video callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastVideo = true;
    await ctx.editMessageText("🎥 Video URL yoki file_id yuboring:", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_add_button", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_add_button callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastButton = true;
    await ctx.editMessageText(
      "🔘 Tugma format:\n<b>Matn|Type|Value</b>\nMasalan: <code>Botga o'tish|url|https://t.me/bot</code>\n\nType: <b>url</b> yoki <b>callback</b>",
      {
        parse_mode: "HTML",
        reply_markup: bc_menu,
      }
    );
  });

  // 🎯 Target tanlash
  bot.callbackQuery("broadcast_target", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_target callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    const kb = new InlineKeyboard()
      .text("👥 Barcha", "broadcast_target_all")
      .row()
      .text("💰 Donaterlar", "broadcast_target_donaters")
      .row()
      .text("💎 Premiumlar", "broadcast_target_premium")
      .row()
      .text("⬅️ Orqaga", "broadcast_menu");

    await ctx.editMessageText("👥 Kimlarga yuborilsin?", { reply_markup: kb });
  });

  // 🎯 Target funksiyalari
  bot.callbackQuery("broadcast_target_all", setTarget("all"));
  bot.callbackQuery("broadcast_target_donaters", setTarget("donaters"));
  bot.callbackQuery("broadcast_target_premium", setTarget("premium"));

  function setTarget(target: PendingBroadcast["target"]) {
    return async (ctx: MyContext) => {
      console.log("[LOG] setTarget callback for", target, ", user ID:", ctx.from?.id);
      if (!adminOnly(ctx)) return;
      if (!ctx.from) {
        return ctx.answerCallbackQuery("❗ Foydalanuvchi topilmadi!");
      }
      const pending = pendingBroadcasts.get(ctx.from.id) || {};
      pending.target = target;
      pendingBroadcasts.set(ctx.from.id, pending);
      await ctx.answerCallbackQuery(`✅ Auditoriya: ${target}`);
      await broadcastMenu(ctx);
    };
  }

  // 🕒 Schedule
  bot.callbackQuery("broadcast_schedule", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_schedule callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    ctx.session.waitingForBroadcastSchedule = true;
    await ctx.editMessageText(
      "⏰ Vaqt: <b>YYYY-MM-DD HH:MM</b>\nMasalan: <code>2025-10-14 22:00</code>",
      {
        parse_mode: "HTML",
        reply_markup: bc_menu,
      }
    );
  });

  // 👀 Preview
  bot.callbackQuery("broadcast_preview", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_preview callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    if (!ctx.from) {
      return ctx.answerCallbackQuery("❗ Foydalanuvchi topilmadi!");
    }
    const pending = pendingBroadcasts.get(ctx.from.id);
    if (!pending?.text) return ctx.answerCallbackQuery("❗ Xabar matni yo‘q!");
    await sendBroadcastPreview(ctx, pending);
  });

  // 📤 Yuborish
  bot.callbackQuery("broadcast_send", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_send callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    if (!ctx.from) {
      return ctx.answerCallbackQuery("❗ Foydalanuvchi topilmadi!");
    }
    const pending = pendingBroadcasts.get(ctx.from.id);
    if (!pending?.text) return ctx.answerCallbackQuery("❗ Xabar tayyor emas!");
    await ctx.answerCallbackQuery("📤 Yuborilmoqda...");
    await sendBroadcastToUsers(pending, ctx.from.id);
    pendingBroadcasts.delete(ctx.from.id);
    await broadcastMenu(ctx);
  });

  // 🔁 Reset
  bot.callbackQuery("broadcast_reset", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_reset callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    if (!ctx.from) {
      return ctx.answerCallbackQuery("❗ Foydalanuvchi topilmadi!");
    }
    pendingBroadcasts.delete(ctx.from.id);
    await ctx.answerCallbackQuery("♻️ Qayta boshlandi.");
    await broadcastMenu(ctx);
  });

  // ❌ Cancel
  bot.callbackQuery("broadcast_cancel", async (ctx: MyContext) => {
    console.log("[LOG] broadcast_cancel callback, user ID:", ctx.from?.id);
    if (!adminOnly(ctx)) return;
    if (!ctx.from) {
      return ctx.answerCallbackQuery("❗ Foydalanuvchi topilmadi!");
    }
    pendingBroadcasts.delete(ctx.from.id);
    await ctx.answerCallbackQuery("❌ Bekor qilindi.");
    await back_admin(ctx);
  });

  bot.callbackQuery("broadcast_menu", broadcastMenu);
}

// === ✉️ Xabarlarni qabul qilish (input handler) ===
export async function handleBroadcastInput(ctx: MyContext) {
  console.log("[LOG] handleBroadcastInput chaqirildi, session:", ctx.session, "text:", ctx.message?.text);
  const text = ctx.message?.text;
  if (!text || !ctx.from) return;

  const userId = ctx.from.id;
  const pending = pendingBroadcasts.get(userId) || {};

  // 📝 Manual
  if (ctx.session.waitingForBroadcastText) {
    console.log("[LOG] Manual matn saqlandi, text:", text);
    pending.text = text;
    pendingBroadcasts.set(userId, pending);
    ctx.session.waitingForBroadcastText = false;
    await ctx.reply("✅ Matn saqlandi.");
    return broadcastMenu(ctx);
  }

  // 🤖 AI prompt
  if (ctx.session.waitingForBroadcastAIPrompt) {
    console.log("[LOG] AI prompt kiritildi, prompt:", text);
    ctx.session.waitingForBroadcastAIPrompt = false;
    await ctx.reply("🤖 AI javob tayyorlanmoqda...");
    try {
      const aiText = await generateAIPost(text);
      if (!aiText) throw new Error("AI natija yo‘q");
      pending.text = aiText;
      pendingBroadcasts.set(userId, pending);
      await ctx.reply("✅ AI xabar yaratildi:\n\n" + aiText);
    } catch (err) {
      console.error("[ERROR] AI xatolik:", err);
      await ctx.reply("❌ AI post yaratishda xatolik yuz berdi.");
    }
    return broadcastMenu(ctx);
  }

  // 🖼️ Photo
  if (ctx.session.waitingForBroadcastPhoto) {
    console.log("[LOG] Photo saqlandi, url:", text);
    pending.photo = text;
    pendingBroadcasts.set(userId, pending);
    ctx.session.waitingForBroadcastPhoto = false;
    await ctx.reply("🖼️ Rasm saqlandi.");
    return broadcastMenu(ctx);
  }

  // 🎥 Video
  if (ctx.session.waitingForBroadcastVideo) {
    console.log("[LOG] Video saqlandi, url:", text);
    pending.video = text;
    pendingBroadcasts.set(userId, pending);
    ctx.session.waitingForBroadcastVideo = false;
    await ctx.reply("🎥 Video saqlandi.");
    return broadcastMenu(ctx);
  }

  // 🔘 Button
  if (ctx.session.waitingForBroadcastButton) {
    console.log("[LOG] Button kiritildi, format:", text);
    const parts = text.split("|");
    if (parts.length !== 3)
      return ctx.reply(
        "❗ Noto‘g‘ri format. Masalan: `Botga o'tish|url|https://t.me/bot`"
      );
    const [btnText, type, value] = parts;
    const kb = new InlineKeyboard();
    if (type === "url") kb.url(btnText, value);
    else kb.text(btnText, value);
    pending.keyboard = kb;
    pendingBroadcasts.set(userId, pending);
    ctx.session.waitingForBroadcastButton = false;
    await ctx.reply("🔘 Tugma qo‘shildi.");
    return broadcastMenu(ctx);
  }

  // ⏰ Schedule
  if (ctx.session.waitingForBroadcastSchedule) {
    console.log("[LOG] Schedule kiritildi, date:", text);
    const date = new Date(text);
    if (isNaN(date.getTime())) return ctx.reply("❗ Noto‘g‘ri sana formati!");
    pending.schedule = date;
    pendingBroadcasts.set(userId, pending);
    ctx.session.waitingForBroadcastSchedule = false;
    await ctx.reply("⏰ Rejalashtirish saqlandi: " + date.toLocaleString());
    return broadcastMenu(ctx);
  }
  console.log("[LOG] Hech qanday broadcast state topilmadi");
}

// === 👀 Preview ===
async function sendBroadcastPreview(ctx: MyContext, pending: PendingBroadcast) {
  console.log("[LOG] sendBroadcastPreview chaqirildi, pending:", pending);
  const options: any = {
    parse_mode: "HTML",
    reply_markup: pending.keyboard ? pending.keyboard : undefined,
  };
  try {
    if (pending.photo)
      await ctx.replyWithPhoto(pending.photo, {
        caption: pending.text,
        ...options,
      });
    else if (pending.video)
      await ctx.replyWithVideo(pending.video, {
        caption: pending.text,
        ...options,
      });
    else await ctx.reply(pending.text ?? "", options);

    await ctx.reply(
      `👥 Target: ${pending.target || "barchasi"}\n⏰ Schedule: ${
        pending.schedule ? pending.schedule.toLocaleString() : "darhol"
      }`
    );
  } catch (err) {
    console.error("[ERROR] Preview xato:", err);
    await ctx.reply("⚠️ Previewda xatolik yuz berdi.");
  }
}

// === 🚀 Broadcast yuborish ===
async function sendBroadcastToUsers(
  pending: PendingBroadcast,
  adminId: number
) {
  console.log("[LOG] sendBroadcastToUsers chaqirildi, target:", pending.target);
  // Agar vaqt kelmagan bo‘lsa — keyinga rejalashtir
  if (pending.schedule && pending.schedule > new Date()) {
    const delay = pending.schedule.getTime() - Date.now();
    setTimeout(() => sendBroadcastToUsers(pending, adminId), delay);
    await bot.api.sendMessage(
      adminId,
      `⏰ ${pending.schedule.toLocaleString()} ga rejalashtirildi.`
    );
    return;
  }

  let users: number[] = [];
  if (pending.target === "donaters") users = await Donate.distinct("user");
  else if (pending.target === "premium")
    users = await Order.find({
      status: "completed",
      productType: "premium",
    }).distinct("userId");
  else users = await User.distinct("telegramId");

  console.log("[LOG] Users soni:", users.length);

  const options: any = {
    parse_mode: "HTML",
    reply_markup: pending.keyboard ? pending.keyboard : undefined,
  };

  for (const userId of users) {
    try {
      if (pending.photo)
        await bot.api.sendPhoto(userId, pending.photo, {
          caption: pending.text,
          ...options,
        });
      else if (pending.video)
        await bot.api.sendVideo(userId, pending.video, {
          caption: pending.text,
          ...options,
        });
      else await bot.api.sendMessage(userId, pending.text ?? "", options);
    } catch (err) {
      console.error("[ERROR] Yuborish xatosi user ID:", userId, err);
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  await bot.api.sendMessage(
    adminId,
    `✅ ${users.length} ta foydalanuvchiga yuborildi.`
  );
}