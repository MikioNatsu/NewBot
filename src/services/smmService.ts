import axios from "axios";
import qs from "qs";
import { bot } from "../index";

const API_URL = process.env.SMM_API_URL!;
const API_KEY = process.env.SMM_API_KEY!;
const ADMIN_ID = process.env.ADMIN!;

// 🔹 API ga POST so‘rov yuboruvchi helper
async function smmRequest(params: Record<string, any>) {
  try {
    const payload = qs.stringify({ key: API_KEY, ...params });
    const { data } = await axios.post(API_URL, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return data;
  } catch (err: any) {
    const details = err.response?.data || err.message;

    await bot.api.sendMessage(
      ADMIN_ID,
      `⚠️ SMM Service xatoligi!\n\n📌 Context: ${
        params.action
      }\n\n❌ Tafsilot: <pre>${JSON.stringify(details, null, 2)}</pre>`,
      { parse_mode: "HTML" }
    );

    throw err;
  }
}

// 🔹 Adminni balans haqida xabardor qilish
async function notifyAdminBalance(context: string) {
  try {
    const balanceInfo = await getBalance();
    await bot.api.sendMessage(
      ADMIN_ID,
      `✅ Buyurtma muvaffaqiyatli!\n\n📌 Context: ${context}\n💰 Balans: ${balanceInfo.balance} ${balanceInfo.currency}`
    );
  } catch (err: any) {
    await bot.api.sendMessage(
      ADMIN_ID,
      `⚠️ Balansni olishda muammo!\n\n📌 Context: ${context}\n❌ Tafsilot: <pre>${err.message}</pre>`,
      { parse_mode: "HTML" }
    );
  }
}

// 🔹 Buyurtma qo‘shish
export async function addOrder(
  serviceId: number,
  link: string,
  quantity: number,
  extra: Record<string, any> = {}
) {
  const result = await smmRequest({
    action: "add",
    service: serviceId,
    link,
    quantity,
    ...extra, // runs, interval, comments va hok.
  });

  // ✅ Muvaffaqiyatli bo‘lsa balansni tekshiramiz
  await notifyAdminBalance("add");

  return result;
}

// 🔹 Buyurtma statusini olish
export async function getOrderStatus(orderId: number) {
  return smmRequest({ action: "status", order: orderId });
}

// 🔹 Bir nechta order status
export async function getMultiStatus(orderIds: number[]) {
  return smmRequest({ action: "status", orders: orderIds.join(",") });
}

// 🔹 Xizmatlar ro‘yxati
export async function getServices() {
  return smmRequest({ action: "services" });
}

// 🔹 Balansni tekshirish
export async function getBalance() {
  return smmRequest({ action: "balance" });
}

// 🔹 Refill qilish
export async function refillOrder(orderId: number) {
  return smmRequest({ action: "refill", order: orderId });
}

// 🔹 Ko‘p order refill
export async function multiRefill(orderIds: number[]) {
  return smmRequest({ action: "refill", orders: orderIds.join(",") });
}

// 🔹 Refill status
export async function refillStatus(refillId: number) {
  return smmRequest({ action: "refill_status", refill: refillId });
}

// 🔹 Ko‘p refill status
export async function multiRefillStatus(refillIds: number[]) {
  return smmRequest({ action: "refill_status", refills: refillIds.join(",") });
}

// 🔹 Cancel orders
export async function cancelOrders(orderIds: number[]) {
  return smmRequest({ action: "cancel", orders: orderIds.join(",") });
}
