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
  args: {
    includeResolved: v.optional(v.boolean()),
  },

  handler: async (ctx, args) => {
    await requireVolunteerOrCoordinator(ctx);

    const baseQuery = ctx.db
      .query("assistanceRequests")
      .withIndex("by_type", (q) => q.eq("requestType", "sos"));

    const rawRequests = args.includeResolved
      ? await baseQuery.order("desc").collect()
      : await baseQuery
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "submitted"),
              q.eq(q.field("status"), "under_review"),
              q.eq(q.field("status"), "assigned"),
              q.eq(q.field("status"), "accepted"),
              q.eq(q.field("status"), "in_progress"),
              q.eq(q.field("status"), "arrived"),
            ),
          )
          .order("desc")
          .collect();

    const enriched = await Promise.all(
      rawRequests.map(async (request) => {
        const [sosEvent, requester, dispatches, updates] = await Promise.all([
          ctx.db
            .query("sosEvents")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .first(),
          ctx.db.get(request.requesterId),
          ctx.db
            .query("dispatches")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .order("desc")
            .collect(),
          ctx.db
            .query("requestUpdates")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .order("desc")
            .take(5),
        ]);

        const activeDispatch =
          dispatches.find((d) => d.status !== "cancelled") ?? dispatches[0] ?? null;

        let volunteer = null;
        let items: Array<{
          _id: string;
          itemName: string;
          quantity: number;
          unit: string;
        }> = [];

        if (activeDispatch) {
          const [volUser, dispatchItems] = await Promise.all([
            ctx.db.get(activeDispatch.volunteerId),
            ctx.db
              .query("dispatchItems")
              .withIndex("by_dispatch", (q) => q.eq("dispatchId", activeDispatch._id))
              .collect(),
          ]);

          if (volUser) {
            volunteer = {
              _id: volUser._id,
              name: volUser.name,
              email: volUser.email,
              phone: volUser.phone,
            };
          }

          items = dispatchItems.map((item) => ({
            _id: item._id,
            itemName: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
          }));
        }

        return {
          ...request,
          sosEvent: sosEvent
            ? {
                _id: sosEvent._id,
                situation: sosEvent.situation,
                latitude: sosEvent.latitude,
                longitude: sosEvent.longitude,
                createdAt: sosEvent.createdAt,
              }
            : null,
          requester: requester
            ? {
                _id: requester._id,
                name: requester.name,
                email: requester.email,
                phone: requester.phone,
              }
            : null,
          dispatch: activeDispatch
            ? {
                _id: activeDispatch._id,
                status: activeDispatch.status,
                instructions: activeDispatch.instructions,
                volunteerId: activeDispatch.volunteerId,
                dispatchedAt: activeDispatch.dispatchedAt,
                acceptedAt: activeDispatch.acceptedAt,
                arrivedAt: activeDispatch.arrivedAt,
                completedAt: activeDispatch.completedAt,
              }
            : null,
          volunteer,
          items,
          updates,
        };
      }),
    );

    return enriched;
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
      return args.requestId;
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