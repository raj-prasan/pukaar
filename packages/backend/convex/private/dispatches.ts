import { mutation } from "../_generated/server";
import { v } from "convex/values";
import {
  getCurrentUser,
  requireCoordinator,
} from "./auth";

/**
 * Coordinator/Admin dispatches a volunteer to an assistance request.
 */
export const dispatchVolunteer = mutation({
  args: {
    requestId: v.id("assistanceRequests"),
    volunteerId: v.id("users"),
    instructions: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Assistance request not found");
    }

    if (
      request.status !== "submitted" &&
      request.status !== "under_review" &&
      request.status !== "assigned"
    ) {
      throw new Error("Request cannot be dispatched in its current state");
    }

    const volunteer = await ctx.db.get(args.volunteerId);

    if (!volunteer) {
      throw new Error("Volunteer not found");
    }

    if (volunteer.role !== "volunteer") {
      throw new Error("Selected user is not a volunteer");
    }

    if (!volunteer.isActive) {
      throw new Error("Volunteer is inactive");
    }

    // Coordinator can only manage volunteers from their own camp.
    if (
      coordinator.role === "coordinator" &&
      volunteer.campId !== coordinator.campId
    ) {
      throw new Error("Volunteer does not belong to your camp");
    }

    // Prevent volunteer from having multiple active dispatches.
    const existingDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_volunteer", (q) =>
        q.eq("volunteerId", volunteer._id)
      )
      .collect();

    const activeDispatch = existingDispatches.find(
      (dispatch) =>
        dispatch.status === "dispatched" ||
        dispatch.status === "accepted" ||
        dispatch.status === "en_route" ||
        dispatch.status === "arrived"
    );

    if (activeDispatch) {
      throw new Error("Volunteer already has an active dispatch");
    }

    const now = Date.now();

    const dispatchId = await ctx.db.insert("dispatches", {
      requestId: request._id,
      volunteerId: volunteer._id,
      campId: request.assignedCampId,
      status: "dispatched",
      instructions: args.instructions,
      dispatchedBy: coordinator._id,
      dispatchedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(request._id, {
      status: "assigned",
      updatedAt: now,
    });

    await ctx.db.insert("requestUpdates", {
      requestId: request._id,
      status: "assigned",
      note: `Volunteer ${volunteer.name} dispatched`,
      updatedBy: coordinator._id,
      createdAt: now,
    });

    return dispatchId;
  },
});


/**
 * Volunteer accepts a dispatch.
 */
export const acceptDispatch = mutation({
  args: {
    dispatchId: v.id("dispatches"),
  },

  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);

    if (volunteer.role !== "volunteer") {
      throw new Error("Volunteer access required");
    }

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.volunteerId !== volunteer._id) {
      throw new Error("This dispatch is not assigned to you");
    }

    if (dispatch.status !== "dispatched") {
      throw new Error("Dispatch cannot be accepted");
    }

    const now = Date.now();

    await ctx.db.patch(dispatch._id, {
      status: "accepted",
      acceptedAt: now,
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);

    if (request) {
      await ctx.db.patch(request._id, {
        status: "accepted",
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "accepted",
        note: "Volunteer accepted the dispatch",
        updatedBy: volunteer._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});


/**
 * Volunteer starts travelling to the request location.
 */
export const startDispatch = mutation({
  args: {
    dispatchId: v.id("dispatches"),
  },

  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);

    if (volunteer.role !== "volunteer") {
      throw new Error("Volunteer access required");
    }

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.volunteerId !== volunteer._id) {
      throw new Error("This dispatch is not assigned to you");
    }

    if (dispatch.status !== "accepted") {
      throw new Error("Accept the dispatch first");
    }

    const now = Date.now();

    await ctx.db.patch(dispatch._id, {
      status: "en_route",
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);

    if (request) {
      await ctx.db.patch(request._id, {
        status: "in_progress",
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "in_progress",
        note: "Volunteer is en route",
        updatedBy: volunteer._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});


/**
 * Volunteer marks that they have reached the location.
 */
export const markArrived = mutation({
  args: {
    dispatchId: v.id("dispatches"),
  },

  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);

    if (volunteer.role !== "volunteer") {
      throw new Error("Volunteer access required");
    }

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.volunteerId !== volunteer._id) {
      throw new Error("This dispatch is not assigned to you");
    }

    if (dispatch.status !== "en_route") {
      throw new Error("Dispatch must be en route");
    }

    const now = Date.now();

    await ctx.db.patch(dispatch._id, {
      status: "arrived",
      arrivedAt: now,
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);

    if (request) {
      await ctx.db.patch(request._id, {
        status: "arrived",
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "arrived",
        note: "Volunteer arrived at the location",
        updatedBy: volunteer._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});


/**
 * Volunteer completes the assistance request.
 */
export const completeDispatch = mutation({
  args: {
    dispatchId: v.id("dispatches"),
  },

  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);

    if (volunteer.role !== "volunteer") {
      throw new Error("Volunteer access required");
    }

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.volunteerId !== volunteer._id) {
      throw new Error("This dispatch is not assigned to you");
    }

    if (dispatch.status !== "arrived") {
      throw new Error("Volunteer must arrive before completing");
    }

    const now = Date.now();

    await ctx.db.patch(dispatch._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);

    if (request) {
      await ctx.db.patch(request._id, {
        status: "resolved",
        resolvedAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "resolved",
        note: "Assistance request completed",
        updatedBy: volunteer._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});