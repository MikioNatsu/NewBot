import { MyContext } from "../types";
import { bot } from "../index";
import { SubscriptionChannel } from "../models/SubscriptionChannel";
import { getCache, setCache } from "./cache";
import { InlineKeyboard } from "grammy";

interface CheckSubscriptionOptions {
  force?: boolean;
}

// 🔹 Foydalanuvchi obunani tekshirish
export async function checkSubscription(
  ctx: MyContext,
  options: CheckSubscriptionOptions = {}
): Promise<boolean> {
  const userId = ctx.from!.id;
  const cacheKey = `sub_${userId}`;
  const { force = false } = options;

  if (!force) {
    const cached = getCache<boolean>(cacheKey);
    if (cached !== null) return cached;
  }

  try {
    const channels = await SubscriptionChannel.find({});
    if (channels.length === 0) {
      setCache(cacheKey, true, 300000);
      return true;
    }

    for (const ch of channels) {
      const chatId = ch.channelId.startsWith("-100")
        ? Number(ch.channelId)
        : ch.channelId;

      try {
        const member = await bot.api.getChatMember(chatId, userId);
        if (!["member", "administrator", "creator"].includes(member.status)) {
          setCache(cacheKey, false, 60000);
          return false;
        }
      } catch (err) {
        console.error(`[checkSubscription] Kanal xato: ${ch.channelId}`, err);
        return false;
      }
    }

    setCache(cacheKey, true, 300000);
    return true;
  } catch (error) {
    console.error("[checkSubscription] Umumiy xato:", error);
    return false;
  }
}

// 🔹 Xabar va tugmalar
export async function getSubscriptionMessage(): Promise<string> {
  const channels = await SubscriptionChannel.find({});
  return channels.length
    ? "⚠️ Quyidagi kanallarga obuna bo‘ling:\n\n" +
        channels
          .map((ch) => `📢 <b>${ch.channelName}</b> (${ch.channelId})`)
          .join("\n")
    : "Hozircha majburiy kanallar yo‘q.";
}

export async function getSubscriptionButtons(): Promise<InlineKeyboard> {
  const channels = await SubscriptionChannel.find({});
  const kb = new InlineKeyboard();

  for (const ch of channels) {
    const username = ch.channelName.replace("@", "");
    kb.url(`📢 ${ch.channelName} ga obuna bo‘lish`, `https://t.me/${username}`);
    kb.row();
  }

  kb.text("✅ Obunani tekshirish", "check_subscription");
  return kb;
}
