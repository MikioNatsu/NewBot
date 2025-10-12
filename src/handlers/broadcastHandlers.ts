import { InlineKeyboard } from "grammy";
import { MyContext } from "../types";
import { User } from "../models/User";
import { Donate } from "../models/Donate";
import { Order } from "../models/Order";
import { bot } from "..";
import { generateAIPost } from "./postHandlers";
import { back_admin } from "../callbacks/admin";

interface PendingBroadcast {
  text?: string;
  photo?: string;
  video?: string;
  keyboard?: InlineKeyboard;
  target?: "all" | "donaters" | "premium";
  schedule?: Date;
}

const pendingBroadcasts = new Map<number, PendingBroadcast>();

export const broadcastMenu = async (ctx: MyContext) => {
  if (ctx.from?.id !== Number(process.env.ADMIN)) return;

  await ctx.editMessageText(
    "📢 <b>Barcha foydalanuvchilarga xabar yuborish</b>\n\n" +
      "Xabar turini va opsiyalarni tanlang. Funksiyalar:\n" +
      "- Matn yozish (manual yoki AI)\n" +
      "- Rasm yoki video qo'shish\n" +
      "- Inline buttonlar qo'shish (URL yoki callback)\n" +
      "- Auditoriyani filtr: barcha, donaterlar, premium foydalanuvchilar\n" +
      "- Vaqtni rejalashtirish\n" +
      "- Preview va tasdiqlash",
    {
      parse_mode: "HTML",
      reply_markup: broadcastKeyboard(pendingBroadcasts.has(ctx.from?.id ?? 0)),
    }
  );
};
const bc_menu = new InlineKeyboard().text("🔙 BC ga qaytish", "broadcast_menu");

function broadcastKeyboard(hasPending: boolean = false): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("📝 Manual matn yozish", "broadcast_manual_text")
    .row()
    .text("🤖 AI matn generatsiya", "broadcast_ai_text")
    .row()
    .text("🖼️ Rasm qo'shish", "broadcast_add_photo")
    .text("🎥 Video qo'shish", "broadcast_add_video")
    .row()
    .text("🔘 Button qo'shish", "broadcast_add_button")
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

