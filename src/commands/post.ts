import { MyContext } from "../types";
import { Donate } from "../models/Donate"; // 📌 DB model
import { bot } from "../index";
const ADMIN = process.env.ADMIN as string;
const POST_CHANNEL = -1002832062191;

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
  if (ctx.from?.id !== parseInt(ADMIN)) {
    return ctx.reply("⚠️ Sizda admin rol qabul qilmagansiz!");
  }

  ctx.session.state = "awaiting_donate_user";
  ctx.session.pendingDonate = {};
  await ctx.reply("👤 Donat kim tomonidan?");
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
