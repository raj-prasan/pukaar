import { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function findNearestCamp(
  ctx: QueryCtx | MutationCtx,
  latitude: number,
  longitude: number
): Promise<Id<"camps"> | undefined> {
  let camps = await ctx.db
    .query("camps")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .collect();

  if (camps.length === 0) {
    camps = await ctx.db.query("camps").collect();
  }

  if (camps.length === 0) {
    return undefined;
  }

  let nearestCamp = camps[0];
  let minDistance = calculateDistanceKm(
    latitude,
    longitude,
    nearestCamp.latitude,
    nearestCamp.longitude
  );

  for (let i = 1; i < camps.length; i++) {
    const distance = calculateDistanceKm(
      latitude,
      longitude,
      camps[i].latitude,
      camps[i].longitude
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCamp = camps[i];
    }
  }

  return nearestCamp._id;
}