export function broadcastCallbackHandlers(bot: any) {
  bot.callbackQuery("broadcast_manual_text", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastText = true;
    await ctx.editMessageText("📝 Xabar matnini yuboring (HTML formatda):", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_ai_text", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastAIPrompt = true;
    await ctx.editMessageText(
      "💡 AI uchun prompt yozing (masalan: Yangi aksiya haqida xabar):",
      {
        reply_markup: bc_menu,
      }
    );
  });

  bot.callbackQuery("broadcast_add_photo", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastPhoto = true;
    await ctx.editMessageText("🖼️ Rasm URL yoki file_id yuboring:", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_add_video", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastVideo = true;
    await ctx.editMessageText("🎥 Video URL yoki file_id yuboring:", {
      reply_markup: bc_menu,
    });
  });

  bot.callbackQuery("broadcast_add_button", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastButton = true;
    await ctx.editMessageText(
      "🔘 Button qo'shish: Format - 'Matn|Type|Value' (masalan: 'Botga o'tish|url|https://t.me/bot')\n" +
        "Type: url yoki callback",
      {
        reply_markup: bc_menu,
      }
    );
  });

  bot.callbackQuery("broadcast_target", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    const kb = new InlineKeyboard()
      .text("👥 Barcha userlar", "broadcast_target_all")
      .row()
      .text("💰 Donaterlar", "broadcast_target_donaters")
      .row()
      .text("💎 Premium userlar", "broadcast_target_premium")
      .row()
      .text("⬅️ Orqaga", "broadcast_menu");

    await ctx.editMessageText("👥 Kimlarga yuborishni tanlang:", {
      reply_markup: kb,
    });
  });

  bot.callbackQuery("broadcast_target_all", setTarget("all"));
  bot.callbackQuery("broadcast_target_donaters", setTarget("donaters"));
  bot.callbackQuery("broadcast_target_premium", setTarget("premium"));

  function setTarget(target: PendingBroadcast["target"]) {
    return async (ctx: MyContext) => {
      if (ctx.from?.id !== Number(process.env.ADMIN)) return;
      const pending = pendingBroadcasts.get(ctx.from.id) || {};
      pending.target = target;
      pendingBroadcasts.set(ctx.from.id, pending);
      await ctx.answerCallbackQuery(`✅ Auditoriya: ${target}`);
      await broadcastMenu(ctx);
    };
  }

  bot.callbackQuery("broadcast_schedule", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    ctx.session.waitingForBroadcastSchedule = true;
    await ctx.editMessageText(
      "⏰ Yuborish vaqtini yozing (YYYY-MM-DD HH:MM, masalan: 2025-10-13 14:00):",
      {
        reply_markup: bc_menu,
      }
    );
  });

  bot.callbackQuery("broadcast_preview", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    const pending = pendingBroadcasts.get(ctx.from.id);
    if (!pending || !pending.text) {
      return ctx.answerCallbackQuery("❗ Xabar matni yo'q!");
    }
    await sendBroadcastPreview(ctx, pending);
  });

  bot.callbackQuery("broadcast_send", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    const pending = pendingBroadcasts.get(ctx.from.id);
    if (!pending || !pending.text) {
      return ctx.answerCallbackQuery("❗ Xabar tayyor emas!");
    }

    await ctx.answerCallbackQuery("📤 Yuborilmoqda...");
    await sendBroadcastToUsers(pending, ctx.from.id);
    pendingBroadcasts.delete(ctx.from.id);
    await broadcastMenu(ctx);
  });

  bot.callbackQuery("broadcast_reset", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    pendingBroadcasts.delete(ctx.from.id);
    await ctx.answerCallbackQuery("♻️ Boshidan boshlandi.");
    await broadcastMenu(ctx);
  });

  bot.callbackQuery("broadcast_cancel", async (ctx: MyContext) => {
    if (ctx.from?.id !== Number(process.env.ADMIN)) return;
    pendingBroadcasts.delete(ctx.from.id);
    await ctx.answerCallbackQuery("❌ Bekor qilindi.");
    await back_admin(ctx);
  });

  bot.callbackQuery("broadcast_menu", broadcastMenu);
}

export async function handleBroadcastInput(ctx: MyContext) {
  if (!ctx.from || !ctx.session || ctx.from.id !== Number(process.env.ADMIN))
    return;

  const pending = pendingBroadcasts.get(ctx.from.id) || {};
  const text = ctx.message?.text;

  if (ctx.session.waitingForBroadcastText && text) {
    pending.text = text;
    ctx.session.waitingForBroadcastText = false;
  } else if (ctx.session.waitingForBroadcastAIPrompt && text) {
    ctx.session.waitingForBroadcastAIPrompt = false;
    await ctx.reply("⏳ AI generatsiya qilmoqda...");
    const aiText = await generateAIPost(text);
    if (aiText) pending.text = aiText;
    else return ctx.reply("⚠️ AI xatolik!");
  } else if (ctx.session.waitingForBroadcastPhoto && text) {
    pending.photo = text;
    ctx.session.waitingForBroadcastPhoto = false;
  } else if (ctx.session.waitingForBroadcastVideo && text) {
    pending.video = text;
    ctx.session.waitingForBroadcastVideo = false;
  } else if (ctx.session.waitingForBroadcastButton && text) {
    try {
      const parts = text.split("|").map((s) => s.trim());
      if (parts.length !== 3) {
        throw new Error("Format xato");
      }
      const [buttonText, type, value] = parts;
      if (!buttonText || !type || !value) {
        return ctx.reply(
          "❗ Format xato! Masalan: 'Matn|url|https://example.com'"
        );
      }
      pending.keyboard = pending.keyboard || new InlineKeyboard();
      if (type.toLowerCase() === "url") {
        pending.keyboard.url(buttonText, value);
      } else if (type.toLowerCase() === "callback") {
        pending.keyboard.text(buttonText, value);
      } else {
        return ctx.reply(
          "❗ Type faqat 'url' yoki 'callback' bo'lishi mumkin!"
        );
      }
      ctx.session.waitingForBroadcastButton = false;
      await ctx.reply("✅ Button qo'shildi! Yana qo'shish mumkin.");
    } catch (err) {
      console.error("Button pars xatosi:", err);
      return ctx.reply("❗ Format xato! Qayta urinib ko'ring.");
    }
  } else if (ctx.session.waitingForBroadcastSchedule && text) {
    const scheduleDate = new Date(text);
    if (isNaN(scheduleDate.getTime())) {
      return ctx.reply("❗ Vaqt formati xato!");
    }
    pending.schedule = scheduleDate;
    ctx.session.waitingForBroadcastSchedule = false;
  } else {
    return;
  }

  pendingBroadcasts.set(ctx.from.id, pending);
  await ctx.reply("✅ Qo'shildi!", {
    reply_markup: broadcastKeyboard(true),
  });
  await broadcastMenu(ctx);
}

