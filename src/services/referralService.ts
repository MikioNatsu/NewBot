import { Referral } from "../models/Referral";
import { bot } from "../index";
import { User } from "../models/User";
import { InlineKeyboard } from "grammy";
import { Order } from "../models/Order";
import { escapeHTML } from "../utils/escapeHTML";

export async function addReferral(
  userId: string,
  referrerId?: string
): Promise<void> {
  try {
    if (!userId) throw new Error("User ID topilmadi");

    let referral = await Referral.findOne({ userId });
    if (!referral) {
      referral = new Referral({
        userId,
        referrerId,
        referrals: [],
        orders: [],
        totalEarnings: 0,
        totalStars: 0,
      });
      await referral.save();
    }

    if (referrerId && referrerId !== userId) {
      const referrer = await Referral.findOne({ userId: referrerId });
      if (referrer) {
        const existing = referrer.referrals.some((r) => r.userId === userId);
        if (!existing) {
          referrer.referrals.push({ userId, referredAt: new Date() });
          referrer.totalStars += 0.5;
          await referrer.save();
          await bot.api.sendMessage(
            referrerId,
            `🌟 Yangi taklif! +0.5 stars qo'shildi.`
          );
        }
      }
    }
  } catch (error) {
    console.error("Referral qo'shishda xato:", error);
    throw error;
  }
}

export async function recordOrder(
  userId: string,
  productId: number,
  price: number
): Promise<void> {
  try {
    if (productId <= 0) return;

    const referral = await Referral.findOne({ "referrals.userId": userId });
    if (!referral) return;

    const referredEntry = referral.referrals.find((r) => r.userId === userId);
    if (!referredEntry) return;

    const oneWeekAgo = new Date(referredEntry.referredAt);
    oneWeekAgo.setDate(oneWeekAgo.getDate() + 7);
    if (new Date() > oneWeekAgo) return;

    const existingOrder = referral.orders.find(
      (o) => o.userId === userId && o.productId === productId
    );
    if (existingOrder) return;

    referral.orders.push({ userId, productId, price, createdAt: new Date() });
    const bonusStars = productId * 0.05;
    referral.totalStars += bonusStars;
    await referral.save();

    const user = await User.findOne({ telegramId: userId });
    await bot.api.sendMessage(
      referral.userId,
      `🌟 +${bonusStars.toFixed(
        0
      )} stars bonus! Taklifingiz ${productId} ta stars sotib oldi.`
    );
  } catch (error) {
    console.error("Buyurtma qayd qilishda xato:", error);
  }
}

export async function showReferralEarnings(userId: string): Promise<string> {
  try {
    const referral = await Referral.findOne({ userId });
    if (!referral) {
      return "❌ Hali referral yo'q.";
    }

    return `
🌟 <b>Referal Statistika</b>
───────────────────
👥 Do'stlar: ${referral.referrals.length}
⭐ Stars: ${referral.totalStars.toFixed(1)}
💸 Foyda: ${referral.totalEarnings.toFixed(0)} so'm
───────────────────
`;
  } catch (error) {
    console.error("Statistikada xato:", error);
    return "❌ Xato.";
  }
}

