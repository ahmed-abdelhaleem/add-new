/** Only this Google account may open `/admin` and change integration flags. */
export const ADMIN_EMAIL = "asaeed.abdelhaleem@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
