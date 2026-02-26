import { Order } from "../backend";

/**
 * Normalizes an Order object from the backend, ensuring that the `quantity`
 * field is always a proper bigint. This handles cases where the Candid
 * deserialization might return quantity as a number instead of bigint.
 */
export function normalizeOrder(order: Order): Order {
  return {
    ...order,
    quantity: BigInt(order.quantity ?? 0),
  };
}

/**
 * Normalizes an array of orders from the backend.
 */
export function normalizeOrders(orders: Order[]): Order[] {
  return orders.map(normalizeOrder);
}

/**
 * Safely converts an order's quantity to a JavaScript number for display.
 * Handles both bigint and number types.
 */
export function getQuantityAsNumber(quantity: bigint | number | undefined | null): number {
  if (quantity === undefined || quantity === null) return 0;
  try {
    return Number(quantity);
  } catch {
    return 0;
  }
}
