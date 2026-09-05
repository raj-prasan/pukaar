import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./auth";


/**
 * Update the volunteer's current location.
 *
 * Only the volunteer assigned to the dispatch can update it.
 */
export const updateLocation = mutation({
  args: {
    dispatchId: v.id("dispatches"),
    latitude: v.number(),
    longitude: v.number(),
    accuracy: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);

    if (volunteer.role !== "volunteer" && volunteer.role !== "admin") {
      throw new Error("Volunteer access required");
    }

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.volunteerId !== volunteer._id && volunteer.role !== "admin") {
      throw new Error("This dispatch is not assigned to you");
    }

    if (
      dispatch.status !== "accepted" &&
      dispatch.status !== "en_route"
    ) {
      throw new Error("Location tracking is not active");
    }

    const now = Date.now();

    const existingLocation = await ctx.db
      .query("volunteerLocations")
      .withIndex("by_dispatch", (q) =>
        q.eq("dispatchId", dispatch._id)
      )
      .unique();

    if (existingLocation) {
      await ctx.db.patch(existingLocation._id, {
        latitude: args.latitude,
        longitude: args.longitude,
        accuracy: args.accuracy,
        timestamp: now,
      });

      return existingLocation._id;
    }

    return await ctx.db.insert("volunteerLocations", {
      volunteerId: volunteer._id,
      dispatchId: dispatch._id,
      latitude: args.latitude,
      longitude: args.longitude,
      accuracy: args.accuracy,
      timestamp: now,
    });
  },
});


/**
 * Get the latest location of a volunteer assigned to a dispatch.
 *
 * Convex automatically keeps the client updated in realtime.
 */
export const getLatestLocation = query({
  args: {
    dispatchId: v.id("dispatches"),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const dispatch = await ctx.db.get(args.dispatchId);

    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    // Volunteer can see their own location.
    // Coordinator/Admin can see the dispatched volunteer.
    if (
      user.role === "volunteer" &&
      dispatch.volunteerId !== user._id
    ) {
      throw new Error("Access denied");
    }

    if (
      user.role !== "volunteer" &&
      user.role !== "coordinator" &&
      user.role !== "admin"
    ) {
      throw new Error("Access denied");
    }

    return await ctx.db
      .query("volunteerLocations")
      .withIndex("by_dispatch", (q) =>
        q.eq("dispatchId", args.dispatchId)
      )
      .unique();
  },
});