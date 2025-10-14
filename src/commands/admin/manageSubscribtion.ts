import { MyContext } from "../../types";
import { SubscriptionChannel } from "../../models/SubscriptionChannel";
import { InlineKeyboard } from "grammy";

export async function manageSubscriptions(ctx: MyContext) {
  const channels = await SubscriptionChannel.find({});
  let msg = "📢 Majburiy obuna kanallari:\n\n";

  channels.forEach((ch, i) => {
    msg += `${i + 1}. ${ch.channelName} (${ch.channelId})\n`;
  });
  if (!channels.length) msg += "Hech qanday kanal qo‘shilmagan.";

  const kb = new InlineKeyboard().text("➕ Yangi kanal", "add_channel").row();
  for (const ch of channels) {
    kb.text(`❌ ${ch.channelName}`, `delete_channel_${ch._id}`).row();
  }
  kb.text("⬅️ Orqaga", "admin_menu");

  await ctx.editMessageText(msg, { reply_markup: kb });
}

export async function addChannel(ctx: MyContext) {
  ctx.session.state = "awaiting_channel_input";
  await ctx.editMessageText(
    "📢 Yangi kanalni quyidagicha yuboring:\n\n" +
      "<b>@username</b> yoki <b>-100XXXXXXXXX</b> formatida.\n\n" +
      "Masalan:\n@YulduzBozor\n-1002229098897",
    { parse_mode: "HTML" }
  );
}

export async function deleteChannel(ctx: MyContext) {
  const id = ctx.match?.[1];
  if (!id) return ctx.answerCallbackQuery("❌ Kanal ID topilmadi!");

  await SubscriptionChannel.findByIdAndDelete(id);
  await ctx.answerCallbackQuery("✅ Kanal o‘chirildi!");
  await manageSubscriptions(ctx);
}
