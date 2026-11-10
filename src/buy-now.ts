import type { Product } from "./api";

export type CheckoutLine = { product: Product; quantity: number; note?: string };
export type BuyNowCheckout = { lines: CheckoutLine[]; includesCart: boolean };
export type CheckoutGroup = { vendorId: string; vendorName: string; lines: CheckoutLine[] };

export function groupCheckoutLines(lines: CheckoutLine[]): CheckoutGroup[] {
  const groups = new Map<string, CheckoutGroup>();
  for (const line of lines) {
    const vendorId = line.product.vendorId;
    const group = groups.get(vendorId);
    if (group) group.lines.push(line);
    else groups.set(vendorId, { vendorId, vendorName: line.product.vendor.name, lines: [line] });
  }
  return [...groups.values()];
}

export function createBuyNowCheckout(
  cart: CheckoutLine[],
  product: Product,
  quantity: number,
  includeCart: boolean,
): BuyNowCheckout {
  const maximum = Math.min(50, product.stock ?? 50);
  const safeQuantity = Math.max(1, Math.min(maximum, Math.floor(quantity) || 1));
  const selectedLine = { product, quantity: safeQuantity };

  if (!includeCart || !cart.length) {
    return { lines: [selectedLine], includesCart: false };
  }
  const alreadyInCart = cart.some((line) => line.product.id === product.id);
  return {
    lines: alreadyInCart
      ? cart.map((line) => line.product.id === product.id ? { ...line, product } : line)
      : [...cart, selectedLine],
    includesCart: true,
  };
}
