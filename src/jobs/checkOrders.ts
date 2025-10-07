import { Order } from "../models/Order";
import { getOrderStatus, addOrder, getBalance } from "../services/smmService";
import { bot } from "../index";
import { User } from "../models/User";

const REVIEW_CHANNEL = process.env.CHANNEL_IDS!;
const CHANNEL_LOG = process.env.CHANNEL_LOG!;
export const CHECK_INTERVAL = 10 * 1000;
const RETRY_INTERVAL = 30 * 60 * 1000; // 30 daqiqa

export async function checkPendingOrders() {
  console.log("checkPendingOrders ishga tushdi");
  try {
    const confirmedOrders = await Order.find({
      status: "confirmed",
      apiOrderId: { $exists: true },
    });
    console.log("Confirmed orders topildi:", confirmedOrders.length);

    for (const order of confirmedOrders) {
      if (!order.apiOrderId) {
        console.log(
          `Order #${order._id} da apiOrderId mavjud emas, o‘tkazib yuborildi`
        );
        continue;
      }
      console.log(`Tekshirilayotgan confirmed order: #${order._id}`);
      const res = await getOrderStatus(order.apiOrderId);

      if (!res || !res.status) {
        console.log(`Order #${order._id} uchun status olingmadi`);
        continue;
      }

      if (res.status === "Completed") {
        order.status = "completed";
        order.lastCheck = new Date();
        await order.save();

        await bot.api.sendMessage(
          REVIEW_CHANNEL,
          `✅ Buyurtma #${order._id} yakunlandi!\n⭐️ Stars: ${order.productId}`,
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
    console.log("Retrying orders found:", retryingOrders.length);
    for (const order of retryingOrders) {
      console.log(
        `Tekshirilayotgan retrying order: #${order._id}, userId: ${order.userId}`
      );
      if (
        order.lastCheck &&
        Date.now() - order.lastCheck.getTime() < RETRY_INTERVAL
      ) {
        console.log(
          `Order #${order._id} hali 1 daqiqadan kam vaqt oldin tekshirilgan`
        );
        continue;
      }

      console.log(`Retrying order #${order._id} uchun jarayon boshlandi`);
      try {
        // Retrydan oldin balansni aniq tekshirish
        const balanceInfo = await getBalance();
        console.log(`getBalance natijasi:`, balanceInfo);
        const requiredBalance = order.productId * 0.015;
        console.log(
          `Balans: ${balanceInfo.balance} USD, kerak: ${requiredBalance} USD`
        );
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
        console.log(
          `addOrder chaqirilmoqda: serviceId=467, link=${
            order.link || `@${username}`
          }, quantity=${order.productId}`
        );
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
console.log("setInterval boshlandi");
