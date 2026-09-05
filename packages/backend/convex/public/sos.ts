import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireVolunteerOrCoordinator,  } from "../private/auth";
import { findNearestCamp } from "../private/camps";


// ============================================================
// CREATE SOS
// User
// ============================================================

export const createSOS = mutation({
  args: {
    situation: v.union(
      v.literal("trapped"),
      v.literal("injured"),
      v.literal("evacuation"),
      v.literal("medicine"),
      v.literal("danger"),
      v.literal("other")
    ),

    description: v.string(),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    peopleCount: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const assignedCampId = await findNearestCamp(ctx, args.latitude, args.longitude);

    // First create the assistance request
    const requestId = await ctx.db.insert(
      "assistanceRequests",
      {
        requesterId: user._id,

        requestType: "sos",

        category: "rescue",

        description: args.description,

        latitude: args.latitude,
        longitude: args.longitude,

        address: args.address,

        peopleCount: args.peopleCount,

        priority: "critical",

        status: "submitted",

        assignedCampId,

        createdAt: Date.now(),
        updatedAt: Date.now(),
        resolvedAt: undefined,
      }
    );

    // Then create SOS-specific information
    const sosId = await ctx.db.insert("sosEvents", {
      requestId,

      situation: args.situation,

      latitude: args.latitude,
      longitude: args.longitude,

      createdAt: Date.now(),
    });

    // Add request history
    await ctx.db.insert("requestUpdates", {
      requestId,

      status: "submitted",

      note: "Emergency SOS submitted",

      updatedBy: user._id,

      createdAt: Date.now(),
    });

    return {
      requestId,
      sosId,
    };
  },
});


// ============================================================
// GET ACTIVE SOS
// Coordinator / Admin
// ============================================================

export const getActiveSOS = query({
  args: {},

  handler: async (ctx) => {
    await requireVolunteerOrCoordinator(ctx);

    return await ctx.db
      .query("assistanceRequests")
      .withIndex("by_type", (q) =>
        q.eq("requestType", "sos")
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "submitted"),
          q.eq(q.field("status"), "under_review"),
          q.eq(q.field("status"), "assigned"),
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "in_progress")
        )
      )
      .order("desc")
      .collect();
  },
});


// ============================================================
// ACKNOWLEDGE SOS
// Coordinator / Admin
// ============================================================

export const acknowledgeSOS = mutation({
  args: {
    requestId: v.id("assistanceRequests"),
  },

  handler: async (ctx, args) => {
    const user = await requireVolunteerOrCoordinator(ctx);

    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("SOS request not found");
    }

    if (request.requestType !== "sos") {
      throw new Error("This is not an SOS request");
    }

    if (request.status !== "submitted") {
      throw new Error("SOS has already been acknowledged");
    }

    await ctx.db.patch(args.requestId, {
      status: "under_review",
      assignedCampId:
        user.role === "coordinator"
          ? user.campId
          : undefined,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("requestUpdates", {
      requestId: args.requestId,

      status: "under_review",

      note: "SOS acknowledged by coordinator",

      updatedBy: user._id,

      createdAt: Date.now(),
    });

    return args.requestId;
  },
});