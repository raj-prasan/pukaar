import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../private/auth";
import { internal } from "../_generated/api";

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return null;
    }

    return {
      ...user,
      onboardingCompleted: user.onboardingCompleted ?? false,
    };
  },
});

export const ensureCurrentUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const name =
      args.name ??
      identity.name ??
      ([identity.givenName, identity.familyName].filter(Boolean).join(" ") || "User");

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name,
        ...(args.email !== undefined && { email: args.email }),
        ...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
        onboardingCompleted: true,
        updatedAt: Date.now(),
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email: args.email,
      imageUrl: args.imageUrl,
      role: "user",
      onboardingCompleted: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const requestVolunteerRole = mutation({
  args: {},
  handler: async(ctx, args)=>{
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Unauthenticated");
    }

    if(user.role === "volunteer"){
      throw new Error("User is already a volunteer.")
    }
    else{
      await ctx.runMutation(internal.private.users.promoteToVolunteer, {
        userId: user._id,
      })
    }
  }
})

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = args.name.trim();

    if (!name) {
      throw new Error("Name is required");
    }

    await ctx.db.patch(user._id, {
      name,
      ...(args.phone !== undefined && { phone: args.phone }),
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});


export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);


    await ctx.db.patch(user._id, {
      ...(args.name !== undefined && {
        name: args.name,
      }),

      ...(args.phone !== undefined && {
        phone: args.phone,
      }),

      updatedAt: Date.now(),
    });

    return user._id;
  },
});
