// src/services/smmService.ts
import axios from "axios";
import qs from "qs";
import { bot } from "../index";
import "dotenv/config";

const API_URL = process.env.SMM_API_URL!;
const API_KEY = process.env.SMM_API_KEY!;
const ADMIN_ID = process.env.ADMIN!;

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

export async function addOrder(
  serviceId: number,
  link: string,
  quantity: number,
  extra: Record<string, any> = {}
) {
  // AddOrder dan oldin balansni tekshirish
  const balanceInfo = await getBalance();
  if (parseFloat(balanceInfo.balance) < quantity * 0.015) {
    // Taxminiy narx hisobi (0.015 USD per star)
    throw new Error("Balans yetarli emas! Buyurtma yuborilmadi.");
  }

  const result = await smmRequest({
    action: "add",
    service: serviceId,
    link,
    quantity,
    ...extra,
  });

  await notifyAdminBalance("add");

  return result;
}

export async function getOrderStatus(orderId: number) {
  return smmRequest({ action: "status", order: orderId });
}

export async function getMultiStatus(orderIds: number[]) {
  return smmRequest({ action: "status", orders: orderIds.join(",") });
}

export async function getServices() {
  return smmRequest({ action: "services" });
}

export async function getBalance() {
  const result = await smmRequest({ action: "balance" });
  console.log("getBalance natijasi:", result);
  return result;
}

export async function refillOrder(orderId: number) {
  return smmRequest({ action: "refill", order: orderId });
}

export async function multiRefill(orderIds: number[]) {
  return smmRequest({ action: "refill", orders: orderIds.join(",") });
}

export async function refillStatus(refillId: number) {
  return smmRequest({ action: "refill_status", refill: refillId });
}

export async function multiRefillStatus(refillIds: number[]) {
  return smmRequest({ action: "refill_status", refills: refillIds.join(",") });
}

export async function cancelOrders(orderIds: number[]) {
  return smmRequest({ action: "cancel", orders: orderIds.join(",") });
}
