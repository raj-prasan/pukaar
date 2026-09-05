import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../private/auth";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},

  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: {
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

