// src/utils/checkSubscription.ts (yaxshilangan: caching va error handling qo'shilgan)
import { MyContext } from "../types";
import { bot } from "../index";
import { SubscriptionChannel } from "../models/SubscriptionChannel";
import { getCache, setCache } from "./cache"; // Agar cache mavjud bo'lsa, ishlatiladi; aks holda qo'shing

export async function checkSubscription(ctx: MyContext): Promise<boolean> {
  const userId = ctx.from!.id.toString();
  const cacheKey = `sub_${userId}`;
  const cached = getCache<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const channels = await SubscriptionChannel.find({});
    if (channels.length === 0) {
      setCache(cacheKey, true, 300000); // 5 min cache
      return true;
    }

    for (const channel of channels) {
      try {
        const member = await bot.api.getChatMember(
          channel.channelId,
          ctx.from!.id
        );
        if (!["member", "administrator", "creator"].includes(member.status)) {
          setCache(cacheKey, false, 60000); // 1 min cache for false
          return false;
        }
      } catch (err) {
        console.error(`Kanal ${channel.channelId} tekshiruvda xato:`, err);
        // Agar kanal topilmasa, adminni ogohlantirish
        await bot.api.sendMessage(
          process.env.ADMIN!,
          `⚠️ Kanal ${channel.channelName} (${channel.channelId}) topilmadi yoki xato!`
        );
        return false;
      }
    }
    setCache(cacheKey, true, 300000);
    return true;
  } catch (error) {
    console.error("Obunani tekshirishda umumiy xato:", error);
    return false;
  }
}

export async function getSubscriptionMessage(): Promise<string> {
  const channels = await SubscriptionChannel.find({});
  return channels.length > 0
    ? channels.map((ch) => `📢 ${ch.channelName} (${ch.channelId})`).join("\n")
    : "Hali majburiy kanallar qo'shilmagan.";
}

export async function getSubscriptionButtons(): Promise<any> {
  const channels = await SubscriptionChannel.find({});
  const inlineKeyboard = channels.map((ch) => [
    {
      text: `📢 ${ch.channelName} ga obuna bo'lish`,
      url: `https://t.me/${ch.channelName.slice(1)}`,
    },
  ]);
  return { inlineKeyboard };
}
