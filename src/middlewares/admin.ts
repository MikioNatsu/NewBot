import { MyContext } from "../types";

export const isAdmin = (ctx: MyContext, next: () => Promise<void>) => {
  const adminId = process.env.ADMIN!;
  if (ctx.from?.id.toString() !== adminId) {
    return ctx.reply(
      "❌ Siz admin emassiz! Bu funksiya faqat administrator uchun."
    );
  }
  return next();
};
