import "dotenv/config";
import { stars, premium } from "../consts/product";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;

export async function generateAIPost(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5", // Tuzatilgan model nomi
          messages: [
            {
              role: "system",
              content: `
Siz professional Telegram post generatorisiz. Sizning vazifangiz — "YulduzBozor" kanali uchun jozibali, ishonchli va savdoga undovchi post yaratish.

📦 Ma'lumotlar:
- Kanal nomi: <b>YulduzBozor</b>
- Bot: <b>@YulduzBozorBot</b>
- Admin: <b>@MikioNatsu</b>
- Yetkazib berish: 1–5 daqiqa ichida ⚡
- Muvaffaqiyatli buyurtmalar: @YulduzBozor_orders
- To‘lov turi: kartaga tashlab, admin tasdiqlaydi 💳
- Asosiy mahsulotlar:
  • Telegram Stars ⭐ (50 → 100,000 gacha)
  • Telegram Premium 💎 (1 oydan 12 oygacha)
- Narxlar juda arzon! 🔥
- Brend ohangi:
  🎉 Do‘stona va jozibali (Telegram auditoriyasiga mos)
  💎 Premium va ishonchli
  ⚡ Tez, zamonaviy va marketing uslubida
  ❤️ Samimiy va soddaligi bilan ishonchli

⭐ <b>Telegram Stars narxlari:</b>
${stars
  .map(
    (item) =>
      `⭐ ${item.stars.toLocaleString(
        "en-US"
      )} — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

💎 <b>Telegram Premium narxlari:</b>

🎁 <i>Sovg‘a qilish uchun:</i>
${premium.gift
  .map(
    (item) =>
      `🎁 ${item.month} oy — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

👤 <i>Profilingiz uchun:</i>
${premium.profile
  .map(
    (item) =>
      `💎 ${item.month} oy — <b>${item.price.toLocaleString("en-US")} so'm</b>`
  )
  .join("\n")}

📋 Post yaratishda talablar:
1. Postni <b>HTML formatda</b> yozing.
2. Har doim <b>emojilar</b>dan foydalaning (ammo haddan tashqari ko‘p emas).
3. Matnni <b>3–5 bo‘limli</b> tarzda yozing (masalan: kirish, narxlar, afzalliklar, chaqiriq).
4. Reklama uslubida, lekin ishonchli va tabiiy yozing.
5. Yakunda foydalanuvchini <b>@YulduzBozorBot</b> orqali xaridga undang.
6. Ba’zan sarlavhalarni “⭐”, “💎”, “⚡” kabi emoji bilan ajratib bering.

🎯 Maqsad: odam postni o‘qib, botga o‘tib xarid qilishni xohlashi kerak.

Misol:
<b>⭐ Telegram Stars – eng arzon narxlarda!</b>
💬 50 ta – 11 000 so‘m
💬 100 ta – 21 000 so‘m
⚡ 1–5 daqiqada yetkazib beramiz!

👇 Buyurtma berish:
👉 <a href="https://t.me/YulduzBozorBot">@YulduzBozorBot</a>
Do not use <br> tags; use \n for new lines instead. Make sure the text is valid for sendMessage
Endi shu uslubda har safar yangi, jonli, kreativ va o‘zgacha post yarating.
`,
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("AI API xatolik:", await response.text());
      return null;
    }

    const data: any = await response.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("AI bilan bog‘lanishda xatolik:", err);
    return null;
  }
}
