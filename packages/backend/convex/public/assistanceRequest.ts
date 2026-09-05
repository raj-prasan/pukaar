import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireVolunteerOrCoordinator } from "../private/auth";
import { findNearestCamp } from "../private/camps";

// ============================================================
// CREATE ASSISTANCE REQUEST
// User
// ============================================================

export const createAssistanceRequest = mutation({
  args: {
    incidentId: v.optional(v.id("incidents")),

    category: v.union(
      v.literal("medical"),
      v.literal("food"),
      v.literal("water"),
      v.literal("shelter"),
      v.literal("evacuation"),
      v.literal("rescue"),
      v.literal("medicine"),
      v.literal("other")
    ),

    description: v.string(),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    peopleCount: v.optional(v.number()),

    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const assignedCampId = await findNearestCamp(ctx, args.latitude, args.longitude);

    const requestId = await ctx.db.insert("assistanceRequests", {
      requesterId: user._id,

      incidentId: args.incidentId,

      requestType: "assistance",

      category: args.category,
      description: args.description,

      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,

      peopleCount: args.peopleCount,

      priority: args.priority,

      status: "submitted",

      assignedCampId,

      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolvedAt: undefined,
    });

    // Create initial status history
    await ctx.db.insert("requestUpdates", {
      requestId,
      status: "submitted",
      note: "Assistance request submitted",
      updatedBy: user._id,
      createdAt: Date.now(),
    });

    return requestId;
  },
});


// ============================================================
// GET PENDING REQUESTS
// Coordinator / Admin
// ============================================================

export const getPendingRequests = query({
  args: {},

  handler: async (ctx) => {
    const user = await requireVolunteerOrCoordinator(ctx);

    let requests;

    if (user.role === "admin") {
      requests = await ctx.db
        .query("assistanceRequests")
        .withIndex("by_status", (q) =>
          q.eq("status", "submitted")
        )
        .order("desc")
        .collect();
    } else {
      // Coordinator sees requests assigned to their camp.
      //
      // This assumes assistanceRequests has campId.
      requests = await ctx.db
        .query("assistanceRequests")
        .withIndex("by_status", (q) =>
          q.eq("status", "submitted")
        )
        .order("desc")
        .collect();

      requests = requests.filter(
        (request) => request.assignedCampId === user.campId
      );
    }

    return requests;
  },
});


// ============================================================
// ASSIGN REQUEST
// Coordinator / Admin
// ============================================================

export const assignRequest = mutation({
  args: {
    requestId: v.id("assistanceRequests"),
    coordinatorId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const user = await requireVolunteerOrCoordinator(ctx);

    const request = await ctx.db.get(args.requestId);

    if (!request) {
      throw new Error("Assistance request not found");
    }

    const coordinator = await ctx.db.get(args.coordinatorId);

    if (!coordinator) {
      throw new Error("Coordinator not found");
    }

    if (coordinator.role !== "coordinator" && coordinator.role !== "admin") {
      throw new Error("Selected user is not a coordinator");
    }

    // Coordinator cannot assign to another camp.
    if (
      user.role === "coordinator" &&
      coordinator.campId &&
      user.campId &&
      coordinator.campId !== user.campId
    ) {
      throw new Error(
        "Cannot assign request to another camp"
      );
    }

    const assignedCamp = coordinator.campId ?? user.campId;

    await ctx.db.patch(args.requestId, {
      assignedCampId: assignedCamp,
      status: "assigned",
      updatedAt: Date.now(),
    });

    await ctx.db.insert("requestUpdates", {
      requestId: args.requestId,
      status: "assigned",
      note: "Request assigned to coordinator",
      updatedBy: user._id,
      createdAt: Date.now(),
    });

    return args.requestId;
  },
});

/**
 * Get the current user's active assistance request or SOS with updates and dispatch details.
 */
export const getMyActiveRequest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const requests = await ctx.db
      .query("assistanceRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", user._id))
      .order("desc")
      .collect();

    // Look for active request
    const activeRequest = requests.find(
      (r) =>
        r.status === "submitted" ||
        r.status === "under_review" ||
        r.status === "assigned" ||
        r.status === "accepted" ||
        r.status === "in_progress" ||
        r.status === "arrived",
    );

    if (!activeRequest) return null;

    // Find dispatch if assigned
    const dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_request", (q) => q.eq("requestId", activeRequest._id))
      .collect();

    const activeDispatch =
      dispatches.find((d) => d.status !== "cancelled" && d.status !== "completed") ??
      dispatches[0] ??
      null;

    let volunteer = null;
    let volunteerLocation = null;
    if (activeDispatch?.volunteerId) {
      const volUser = await ctx.db.get(activeDispatch.volunteerId);
      if (volUser) {
        volunteer = {
          _id: volUser._id,
          name: volUser.name,
          phone: volUser.phone,
        };
      }
      const loc = await ctx.db
        .query("volunteerLocations")
        .withIndex("by_dispatch", (q) => q.eq("dispatchId", activeDispatch._id))
        .unique();
      if (loc) {
        volunteerLocation = loc;
      }
    }

    const camp = activeRequest.assignedCampId
      ? await ctx.db.get(activeRequest.assignedCampId)
      : null;

    const updates = await ctx.db
      .query("requestUpdates")
      .withIndex("by_request", (q) => q.eq("requestId", activeRequest._id))
      .collect();

    return {
      request: activeRequest,
      dispatch: activeDispatch,
      volunteer,
      volunteerLocation,
      camp,
      updates: updates.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});