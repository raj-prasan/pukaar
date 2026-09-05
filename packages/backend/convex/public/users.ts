import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../private/auth";
import { internal } from "../_generated/api";

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

export const requestVolunteerRole = mutation({
  args:{
    userId : v.id("users")
  },
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