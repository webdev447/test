// One wording for "how many of the same number" everywhere it's shown —
// the customer's ตู้เซฟ, the cart, and the admin's ticket/order views.
export function ticketKindLabel(qty: number): string {
  return qty > 1 ? `หวยชุด ${qty} ใบ` : "หวยเดี่ยว";
}
