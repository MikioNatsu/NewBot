// src/services/referralService.ts (mukammal yangilangan: logging va validation qo'shilgan)
import { Referral } from "../models/Referral";
import { bot } from "../index";
import { User } from "../models/User";

export function calculateBonus(referralCount: number): number {
  if (referralCount >= 500) return 0.95;
  if (referralCount >= 100) return 0.7;
  if (referralCount >= 50) return 0.3;
  if (referralCount >= 10) return 0.15;
  return 0;
}

export async function addReferral(
  userId: string,
  referrerId?: string
): Promise<void> {
  try {
    if (!userId) throw new Error("User ID topilmadi");

    let referral = await Referral.findOne({ userId });
    if (!referral) {
      referral = new Referral({
        userId,
        referrerId,
        referrals: [],
        orders: [],
        bonusPercentage: 0,
        totalEarnings: 0,
      });
      await referral.save();
      console.log(`Yangi referral yaratildi: ${userId}`);
    }

    if (referrerId && referrerId !== userId) {
      const referrer = await Referral.findOne({ userId: referrerId });
      if (referrer && !referrer.referrals.includes(userId)) {
        referrer.referrals.push(userId);
        referrer.bonusPercentage = calculateBonus(referrer.referrals.length);
        await referrer.save();
        console.log(`Referral qo'shildi: ${referrerId} -> ${userId}`);
        // Adminni logging uchun ogohlantirish (optional)
        await bot.api.sendMessage(
          process.env.ADMIN!,
          `🆕 Yangi referral: ${referrerId} taklif qildi ${userId}`
        );
      }
    }
  } catch (error) {
    console.error("Referral qo'shishda xato:", error);
    throw error;
  }
}

export async function recordOrder(
  userId: string,
  productId: number,
  price: number
): Promise<void> {
  try {
    if (price <= 0 || productId <= 0)
      throw new Error("Noto'g'ri buyurtma ma'lumotlari");

    const referral = await Referral.findOne({ referrals: userId });
    if (!referral) return;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    if (referral.createdAt < oneMonthAgo) {
      console.log(`Buyurtma eski: ${userId}`);
      return;
    }

    const existingOrder = referral.orders.find(
      (o) => o.userId === userId && o.productId === productId
    );
    if (existingOrder) {
      console.log(`Takroriy buyurtma: ${userId}`);
      return;
    }

    referral.orders.push({ userId, productId, price, createdAt: new Date() });
    referral.totalEarnings = referral.orders.reduce(
      (sum, order) => sum + order.price * referral.bonusPercentage,
      0
    );
    await referral.save();
    console.log(`Buyurtma qayd qilindi: ${userId} - ${productId} ta`);

    const user = await User.findOne({ telegramId: userId });
    await bot.api.sendMessage(
      referral.userId,
      `🎉 Siz taklif qilgan ${
        user?.firstName || "Foydalanuvchi"
      } ${productId} ta yulduz sotib oldi!`
    );
  } catch (error) {
    console.error("Buyurtma qayd qilishda xato:", error);
  }
}

export async function showReferralEarnings(userId: string): Promise<string> {
  try {
    const targetDate = new Date("2025-11-11");
    const referral = await Referral.findOne({ userId });
    if (!referral) {
      return "❌ Sizda hali referral ma'lumotlari yo'q.";
    }

    let message = `
<b>📊 Sizning referral statistikangiz</b>\n
───────────────────────
👥 <b>Taklif qilingan do‘stlar:</b> ${referral.referrals.length} ta
🎁 <b>Bonus foizi:</b> ${referral.bonusPercentage * 100}%
🛒 <b>Buyurtmalar soni:</b> ${referral.orders.length} ta
───────────────────────

✨ Do‘stlaringizni ko‘proq taklif qiling va bonuslaringizni oshiring!
💸 Har bir yangi foydalanuvchi sizga foyda keltiradi.
`;

    if (new Date() >= targetDate) {
      message += `💸 Umumiy foyda: ${referral.totalEarnings.toLocaleString(
        "uz-UZ"
      )} so'm`;
    } else {
      message += `\n📅 Natijalar 11.11.2025 da e'lon qilinadi!`;
    }

    return message;
  } catch (error) {
    console.error("Statistikani ko'rsatishda xato:", error);
    return "❌ Statistikani ko'rsatishda xato yuz berdi.";
  }
}
