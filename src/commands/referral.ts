// src/commands/referral.ts
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

const mainKeyboard = new InlineKeyboard()
  .text("🏠 Menyu", "back")
  .text("🔝 Top 10", "referral_top")
  .row()
  .text("📊 Yangilash", "referral_stats");

export async function referralHandler(ctx: MyContext) {
  try {
    if (!ctx.from) return ctx.reply("⚠️ Telegram ID topilmadi.");

    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
      const message = `⚠️ Iltimos, quyidagi kanallarga obuna bo'ling:\n${await getSubscriptionMessage()}`;
      return ctx.reply(message, {
        reply_markup: await getSubscriptionButtons(),
      });
    }

    const userId = ctx.from.id.toString();
    const data = ctx.callbackQuery?.data;

    await addReferral(userId);
    const botUsername = (await ctx.api.getMe()).username;
    const referralLink = `https://t.me/${botUsername}?start=${userId}`;
    const statsMessage = await showReferralEarnings(userId);

    const mainMessage = `
🌟 <b>Do‘stlaringizni taklif qiling — stars oling!</b>

📨 Havola:
<code>${referralLink}</code>

🖇 Unikal Havola:
<pre>Assalomu alaykum 🙂
Men yaqinda YulduzBozorBot’dan foydalanishni boshladim — yulduzlarni ancha arzon va bonusli olish mumkin ekan 🌟
Siz ham sinab ko‘ring, har bir taklif uchun yulduz beriladi!
👉 Boshlash: ${referralLink}</pre>

${statsMessage}
`;

    let topListMessage = "";
    if (data === "referral_top") {
      const topReferrals = await Referral.aggregate([
        { $addFields: { referralsCount: { $size: "$referrals" } } },
        { $sort: { referralsCount: -1 } },
        { $limit: 10 },
      ]);

      if (topReferrals.length > 0) {
        const topUsers = await Promise.all(
          topReferrals.map(async (ref) => {
            const user = await User.findOne({ telegramId: ref.userId });
            return {
              name: user?.username
                ? "@" + user.username
                : user?.firstName || "Noma’lum",
              referralsCount: ref.referralsCount,
            };
          })
        );

        topListMessage = "🏆 <b>TOP 10 Taklifchilar</b>\n\n";
        topUsers.forEach((u, i) => {
          const medals = ["🥇", "🥈", "🥉"];
          const medal = medals[i] || `${i + 1}.`;
          topListMessage += `${medal} <b>${u.name}</b> — ${u.referralsCount} ta\n`;
        });
      } else {
        topListMessage = "🌙 Hozircha TOP 10 yo‘q.";
      }

      const topKeyboard = new InlineKeyboard().text(
        "🔙 Orqaga",
        "referral_back"
      );

      try {
        await ctx.editMessageCaption({
          caption: topListMessage,
          parse_mode: "HTML",
          reply_markup: topKeyboard,
        });
      } catch (err) {
        console.warn("TOP 10 xatolik:", err);
      }
      return;
    }

    if (data === "referral_back") {
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

    if (data === "referral_stats") {
      try {
        await ctx.deleteMessage();
      } catch (err) {
        console.warn("O‘chirish xatolik:", err);
      }

      await ctx.replyWithPhoto(
        "AgACAgIAAxkBAAIEOmjmr1_gcQOwo5gBCQPnOdHVQLT2AAIu9zEbRTowS_2zuy4XOh51AQADAgADeQADNgQ",
        {
          caption: mainMessage,
          parse_mode: "HTML",
          reply_markup: mainKeyboard,
        }
      );
      return;
    }

    await ctx.replyWithPhoto(
      "AgACAgIAAxkBAAIEOmjmr1_gcQOwo5gBCQPnOdHVQLT2AAIu9zEbRTowS_2zuy4XOh51AQADAgADeQADNgQ",
      {
        caption: mainMessage,
        parse_mode: "HTML",
        reply_markup: mainKeyboard,
      }
    );
  } catch (error) {
    console.error("Referral xato:", error);
    if (ctx.callbackQuery)
      await ctx.answerCallbackQuery({
        text: "❌ Xatolik. Keyin urinib ko‘ring.",
        show_alert: true,
      });
    else await ctx.reply("❌ Xatolik, keyin urinib ko‘ring.");
  }
}
