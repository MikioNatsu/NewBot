import { MyContext } from "../types";
import { Order } from "../models/Order";
import { InlineKeyboard } from "grammy";
import { User } from "../models/User";
import { escapeHTML } from "../utils/escapeHTML";
import { addOrder } from "../services/smmService"; // 🔹 API ulash
import * as dotenv from "dotenv";

dotenv.config();

const CHANNEL_ID = process.env.CHECK_PAYMENT as string;
const REVIEW_CHANNEL = process.env.CHANNEL_IDS as string;

// 🔹 Umumiy helper
async function handlePaymentUpdate(
  ctx: MyContext,
  orderId: string,
  status: "confirmed" | "denied"
) {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return ctx.answerCallbackQuery({
        text: "❌ Buyurtma topilmadi",
        show_alert: true,
      });
    }

    order.status = status;
    await order.save();

    const buyer = await User.findOne({ telegramId: order.userId });
    const safeName = escapeHTML(buyer?.firstName || "Foydalanuvchi");
    const buyerLink = buyer
      ? `<a href="tg://user?id=${order.userId}">${safeName}</a>`
      : `ID: ${order.userId}`;

    const statusText =
      status === "confirmed" ? "✅ Tasdiqlangan" : "🚫 Rad etilgan";

    // 🔹 Kanaldagi xabarni yangilash
    if (order.channelMessageId) {
      await ctx.api.editMessageCaption(CHANNEL_ID, order.channelMessageId, {
        caption:
          `🧾 Buyurtma tekshirildi!\n\n👤 User: ${buyerLink}\n` +
          `⭐️ Stars: ${order.productId}\n💵 Narx: ${order.price} so‘m\n` +
          `💲 USD: ${order.productId * 0.015}\n` +
          `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
          `📌 Holati: ${statusText}`,
        parse_mode: "HTML",
      });
    }

    // 🔹 Tasdiqlangan bo‘lsa
    if (status === "confirmed") {
      const totalConfirmed = await Order.countDocuments({
        status: "confirmed",
      });

      // ✅ API ga yuborish
      try {
        const apiRes = await addOrder(
          Number(467), // productId = serviceId
          buyer?.username ? `@${buyer.username}` : `${buyer?.telegramId}`, // link
          order.productId || 1
        );

        console.log("✅ SMM API javobi:", apiRes);

        // API orderId bazaga saqlash
        if (apiRes.order) {
          order.apiOrderId = apiRes.order;
          await order.save();
        }
      } catch (apiErr) {
        console.error("❌ API ga yuborishda xato:", apiErr);
        await ctx.api.sendMessage(
          process.env.ADMIN!,
          `⚠️ API ga yuborishda xato!\n\nOrderID: ${orderId}\nUser: ${buyerLink}\nXato: ${apiErr}`
        );
      }

      // ✅ REVIEW kanaliga chiqishi
      await ctx.api.sendMessage(
        REVIEW_CHANNEL,
        `✅ Buyurtma (TEST): #N${totalConfirmed + 47}\n` +
          `👤 Foydalanuvchi: ${safeName}\n` +
          `⭐️ Stars: ${order.productId}\n` +
          `💵 Narx: ${order.price} so‘m`,
        { parse_mode: "HTML" }
      );

      // ✅ Foydalanuvchiga xabar
      await ctx.api.sendMessage(
        order.userId,
        `━━━━━━━━━━━━━━━
✅ 𝗕𝘂𝘆𝘂𝗿𝘁𝗺𝗮 𝘁𝗮𝘀𝗱𝗶𝗾𝗹𝗮𝗻𝗱𝗶!
━━━━━━━━━━━━━━━

🔖 Buyurtma raqami: #${orderId}  
⏳ Xizmatlaringiz 2 daqiqa ichida hisobingizga tushadi.  

🎉 Rahmat, bizni tanlaganingiz uchun!`
      );

      return ctx.answerCallbackQuery({ text: "✅ Buyurtma tasdiqlandi" });
    }

    // 🔹 Rad etilgan bo‘lsa
    await ctx.api.sendMessage(
      order.userId,
      `━━━━━━━━━━━━━━━
❌ 𝗕𝘂𝘆𝘂𝗿𝘁𝗺𝗮 𝗿𝗮𝗱 𝗲𝘁𝗶𝗹𝗱𝗶!
━━━━━━━━━━━━━━━

🔖 Buyurtma raqami: #${orderId}  
❗️ Sabab: To‘lov tasdiqlanmadi yoki noto‘g‘ri chek yuborildi.  

🔄 Iltimos, to‘lovni qaytadan amalga oshiring.`,
      {
        reply_markup: new InlineKeyboard().text("🏠 Menyu", "back"),
      }
    );

    return ctx.answerCallbackQuery({ text: "❌ Buyurtma rad etildi!" });
  } catch (error) {
    console.error("Payment update error:", error);
    return ctx.answerCallbackQuery({
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

// 🔹 Callback handlerlar
export const confirmPayment = async (ctx: MyContext) => {
  if (!ctx.match)
    return ctx.answerCallbackQuery({
      text: "❌ Noto‘g‘ri buyruq.",
      show_alert: true,
    });

  return handlePaymentUpdate(ctx, ctx.match[1], "confirmed");
};

export const denyPayment = async (ctx: MyContext) => {
  if (!ctx.match)
    return ctx.answerCallbackQuery({
      text: "❌ Noto‘g‘ri buyruq.",
      show_alert: true,
    });

  return handlePaymentUpdate(ctx, ctx.match[1], "denied");
};