async function sendBroadcastPreview(ctx: MyContext, pending: PendingBroadcast) {
  const options: any = {
    parse_mode: "HTML",
    reply_markup: pending.keyboard
      ? { inline_keyboard: pending.keyboard.inline_keyboard }
      : undefined,
  };

  try {
    if (pending.photo) {
      await ctx.replyWithPhoto(pending.photo, {
        caption: pending.text,
        ...options,
      });
    } else if (pending.video) {
      await ctx.replyWithVideo(pending.video, {
        caption: pending.text,
        ...options,
      });
    } else {
      await ctx.reply(pending.text ?? "", options);
    }
    await ctx.reply(
      `👥 Target: ${pending.target || "all"}\n⏰ Schedule: ${
        pending.schedule ? pending.schedule.toLocaleString() : "Darhol"
      }`
    );
  } catch (err) {
    await ctx.reply(`⚠️ Preview xatolik: ${err}`);
  }
}

async function sendBroadcastToUsers(
  pending: PendingBroadcast,
  adminId: number
) {
  if (pending.schedule && pending.schedule > new Date()) {
    const delay = pending.schedule.getTime() - Date.now();
    setTimeout(() => sendBroadcastToUsers(pending, adminId), delay);
    await bot.api.sendMessage(
      adminId,
      `⏰ Broadcast rejalashtirildi: ${pending.schedule.toLocaleString()}`
    );
    return;
  }

  let users: any[] = [];
  if (pending.target === "donaters") {
    users = await Donate.distinct("user");
  } else if (pending.target === "premium") {
    users = await Order.find({
      status: "completed",
      productType: "premium",
    }).distinct("userId");
  } else {
    users = await User.distinct("telegramId");
  }

  const options: any = {
    parse_mode: "HTML",
    reply_markup: pending.keyboard
      ? { inline_keyboard: pending.keyboard.inline_keyboard }
      : undefined,
  };

  for (const userId of users) {
    try {
      if (pending.photo) {
        await bot.api.sendPhoto(userId, pending.photo, {
          caption: pending.text,
          ...options,
        });
      } else if (pending.video) {
        await bot.api.sendVideo(userId, pending.video, {
          caption: pending.text,
          ...options,
        });
      } else {
        await bot.api.sendMessage(userId, pending.text ?? "", options);
      }
    } catch (err) {
      console.error(`User ${userId} ga yuborishda xato:`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await bot.api.sendMessage(
    adminId,
    `✅ Broadcast ${users.length} ta userga yuborildi!`
  );
}
