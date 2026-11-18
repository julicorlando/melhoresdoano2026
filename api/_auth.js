import crypto from "node:crypto";

const PASSWORD = process.env.ADMIN_PASSWORD || "070525admin";

export function checkPassword(password) {
  if (!password) return false;
  const ha = crypto.createHash("sha256").update(String(password)).digest();
  const hb = crypto.createHash("sha256").update(PASSWORD).digest();
  return crypto.timingSafeEqual(ha, hb);
}
