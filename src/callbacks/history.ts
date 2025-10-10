import { InlineKeyboard } from "grammy";
import { Order } from "../models/Order";
import { User } from "../models/User";
import { MyContext } from "../types";

export const history = async (ctx: MyContext) => {
  const user = await User.findOne({ telegramId: ctx.from?.id });

  if (!user) {
    return ctx.reply(
      "⚠️ Siz hali ro‘yxatdan o‘tmagansiz.\nIltimos, /start buyrug‘ini bosing."
    );
  }

  const orders = await Order.find({ userId: ctx.from?.id });

  const historyKeyboard = new InlineKeyboard().text("⬅️ Orqaga", "profile").text("🏠 Menyu", "back");

  if (!orders.length) {
    return ctx.editMessageCaption({
      caption: `
      ━━━━━━━━━━━━━━━
⚠️ 𝗛𝗼𝘇𝗶𝗿𝗰𝗵𝗮 𝗯𝘂𝘆𝘂𝗿𝘁𝗺𝗮 𝘁𝗮𝗽𝗶𝗹𝗺𝗮𝗱𝗶 ❌
━━━━━━━━━━━━━━━

🛍 Siz hali buyurtma qilmagansiz.  
✨ Istasangiz, hoziroq yangi buyurtma berishingiz mumkin.  
`,
      reply_markup: historyKeyboard,
    });
  }

  const historyText = orders
    .reverse()
    .slice(0, 5)
    .map(
      (order) =>
        `🆔 *ID*: ${order._id}
🛍 *Mahsulot*: ${order.productId}
💵 *Narxi*: ${order.price} so'm
🕒 *Sotib olingan vaqt*: ${order.createdAt!.toLocaleString("uz-UZ")}
📌 *Holati*: ${
          order.status === "pending"
            ? "⏳ Kutilmoqda"
            : order.status === "confirmed"
            ? "✅ Tasdiqlangan"
            : "🚫 Rad etilgan"
        }`
    )
    .join("\n✦ ━ ━ ━━━━━━━━━ ━\n");
  return ctx.editMessageCaption({
    caption: `📋 *Oxirgi 5 ta buyurtmalar:*

${historyText}

━━━━━━━━━━━━━━━
📊 *Statistika:*
🌐 Jami buyurtmalar: *${orders.length}*
✅ Tasdiqlangan: *${orders.filter((o) => o.status === "confirmed").length}*
🚫 Rad etilgan: *${orders.filter((o) => o.status === "denied").length}*
⌛️ Kutilmoqda: *${orders.filter((o) => o.status === "pending").length}*
━━━━━━━━━━━━━━━

✨ Rahmat! Xizmatdan foydalanishda davom eting.`,
    parse_mode: "Markdown",
    reply_markup: historyKeyboard,
  });
};
