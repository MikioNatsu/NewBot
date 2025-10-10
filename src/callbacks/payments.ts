// src/callbacks/payments.ts
import { MyContext } from "../types";
import { Order } from "../models/Order";
import { InlineKeyboard } from "grammy";
import { User } from "../models/User";
import { Referral } from "../models/Referral";
import { escapeHTML } from "../utils/escapeHTML";
import { addOrder, getBalance } from "../services/smmService";
import * as dotenv from "dotenv";

dotenv.config();

const CHANNEL_ID = process.env.CHECK_PAYMENT as string;
const REVIEW_CHANNEL = process.env.CHANNEL_IDS as string;
const ADMIN_ID = process.env.ADMIN as string;

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

    if (order.channelMessageId) {
      try {
        if (order.isPurchase) {
          // For purchase orders, use editMessageText since it's a text message
          await ctx.api.editMessageText(
            CHANNEL_ID,
            order.channelMessageId,
            `🧾 Purchase tekshirildi!\n\n` +
              `👤 User: ${buyerLink}\n` +
              `⭐ Stars: ${order.productId}\n` +
              `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
              `📌 Holati: ${statusText}`,
            {
              parse_mode: "HTML",
            }
          );
        } else {
          // For regular orders, use editMessageCaption for photo messages
          await ctx.api.editMessageCaption(CHANNEL_ID, order.channelMessageId, {
            caption:
              `🧾 Buyurtma tekshirildi!\n\n` +
              `👤 User: ${buyerLink}\n` +
              `⭐ Stars: ${order.productId}\n` +
              `💵 Narx: ${order.price} so‘m\n` +
              `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
              `📌 Holati: ${statusText}`,
            parse_mode: "HTML",
          });
        }
      } catch (err) {
        console.error(`editMessage xatosi (Order #${order._id}):`, err);
        await ctx.api.sendMessage(
          ADMIN_ID,
          `⚠️ editMessage xatosi: Order #${order._id}\nXato: ${err}`
        );
        // Fallback: send a new message
        await ctx.api.sendMessage(
          CHANNEL_ID,
          `🧾 ${order.isPurchase ? "Purchase" : "Buyurtma"} tekshirildi!\n\n` +
            `👤 User: ${buyerLink}\n` +
            `⭐ Stars: ${order.productId}\n` +
            (order.isPurchase ? `` : `💵 Narx: ${order.price} so‘m\n`) +
            `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
            `📌 Holati: ${statusText}`,
          { parse_mode: "HTML" }
        );
      }
    } else {
      console.warn(`Order ${order._id} uchun channelMessageId topilmadi`);
      await ctx.api.sendMessage(
        ADMIN_ID,
        `⚠️ Order ${order._id} uchun channelMessageId topilmadi`
      );
      await ctx.api.sendMessage(
        CHANNEL_ID,
        `🧾 ${order.isPurchase ? "Purchase" : "Buyurtma"} tekshirildi!\n\n` +
          `👤 User: ${buyerLink}\n` +
          `⭐ Stars: ${order.productId}\n` +
          (order.isPurchase ? `` : `💵 Narx: ${order.price} so‘m\n`) +
          `📅 ${new Date().toLocaleString("uz-UZ")}\n` +
          `📌 Holati: ${statusText}`,
        { parse_mode: "HTML" }
      );
    }

    if (status === "confirmed") {
      try {
        if (order.isPurchase) {
          // Purchase uchun stars ayirish
          const referral = await Referral.findOne({ userId: order.userId });
          if (referral && referral.totalStars >= order.productId) {
            referral.totalStars -= order.productId;
            await referral.save();
          } else {
            throw new Error("Yetarli stars yo'q");
          }
        }

        // API request for both purchase and regular orders
        const balanceInfo = await getBalance();
        const requiredBalance = order.productId * 0.015;
        if (parseFloat(balanceInfo.balance) < requiredBalance) {
          await ctx.api.sendMessage(
            ADMIN_ID,
            `⚠️ Balans yetarli emas! ${
              order.isPurchase ? "Purchase" : "Buyurtma"
            } #${orderId} yuborilmadi. Balans: ${
              balanceInfo.balance
            } USD, kerak: ${requiredBalance} USD`
          );
          await ctx.api.sendMessage(
            order.userId,
            `❌ Servisda xatolik yuz berdi, tez orada hisobingiz to'ldiriladi.`
          );
          order.status = "retrying";
          order.lastCheck = new Date();
          await order.save();
          return ctx.answerCallbackQuery({
            text: "❌ Xatolik yuz berdi! Retrying ga o'tkazildi.",
          });
        }

        const apiRes = await addOrder(
          467,
          buyer?.username ? `@${buyer.username}` : `${buyer?.telegramId}`,
          order.productId
        );

        console.log("✅ SMM API javobi:", apiRes);

        if (apiRes.order) {
          order.apiOrderId = apiRes.order;
          order.lastCheck = new Date();
          await order.save();
        } else {
          throw new Error("API order ID topilmadi");
        }

        await ctx.api.sendMessage(
          order.userId,
          `✅ ${
            order.isPurchase
              ? `${order.productId} stars purchase`
              : "Buyurtmangiz"
          } tasdiqlandi, xizmatlar tez orada hisobingizga tushadi.`
        );

        if (!order.isPurchase) {
          const totalConfirmed = await Order.countDocuments({
            status: "confirmed",
          });

          await ctx.api.sendMessage(
            REVIEW_CHANNEL,
            `✅ Buyurtma #N${totalConfirmed + 59}\n` +
              `👤 Foydalanuvchi: ${safeName}\n` +
              `⭐ Stars: ${order.productId}\n` +
              `💵 Narx: ${order.price} so‘m`,
            { parse_mode: "HTML" }
          );
        }

        return ctx.answerCallbackQuery({ text: "✅ Buyurtma tasdiqlandi" });
      } catch (apiErr) {
        console.error("❌ API yoki purchase xatosi:", apiErr);
        await ctx.api.sendMessage(
          ADMIN_ID,
          `⚠️ ${
            order.isPurchase ? "Purchase" : "API"
          } xatosi!\n\nOrderID: ${orderId}\nUser: ${buyerLink}\nXato: ${apiErr}`,
          {
            parse_mode: "HTML",
          }
        );
        await ctx.api.sendMessage(
          order.userId,
          `❌ Servisda xatolik yuz berdi. Keyinroq urinib ko'ring.`
        );
        order.status = "retrying";
        order.lastCheck = new Date();
        await order.save();
        return ctx.answerCallbackQuery({
          text: "❌ Xatolik yuz berdi",
          show_alert: true,
        });
      }
    }

    await ctx.api.sendMessage(order.userId, `❌ So‘rovingiz qabul qilinmadi.`, {
      reply_markup: new InlineKeyboard().text("🏠 Menyu", "back"),
    });

    return ctx.answerCallbackQuery({ text: "❌ Buyurtma rad etildi!" });
  } catch (error) {
    console.error("Payment update error:", error);
    await ctx.api.sendMessage(ADMIN_ID, `⚠️ Payment update xatosi: ${error}`);
    return ctx.answerCallbackQuery({
      text: "❌ Xatolik yuz berdi",
      show_alert: true,
    });
  }
}

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
