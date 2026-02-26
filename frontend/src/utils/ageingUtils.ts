import { Order, OrderStatus } from "@/backend";

/**
 * Returns the pending age in days for an order.
 * Uses max(createdAt, updatedAt) as the reference timestamp.
 * Returns 0 for non-pending orders.
 */
export function calculatePendingAge(order: Order): number {
  if (
    order.status !== OrderStatus.Pending &&
    order.status !== OrderStatus.ReturnFromHallmark
  ) {
    return 0;
  }

  // Backend timestamps are in nanoseconds (bigint); convert to ms
  const createdAtMs = Number(order.createdAt) / 1_000_000;
  const updatedAtMs = Number(order.updatedAt) / 1_000_000;
  const referenceMs = Math.max(createdAtMs, updatedAtMs);

  const nowMs = Date.now();
  const diffMs = nowMs - referenceMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export type AgeingTier = "oldest" | "middle" | "newest" | null;

/**
 * Given a list of all orders (across all design codes), computes the ageing tier
 * for each pending order within its Design Code group.
 *
 * Within each Design Code group:
 *   - The oldest third of orders → "oldest" (light red)
 *   - The middle third → "middle" (light orange/yellow)
 *   - The newest third → "newest" (light green)
 *
 * Returns a Map<orderId, AgeingTier>.
 */
export function computeAgeingTiers(orders: Order[]): Map<string, AgeingTier> {
  const result = new Map<string, AgeingTier>();

  // Group pending orders by design code
  const pendingByDesign = new Map<string, Order[]>();
  for (const order of orders) {
    if (
      order.status === OrderStatus.Pending ||
      order.status === OrderStatus.ReturnFromHallmark
    ) {
      const key = order.design.toUpperCase().trim();
      if (!pendingByDesign.has(key)) {
        pendingByDesign.set(key, []);
      }
      pendingByDesign.get(key)!.push(order);
    }
  }

  // For each design group, sort by pending age descending and assign tiers
  for (const [, groupOrders] of pendingByDesign) {
    // Calculate age for each order in the group
    const withAge = groupOrders.map((order) => ({
      order,
      age: calculatePendingAge(order),
    }));

    // Sort descending by age (oldest first)
    withAge.sort((a, b) => b.age - a.age);

    const count = withAge.length;

    if (count === 1) {
      // Single order in group — treat as newest (green)
      result.set(withAge[0].order.orderId, "newest");
    } else if (count === 2) {
      result.set(withAge[0].order.orderId, "oldest");
      result.set(withAge[1].order.orderId, "newest");
    } else {
      // Split into thirds
      const thirdSize = count / 3;
      withAge.forEach(({ order }, idx) => {
        let tier: AgeingTier;
        if (idx < thirdSize) {
          tier = "oldest";
        } else if (idx < thirdSize * 2) {
          tier = "middle";
        } else {
          tier = "newest";
        }
        result.set(order.orderId, tier);
      });
    }
  }

  return result;
}

/**
 * Returns the CSS class name for a given ageing tier.
 */
export function getAgeingClass(tier: AgeingTier): string {
  switch (tier) {
    case "oldest":
      return "ageing-oldest";
    case "middle":
      return "ageing-middle";
    case "newest":
      return "ageing-newest";
    default:
      return "";
  }
}
