import { QueryCtx, MutationCtx, mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { getCurrentUser } from "./auth";

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

// Mutation to create a relief camp for a coordinator during onboarding/first signup
export const createCoordinatorCamp = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    contactPhone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const now = Date.now();
    const code = Math.floor(100000 + Math.random() * 900000);
    const campId = await ctx.db.insert("camps", {
      name: args.name.trim(),
      address: args.address.trim(),
      city: args.city?.trim() || undefined,
      latitude: args.latitude,
      longitude: args.longitude,
      contactPhone: args.contactPhone?.trim() || undefined,
      status: "active",
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
      uniqueCode: code,
    });
    
    // Link camp to user profile and ensure role is coordinator
    await ctx.db.patch(user._id, {
      role: user.role === "user" ? "coordinator" : user.role,
      campId: campId,
      onboardingCompleted: true,
      updatedAt: now,
      
    });

    return campId;
  },
});
