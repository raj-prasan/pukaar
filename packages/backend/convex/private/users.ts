import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCoordinator } from "./auth";

export const createFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", args.clerkId)
      )
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: "user",

      isActive: true,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const promoteToVolunteer = internalMutation({
  args: {
    userId: v.id("users")
  },
  handler: async(ctx, args)=>{
    const coordinator = await requireCoordinator(ctx);

    const user = await ctx.db.get(args.userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.role !== "user") {
      throw new Error("Only normal users can become volunteers");
    }

    await ctx.db.patch(args.userId, {
      role: "volunteer",
      campId: coordinator.campId,
      updatedAt: Date.now(),
    });

    return args.userId;
  }
})

export const volunteersUnderCoordinatorCamp = query({
  args:{

  },
  handler:async(ctx, args)=>{
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;
    if(!campId){
      return [];
    }
    return await ctx.db.query("users").withIndex("by_camp_and_role", (q)=> q.eq("campId", campId).eq("role", "volunteer")).collect()

  }
})