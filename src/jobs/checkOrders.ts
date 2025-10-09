import { Order } from "../models/Order";
import { getOrderStatus, addOrder, getBalance } from "../services/smmService";
import { bot } from "../index";
import { User } from "../models/User";
import { escapeHTML } from "../utils/escapeHTML";

const REVIEW_CHANNEL = process.env.CHANNEL_IDS!;
const CHANNEL_LOG = process.env.CHANNEL_LOG!;
export const CHECK_INTERVAL = 10 * 1000;
const RETRY_INTERVAL = 30 * 60 * 1000; // 30 daqiqa

export async function checkPendingOrders() {
  try {
    const confirmedOrders = await Order.find({
      status: "confirmed",
      apiOrderId: { $exists: true },
    });

    for (const order of confirmedOrders) {
      if (!order.apiOrderId) {
        continue;
      }
      const res = await getOrderStatus(order.apiOrderId);

      if (!res || !res.status) {
        continue;
      }

      if (res.status === "Completed") {
        order.status = "completed";
        order.lastCheck = new Date();
        await order.save();
        const totalConfirmed = await Order.countDocuments({
          status: "confirmed",
        });
        const buyer = await User.findOne({ telegramId: order.userId });
        const safeName = escapeHTML(buyer?.firstName || "Foydalanuvchi");
        await bot.api.sendMessage(
          REVIEW_CHANNEL,
          `✅ Buyurtma #N${totalConfirmed + 59}\n` +
            `👤 Foydalanuvchi: ${safeName}\n` +
            `⭐️ Stars: ${order.productId}\n` +
            `💵 Narx: ${order.price} so‘m`,
          { parse_mode: "HTML" }
        );

        await bot.api.sendMessage(
          order.userId,
          `🎉 Buyurtmangiz muvaffaqiyatli yakunlandi!\n⭐️ Sizning yulduzlaringiz hisobingizga tushirildi!`
        );
      } else if (res.status === "Canceled") {
        order.status = "retrying";
        order.lastCheck = new Date();
        await order.save();
        const balance = await getBalance();
        await bot.api.sendMessage(
          CHANNEL_LOG,
          `⚠️ Xizmat hozircha ishlamayapti.\n ${balance}`
        );
      }
    }

    // Faqat retrying buyurtmalarni tekshirish
    const retryingOrders = await Order.find({ status: "retrying" });
    for (const order of retryingOrders) {
      if (
        order.lastCheck &&
        Date.now() - order.lastCheck.getTime() < RETRY_INTERVAL
      ) {
        continue;
      }

      try {
        // Retrydan oldin balansni aniq tekshirish
        const balanceInfo = await getBalance();
        const requiredBalance = order.productId * 0.015;

        if (parseFloat(balanceInfo.balance) < requiredBalance) {
          console.error(
            `Balans yetarli emas: Buyurtma #${order._id} uchun ${requiredBalance} USD kerak, hozirda ${balanceInfo.balance} USD`
          );
          await bot.api.sendMessage(
            process.env.ADMIN!,
            `⚠️ Balans yetarli emas: Buyurtma #${order._id} uchun ${requiredBalance} USD kerak, hozirda ${balanceInfo.balance} USD`
          );
          order.lastCheck = new Date();
          await order.save();
          continue;
        }
        const user = await User.findOne({ telegramId: order.userId });
        const username = user?.username || `mikionatsu`;

        const retryRes = await addOrder(
          467,
          order.link || `@${username}`,
          order.productId
        );
        if (retryRes.order) {
          order.apiOrderId = retryRes.order;
          order.status = "confirmed";
          order.lastCheck = new Date();
          await order.save();

          await bot.api.sendMessage(
            CHANNEL_LOG,
            `♻️ Buyurtma #${order._id} qayta yuborildi (API order: ${retryRes.order})`
          );
          await bot.api.sendMessage(
            order.userId,
            `Buyurtmangiz qayta tasdiqlandi, xizmatlar tez orada hisobingizga tushadi.`
          );
        } else {
          throw new Error("API order ID qaytmadi");
        }
      } catch (err) {
        console.error(`❌ Retrying xato (Order #${order._id}):`, err);
        await bot.api.sendMessage(
          CHANNEL_LOG,
          `⚠️ Retrying xatosi: Buyurtma #${order._id}\nXato: ${err}`
        );
        order.lastCheck = new Date();
        await order.save();
      }
    }
  } catch (err) {
    console.error("❌ Buyurtma tekshirishda xato:", err);
    await bot.api.sendMessage(
      process.env.ADMIN!,
      `⚠️ CheckPendingOrders xatosi: ${err}`
    );
  }
}

setInterval(checkPendingOrders, CHECK_INTERVAL);
