// Who can open the Admin page. Everyone else gets a 404, and the sidebar never shows the item.
const ADMINS = ["angel@onagency.ai"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMINS.includes(email.trim().toLowerCase());
}
