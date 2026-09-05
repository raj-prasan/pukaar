import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireCoordinator } from "../private/auth";

export const createReport = mutation({
  args: {
    category: v.union(v.literal("flood"),
      v.literal("fire"),
      v.literal("landslide"),
      v.literal("earthquake"),
      v.literal("medical"),
      v.literal("road_blocked"),
      v.literal("building_damage"),
      v.literal("missing_person"),
      v.literal("other")),
    title: v.string(),
    description: v.string(),
    severity: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    )),
    latitude: v.number(),
    longitude: v.number(),
    address: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Unauthenticated");
    }

    const reportId = await ctx.db.insert("reports", {
      reporterId: user._id,

      category: args.category,
      title: args.title,
      description: args.description,
      severity: args.severity,

      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,

      imageStorageId: args.imageStorageId,

      verificationStatus: "pending",

      incidentId: undefined,

      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return reportId;
  },
});






