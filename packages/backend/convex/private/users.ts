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
      onboardingCompleted: false,

      isActive: true,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const promoteToVolunteer = mutation({
  args: {
    volunteerRoleRequestId: v.id("volunteerRoleRequests")
  },
  handler: async(ctx, args)=>{
    const coordinator = await requireCoordinator(ctx);

    const roleRequest = await ctx.db.get(args.volunteerRoleRequestId);

    if (!roleRequest) {
      throw new Error("Request Not Found");
    }
    const user = await ctx.db.get(roleRequest.requesterId)

    if (!user) {
      throw new Error("User Not Found");
    }

    if (user.role !== "user") {
      throw new Error("Only normal users can become volunteers");
    }


    await ctx.db.patch(user._id, {
      role: "volunteer",
      campId: coordinator.campId,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(roleRequest._id,{
      status : "approved",
      reviewedBy: coordinator._id
    })

    const existingVolunteer = await ctx.db
      .query("volunteers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!existingVolunteer) {
      await ctx.db.insert("volunteers", {
        userId: user._id,
        campId: coordinator.campId,
        phone: user.phone,
        status: "available",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    return args.volunteerRoleRequestId;
  }
})

export const volunteersUnderCoordinatorCamp = query({
  args:{

  },
  handler:async(ctx, args)=>{
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;
    console.log(campId)
    if(!campId){
      return [];
    }

    return await ctx.db.query("users").withIndex("by_camp_and_role", (q)=> q.eq("campId", campId).eq("role", "volunteer")).collect()

  }
})