export async function initiatePurchase(
  ctx: any,
  userId: string,
  starsToPurchase?: number
): Promise<void> {
  try {
    const referral = await Referral.findOne({ userId });
    if (!referral) {
      await ctx.reply(
        "❌ Referral ma'lumotlari topilmadi. /start bilan ro'yxatdan o'ting."
      );
      return;
    }

    const totalStars = referral.totalStars;

    if (!starsToPurchase) {
      // Agar stars miqdori kiritilmagan bo'lsa, foydalanuvchidan so'rash
      if (totalStars < 50) {
        await ctx.reply(
          `❌ Sizda yetarli stars yo'q. Hozirgi balans: ${totalStars.toFixed(
            1
          )} stars. Minimal 50 stars kerak.`
        );
        return;
      }

      await ctx.reply(
        `⭐ Hozirgi balans: ${totalStars.toFixed(1)} stars\n` +
          `💸 Minimal purchase: 50 stars\n` +
          `Necha stars purchase qilmoqchisiz? Masalan, 50 yoki undan ko'p.`,
        {
          reply_markup: new InlineKeyboard().text(
            "❌ Bekor qilish",
            "cancel_purchase"
          ),
        }
      );
      ctx.session.state = "awaiting_purchase_amount";
      return;
    }

    // Stars miqdori kiritilgan bo'lsa
    if (starsToPurchase < 50) {
      await ctx.reply("❌ Minimal purchase 50 stars bo'lishi kerak.");
      return;
    }

    if (totalStars < starsToPurchase) {
      await ctx.reply(
        `❌ Yetarli stars yo'q. Balans: ${totalStars.toFixed(
          1
        )} stars, siz esa ${starsToPurchase} stars so'rayapsiz.`
      );
      return;
    }

    // Tasdiqlash so'rovi
    const keyboard = new InlineKeyboard()
      .text("✅ Tasdiqlash", `confirm_purchase_${starsToPurchase}`)
      .text("❌ Bekor qilish", "cancel_purchase");

    await ctx.reply(
      `💸 ${starsToPurchase} stars purchase qilmoqchisiz. Tasdiqlaysizmi?`,
      { reply_markup: keyboard }
    );
    ctx.session.pendingPurchase = { stars: starsToPurchase };
    ctx.session.state = "awaiting_purchase_confirmation";
  } catch (error) {
    console.error("Purchase boshlashda xato:", error);
    await ctx.reply("❌ Xato yuz berdi. Keyinroq urinib ko'ring.");
  }
}

export async function confirmPurchase(
  ctx: any,
  userId: string,
  starsToPurchase: number
): Promise<void> {
  try {
    const referral = await Referral.findOne({ userId });
    if (!referral || referral.totalStars < starsToPurchase) {
      await ctx.reply("❌ Yetarli stars yo'q yoki referral topilmadi.");
      return;
    }
    await ctx.deleteMessage();

    // Order yaratish
    const order = await Order.create({
      userId,
      productId: starsToPurchase,
      price: 0, // Price 0, chunki bu stars bilan to'lanadi
      status: "pending",
      createdAt: new Date(),
      isPurchase: true, // Yangi field: purchase ekanligini belgilash
    });

    const keyboard = new InlineKeyboard()
      .text("✅ Tasdiqlash", `confirm_${order._id}`)
      .text("❌ Rad etish", `deny_${order._id}`);

    const user = await User.findOne({ telegramId: userId });
    const safeName = user
      ? escapeHTML(user.firstName || "Foydalanuvchi")
      : "Foydalanuvchi";

    // Admin kanaliga xabar yuborish (rasmsiz)
    const msg = await bot.api.sendMessage(
      process.env.CHECK_PAYMENT!,
      `🧾 Yangi purchase so'rovi!\n\n` +
        `👤 User: <a href="tg://user?id=${userId}">${safeName}</a>\n` +
        `⭐ Stars: ${starsToPurchase}\n` +
        `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
        `📌 Holati: ⏳ Kutilmoqda`,
      {
        parse_mode: "HTML",
        reply_markup: keyboard,
      }
    );

    order.channelMessageId = msg.message_id;
    await order.save();

    await ctx.reply(
      `━━━━━━━━━━━━━━━\n✅ So'rov qabul qilindi\n━━━━━━━━━━━━━━━\n\n👨‍💻 Administrator tekshirilmoqda.\n⏳ Tez orada javob olasiz.`
    );

    ctx.session.state = null;
    ctx.session.pendingPurchase = null;
  } catch (error) {
    console.error("Purchase tasdiqlashda xato:", error);
    await ctx.reply("❌ Xato yuz berdi. Keyinroq urinib ko'ring.");
  }
}
