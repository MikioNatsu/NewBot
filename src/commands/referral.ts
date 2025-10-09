import { InlineKeyboard } from "grammy";
import { MyContext } from "../types";
import { Referral } from "../models/Referral";
import { User } from "../models/User";
import {
  checkSubscription,
  getSubscriptionMessage,
  getSubscriptionButtons,
} from "../utils/checkSubscription";
import { addReferral, showReferralEarnings } from "../services/referralService";

export async function referralHandler(ctx: MyContext) {
  try {
    if (!ctx.from) return ctx.reply("⚠️ Telegram ID topilmadi.");

    // 1️⃣ Obuna tekshiruvi
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
      const message = `⚠️ Iltimos, quyidagi kanallarga obuna bo'ling:\n${await getSubscriptionMessage()}`;
      return ctx.reply(message, {
        reply_markup: await getSubscriptionButtons(),
      });
    }

    const userId = ctx.from.id.toString();
    const data = ctx.callbackQuery?.data;

    // 2️⃣ Referral ma'lumotlari
    await addReferral(userId);
    const botUsername = (await ctx.api.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${userId}`;
    const statsMessage = await showReferralEarnings(userId);

    // Asosiy xabar
    const mainMessage = `
🌟 <b>Do‘stlaringizni taklif qiling — bonuslar oling!</b>

📨 Sizning referal havolangiz:
<code>${referralLink}</code>

${statsMessage}

🎯 <b>Bonus darajalari:</b>
▫️ 10 ta do‘st — <b>15%</b> bonus  
▫️ 50 ta do‘st — <b>30%</b> bonus  
▫️ 100 ta do‘st — <b>70%</b> bonus  
▫️ 500 ta do‘st — <b>95%</b> bonus 🎁
`;

    // 3️⃣ TOP 10 xabar
    let topListMessage = "";
    // TOP 10
    if (data === "referral_top") {
      const topReferrals = await Referral.aggregate([
        { $addFields: { referralsCount: { $size: "$referrals" } } },
        { $sort: { referralsCount: -1 } },
        { $limit: 10 },
      ]);

      let topListMessage = "";
      if (topReferrals.length > 0) {
        const topUsers = await Promise.all(
          topReferrals.map(async (ref) => {
            const user = await User.findOne({ telegramId: ref.userId });
            return {
              name: user?.username
                ? "@" + user.username
                : user?.firstName || "Noma’lum foydalanuvchi",
              referralsCount: ref.referralsCount,
            };
          })
        );

        topListMessage = "🏆 <b>TOP 10 Yulduz Taklifchilar</b>\n\n";
        topUsers.forEach((u, i) => {
          const medals = ["🥇", "🥈", "🥉"];
          const medal = medals[i] || `${i + 1}.`;
          topListMessage += `${medal} <b>${u.name}</b> — ${u.referralsCount} ta 💫\n`;
        });
      } else {
        topListMessage = "🌙 Hozircha TOP 10 ro‘yxatida hech kim yo‘q.";
      }

      const topKeyboard = new InlineKeyboard().text("🔙 Orqaga", "back");

      // FOTO xabar uchun editMessageCaption ishlatiladi
      try {
        await ctx.editMessageCaption({
          caption: topListMessage,
          parse_mode: "HTML",
          reply_markup: topKeyboard,
        });
      } catch (err) {
        console.warn("TOP 10 xabarini yangilashda xatolik:", err);
      }
      return;
    }

    // 4️⃣ "Back" tugmasi bosilganda asosiy xabar
    if (data === "referral_back") {
      const mainKeyboard = new InlineKeyboard()
        .text("🔝 Top 10", "referral_top")
        .row()
        .text("📊 Statistikani yangilash", "referral_stats");

      try {
        await ctx.editMessageCaption({
          caption: mainMessage,
          parse_mode: "HTML",
          reply_markup: mainKeyboard,
        });
      } catch {
        await ctx.reply(mainMessage, {
          parse_mode: "HTML",
          reply_markup: mainKeyboard,
        });
      }
      return;
    }

    // 5️⃣ Statistikani yangilash tugmasi bosilganda
    if (data === "referral_stats") {
      try {
        await ctx.deleteMessage();
      } catch (err) {
        console.warn("Eski xabarni o‘chirishda xatolik:", err);
      }

      const keyboard = new InlineKeyboard()
        .text("🔝 Top 10", "referral_top")
        .row()
        .text("📊 Statistikani yangilash", "referral_stats");

      await ctx.replyWithPhoto(
        "AgACAgIAAxkBAAIEOmjmr1_gcQOwo5gBCQPnOdHVQLT2AAIu9zEbRTowS_2zuy4XOh51AQADAgADeQADNgQ",
        {
          caption: mainMessage,
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );
      return;
    }

    // 6️⃣ Agar bu command (/referral) bo‘lsa
    const mainKeyboard = new InlineKeyboard()
      .text("🔝 Top 10", "referral_top")
      .row()
      .text("📊 Statistikani yangilash", "referral_stats");

    await ctx.replyWithPhoto(
      "AgACAgIAAxkBAAIEOmjmr1_gcQOwo5gBCQPnOdHVQLT2AAIu9zEbRTowS_2zuy4XOh51AQADAgADeQADNgQ",
      {
        caption: mainMessage,
        parse_mode: "HTML",
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    console.error("Referral handler xato:", error);
    if (ctx.callbackQuery)
      await ctx.answerCallbackQuery({
        text: "❌ Xatolik yuz berdi. Keyinroq urinib ko‘ring.",
        show_alert: true,
      });
    else await ctx.reply("❌ Xatolik yuz berdi, keyinroq urinib ko‘ring.");
  }
}
