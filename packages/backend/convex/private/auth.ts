// convex/auth.ts

import { QueryCtx, MutationCtx } from "../_generated/server";

export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) =>
      q.eq("clerkId", identity.subject)
    )
    .unique();

  if (!user) {
    throw new Error("User profile not found");
  }

  return user;
}


export async function requireCoordinator(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  if (user.role !== "coordinator" && user.role !== "admin") {
    throw new Error("Coordinator/Admin access required");
  }

  return user;
}

export async function requireVolunteer(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  if (user.role !== "volunteer" ) {
    throw new Error("Volunteer access required");
  }

  return user;
}
export async function requireVolunteerOrCoordinator(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  if (user.role !== "volunteer" && user.role !== "coordinator" && user.role !== "admin") {
    throw new Error("Volunteer, coordinator, or admin access required");
  }

  return user;
}
