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
    if (roleRequest.status !== "pending") {
      throw new Error("This volunteer request has already been reviewed.");
    }
    if (coordinator.role !== "admin" && roleRequest.campId !== coordinator.campId) {
      throw new Error("You can only review requests for your camp.");
    }
    const user = await ctx.db.get(roleRequest.requesterId)

    if (!user) {
      throw new Error("User Not Found");
    }

    if (user.role !== "user") {
      throw new Error("Only normal users can become volunteers");
    }


    const now = Date.now();

    await ctx.db.patch(user._id, {
      role: "volunteer",
      campId: roleRequest.campId,
      updatedAt: now,
    });
    await ctx.db.patch(roleRequest._id,{
      status : "approved",
      reviewedBy: coordinator._id,
      reviewedAt: now,
      updatedAt: now,
    })

    const existingVolunteer = await ctx.db
      .query("volunteers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!existingVolunteer) {
      await ctx.db.insert("volunteers", {
        userId: user._id,
        campId: roleRequest.campId,
        phone: user.phone,
        status: "available",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return args.volunteerRoleRequestId;
  }
})

export const rejectVolunteerRoleRequest = mutation({
  args: {
    volunteerRoleRequestId: v.id("volunteerRoleRequests"),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const roleRequest = await ctx.db.get(args.volunteerRoleRequestId);

    if (!roleRequest) {
      throw new Error("Request Not Found");
    }
    if (roleRequest.status !== "pending") {
      throw new Error("This volunteer request has already been reviewed.");
    }
    if (coordinator.role !== "admin" && roleRequest.campId !== coordinator.campId) {
      throw new Error("You can only review requests for your camp.");
    }

    const now = Date.now();
    await ctx.db.patch(roleRequest._id, {
      status: "rejected",
      reviewedBy: coordinator._id,
      reviewedAt: now,
      updatedAt: now,
    });

    return roleRequest._id;
  },
});

export const pendingVolunteerRoleRequests = query({
  args: {},
  handler: async (ctx) => {
    const coordinator = await requireCoordinator(ctx);
    const requests = coordinator.role === "admin"
      ? await ctx.db
          .query("volunteerRoleRequests")
          .withIndex("by_status_and_camp", (q) => q.eq("status", "pending"))
          .collect()
      : coordinator.campId
        ? await ctx.db
            .query("volunteerRoleRequests")
            .withIndex("by_status_and_camp", (q) =>
              q.eq("status", "pending").eq("campId", coordinator.campId!),
            )
            .collect()
        : [];

    return await Promise.all(
      requests.map(async (request) => {
        const [user, camp] = await Promise.all([
          ctx.db.get(request.requesterId),
          ctx.db.get(request.campId),
        ]);
        return {
          ...request,
          requester: user
            ? { name: user.name, email: user.email, phone: user.phone }
            : null,
          campName: camp?.name ?? "Relief camp",
        };
      }),
    );
  },
});

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
