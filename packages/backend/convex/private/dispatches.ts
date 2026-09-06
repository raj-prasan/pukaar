import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  getCurrentUser,
  requireCoordinator,
} from "./auth";
import { findNearestCamp } from "./camps";

/**
 * Coordinator/Admin dispatches a volunteer to an assistance request.
 */
export const dispatchVolunteer = mutation({
  args: {
    requestId: v.id("assistanceRequests"),
    volunteerId: v.id("users"),
    instructions: v.optional(v.string()),
    allocatedResources: v.optional(
      v.array(
        v.object({
          inventoryId: v.id("inventory"),
          quantity: v.number(),
        }),
      ),
    ),
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

    const campId = request.assignedCampId ?? coordinator.campId;

    const dispatchId = await ctx.db.insert("dispatches", {
      requestId: request._id,
      volunteerId: volunteer._id,
      campId,
      status: "dispatched",
      instructions: args.instructions,
      dispatchedBy: coordinator._id,
      dispatchedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Allocate resources from inventory if provided
    if (args.allocatedResources && args.allocatedResources.length > 0) {
      for (const res of args.allocatedResources) {
        const item = await ctx.db.get(res.inventoryId);
        if (!item) continue;
        if (item.quantity < res.quantity) {
          throw new Error(`Insufficient stock for ${item.itemName}. In stock: ${item.quantity}`);
        }
        await ctx.db.patch(item._id, {
          quantity: item.quantity - res.quantity,
          updatedAt: now,
          updatedBy: coordinator._id,
        });
        await ctx.db.insert("dispatchItems", {
          dispatchId,
          inventoryId: item._id,
          itemName: item.itemName,
          quantity: res.quantity,
          unit: item.unit,
          createdAt: now,
        });
        await ctx.db.insert("inventoryTransactions", {
          inventoryId: item._id,
          campId: item.campId,
          type: "out",
          quantity: res.quantity,
          dispatchId,
          note: `Dispatched ${res.quantity} ${item.unit} with volunteer ${volunteer.name}`,
          performedBy: coordinator._id,
          createdAt: now,
        });
      }
    }

    await ctx.db.patch(request._id, {
      status: "assigned",
      assignedCampId: campId,
      updatedAt: now,
    });

    const isSos = request.requestType === "sos";
    await ctx.db.insert("requestUpdates", {
      requestId: request._id,
      status: "assigned",
      note: isSos
        ? `Emergency rescue team dispatched: ${volunteer.name}`
        : `Volunteer ${volunteer.name} dispatched`,
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

/**
 * Coordinator creates an assistance request task for an incident and optionally dispatches a volunteer.
 */
export const createTaskAndDispatch = mutation({
  args: {
    incidentId: v.id("incidents"),
    category: v.union(
      v.literal("medical"),
      v.literal("food"),
      v.literal("water"),
      v.literal("shelter"),
      v.literal("evacuation"),
      v.literal("rescue"),
      v.literal("medicine"),
      v.literal("other"),
    ),
    description: v.string(),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    volunteerId: v.optional(v.id("users")),
    instructions: v.optional(v.string()),
    allocatedResources: v.optional(
      v.array(
        v.object({
          inventoryId: v.id("inventory"),
          quantity: v.number(),
        }),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);

    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    let assignedCampId = coordinator.campId;
    if (!assignedCampId) {
      assignedCampId = await findNearestCamp(ctx, incident.latitude, incident.longitude);
    }

    let volunteer = null;
    if (args.volunteerId) {
      volunteer = await ctx.db.get(args.volunteerId);
      if (!volunteer) {
        throw new Error("Volunteer not found");
      }
      if (volunteer.role !== "volunteer") {
        throw new Error("Selected user is not a volunteer");
      }
      if (!volunteer.isActive) {
        throw new Error("Volunteer is inactive");
      }
      if (coordinator.role === "coordinator" && coordinator.campId && volunteer.campId !== coordinator.campId) {
        throw new Error("Volunteer does not belong to your camp");
      }

      // Check for active dispatches
      const existingDispatches = await ctx.db
        .query("dispatches")
        .withIndex("by_volunteer", (q) => q.eq("volunteerId", volunteer!._id))
        .collect();

      const activeDispatch = existingDispatches.find(
        (d) =>
          d.status === "dispatched" ||
          d.status === "accepted" ||
          d.status === "en_route" ||
          d.status === "arrived",
      );

      if (activeDispatch) {
        throw new Error("Volunteer already has an active dispatch");
      }
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("assistanceRequests", {
      requesterId: coordinator._id,
      incidentId: args.incidentId,
      requestType: "assistance",
      category: args.category,
      description: args.description,
      latitude: incident.latitude,
      longitude: incident.longitude,
      address: incident.address,
      priority: args.priority,
      status: args.volunteerId ? "assigned" : "submitted",
      assignedCampId,
      createdAt: now,
      updatedAt: now,
      resolvedAt: undefined,
    });

    let dispatchId: any = undefined;
    if (volunteer) {
      dispatchId = await ctx.db.insert("dispatches", {
        requestId,
        volunteerId: volunteer._id,
        campId: assignedCampId,
        status: "dispatched",
        instructions: args.instructions,
        dispatchedBy: coordinator._id,
        dispatchedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Allocate resources from inventory if provided
      if (args.allocatedResources && args.allocatedResources.length > 0) {
        for (const res of args.allocatedResources) {
          const item = await ctx.db.get(res.inventoryId);
          if (!item) continue;
          if (item.quantity < res.quantity) {
            throw new Error(`Insufficient inventory for ${item.itemName}. Available: ${item.quantity}`);
          }
          await ctx.db.patch(item._id, {
            quantity: item.quantity - res.quantity,
            updatedAt: now,
            updatedBy: coordinator._id,
          });
          await ctx.db.insert("dispatchItems", {
            dispatchId,
            inventoryId: item._id,
            itemName: item.itemName,
            quantity: res.quantity,
            unit: item.unit,
            createdAt: now,
          });
          await ctx.db.insert("inventoryTransactions", {
            inventoryId: item._id,
            campId: item.campId,
            type: "out",
            quantity: res.quantity,
            dispatchId,
            note: `Dispatched ${res.quantity} ${item.unit} for incident task`,
            performedBy: coordinator._id,
            createdAt: now,
          });
        }
      }

      await ctx.db.insert("requestUpdates", {
        requestId,
        status: "assigned",
        note: `Volunteer ${volunteer.name} dispatched for incident task`,
        updatedBy: coordinator._id,
        createdAt: now,
      });
    } else {
      await ctx.db.insert("requestUpdates", {
        requestId,
        status: "submitted",
        note: "Task created for incident",
        updatedBy: coordinator._id,
        createdAt: now,
      });
    }

    return { requestId, dispatchId };
  },
});

/**
 * Get items dispatched in a specific mission.
 */
export const getDispatchItems = query({
  args: {
    dispatchId: v.id("dispatches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dispatchItems")
      .withIndex("by_dispatch", (q) => q.eq("dispatchId", args.dispatchId))
      .collect();
  },
});

/**
 * Volunteer declines a dispatch assignment.
 */
export const declineDispatch = mutation({
  args: {
    dispatchId: v.id("dispatches"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const volunteer = await getCurrentUser(ctx);
    const dispatch = await ctx.db.get(args.dispatchId);
    if (!dispatch) {
      throw new Error("Dispatch not found");
    }
    if (dispatch.volunteerId !== volunteer._id && volunteer.role !== "admin") {
      throw new Error("This dispatch is not assigned to you");
    }
    if (dispatch.status !== "dispatched") {
      throw new Error("Can only decline pending dispatches");
    }

    const now = Date.now();
    await ctx.db.patch(dispatch._id, {
      status: "cancelled",
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);
    if (request) {
      await ctx.db.patch(request._id, {
        status: "submitted",
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "submitted",
        note: `Volunteer declined: ${args.reason ?? "Unavailable"}`,
        updatedBy: volunteer._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});

/**
 * Coordinator cancels or recalls a volunteer dispatch.
 */
export const cancelDispatch = mutation({
  args: {
    dispatchId: v.id("dispatches"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const dispatch = await ctx.db.get(args.dispatchId);
    if (!dispatch) {
      throw new Error("Dispatch not found");
    }

    if (dispatch.status === "completed") {
      throw new Error("Cannot cancel a completed mission");
    }

    const now = Date.now();
    await ctx.db.patch(dispatch._id, {
      status: "cancelled",
      updatedAt: now,
    });

    const request = await ctx.db.get(dispatch.requestId);
    if (request) {
      await ctx.db.patch(request._id, {
        status: "under_review",
        updatedAt: now,
      });

      await ctx.db.insert("requestUpdates", {
        requestId: request._id,
        status: "under_review",
        note: `Dispatch cancelled by coordinator: ${args.reason ?? "Mission reassignment"}`,
        updatedBy: coordinator._id,
        createdAt: now,
      });
    }

    return dispatch._id;
  },
});

/**
 * Update volunteer availability status.
 */
export const updateVolunteerStatus = mutation({
  args: {
    status: v.union(
      v.literal("available"),
      v.literal("assigned"),
      v.literal("offline"),
      v.literal("on_duty"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("volunteers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("volunteers", {
      userId: user._id,
      campId: user.campId,
      phone: user.phone,
      status: args.status,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Get active dispatch for current volunteer.
 */
export const getMyActiveDispatch = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_volunteer", (q) => q.eq("volunteerId", user._id))
      .collect();

    const activeDispatch = dispatches.find(
      (d) =>
        d.status === "dispatched" ||
        d.status === "accepted" ||
        d.status === "en_route" ||
        d.status === "arrived",
    );

    if (!activeDispatch) {
      return null;
    }

    const request = await ctx.db.get(activeDispatch.requestId);
    const camp = activeDispatch.campId ? await ctx.db.get(activeDispatch.campId) : null;
    const coordinator = await ctx.db.get(activeDispatch.dispatchedBy);

    let incident = null;
    if (request?.incidentId) {
      incident = await ctx.db.get(request.incidentId);
    }

    let sosEvent = null;
    if (request?.requestType === "sos") {
      sosEvent = await ctx.db
        .query("sosEvents")
        .withIndex("by_request", (q) => q.eq("requestId", request._id))
        .first();
    }

    const updates = request
      ? await ctx.db
          .query("requestUpdates")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect()
      : [];

    return {
      ...activeDispatch,
      request,
      camp,
      coordinator: coordinator
        ? {
            name: coordinator.name,
            phone: coordinator.phone,
          }
        : null,
      incident,
      sosEvent: sosEvent
        ? {
            situation: sosEvent.situation,
          }
        : null,
      updates: updates.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

/**
 * Get all dispatches for current volunteer.
 */
export const getMyDispatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const volunteerRecord = await ctx.db
      .query("volunteers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    let dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_volunteer", (q) => q.eq("volunteerId", user._id))
      .collect();

    if (volunteerRecord) {
      const volDispatches = await ctx.db
        .query("dispatches")
        .withIndex("by_volunteer", (q) => q.eq("volunteerId", volunteerRecord._id as any))
        .collect();
      const seen = new Set(dispatches.map((d) => d._id));
      for (const d of volDispatches) {
        if (!seen.has(d._id)) {
          dispatches.push(d);
          seen.add(d._id);
        }
      }
    }

    const enriched = await Promise.all(
      dispatches.map(async (d) => {
        const request = await ctx.db.get(d.requestId);
        const camp = d.campId ? await ctx.db.get(d.campId) : null;
        let incident = null;
        if (request?.incidentId) {
          incident = await ctx.db.get(request.incidentId);
        }
        return {
          ...d,
          request,
          camp,
          incident,
        };
      }),
    );

    return enriched.sort((a, b) => b.dispatchedAt - a.dispatchedAt);
  },
});

/**
 * Get volunteer summary data: volunteer record, camp info, stats, and active dispatch.
 */
export const getVolunteerHubData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    const volunteerRecord = await ctx.db
      .query("volunteers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    let dispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_volunteer", (q) => q.eq("volunteerId", user._id))
      .collect();

    if (volunteerRecord) {
      const volDispatches = await ctx.db
        .query("dispatches")
        .withIndex("by_volunteer", (q) => q.eq("volunteerId", volunteerRecord._id as any))
        .collect();
      const seen = new Set(dispatches.map((d) => d._id));
      for (const d of volDispatches) {
        if (!seen.has(d._id)) {
          dispatches.push(d);
          seen.add(d._id);
        }
      }
    }

    dispatches.sort((a, b) => b.dispatchedAt - a.dispatchedAt);

    const activeDispatchDoc = dispatches.find(
      (d) =>
        d.status === "dispatched" ||
        d.status === "accepted" ||
        d.status === "en_route" ||
        d.status === "arrived",
    );

    let campId = user.campId ?? volunteerRecord?.campId;
    if (!campId && activeDispatchDoc?.campId) {
      campId = activeDispatchDoc.campId;
    }
    if (!campId) {
      const createdCamp = await ctx.db
        .query("camps")
        .filter((q) => q.eq(q.field("createdBy"), user._id))
        .first();
      if (createdCamp) {
        campId = createdCamp._id;
      }
    }
    if (!campId) {
      const anyDispatchWithCamp = dispatches.find((d) => d.campId);
      if (anyDispatchWithCamp?.campId) {
        campId = anyDispatchWithCamp.campId;
      }
    }
    if (!campId) {
      const roleReq = await ctx.db
        .query("volunteerRoleRequests")
        .withIndex("by_requester_and_status", (q) =>
          q.eq("requesterId", user._id).eq("status", "approved"),
        )
        .first();
      if (roleReq?.campId) {
        campId = roleReq.campId;
      }
    }
    const camp = campId ? await ctx.db.get(campId) : null;

    let activeDispatch = null;
    if (activeDispatchDoc) {
      const request = await ctx.db.get(activeDispatchDoc.requestId);
      const coordinator = await ctx.db.get(activeDispatchDoc.dispatchedBy);
      let incident = null;
      if (request?.incidentId) {
        incident = await ctx.db.get(request.incidentId);
      }
      const updates = request
        ? await ctx.db
            .query("requestUpdates")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .collect()
        : [];

      let dispatchCamp = camp;
      if (activeDispatchDoc.campId && activeDispatchDoc.campId !== camp?._id) {
        dispatchCamp = (await ctx.db.get(activeDispatchDoc.campId)) ?? camp;
      }

      activeDispatch = {
        ...activeDispatchDoc,
        request,
        camp: dispatchCamp,
        coordinator: coordinator
          ? {
              name: coordinator.name,
              phone: coordinator.phone,
            }
          : null,
        incident,
        updates: updates.sort((a, b) => b.createdAt - a.createdAt),
      };
    }

    const completedMissions = dispatches.filter((d) => d.status === "completed").length;

    return {
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
      volunteer: volunteerRecord,
      camp,
      stats: {
        totalDispatches: dispatches.length,
        completedMissions,
        activeMissions: activeDispatch ? 1 : 0,
        status: volunteerRecord?.status ?? (activeDispatch ? "on_duty" : "available"),
      },
      activeDispatch,
    };
  },
});

/**
 * Coordinator gets all field dispatches with volunteer, incident, and allocated resources.
 */
export const getCampDispatches = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;
    if (!campId && coordinator.role !== "admin") return [];

    let dispatches = campId
      ? await ctx.db
          .query("dispatches")
          .withIndex("by_camp", (q) => q.eq("campId", campId))
          .order("desc")
          .collect()
      : await ctx.db.query("dispatches").order("desc").collect();

    if (args.status && args.status !== "all") {
      dispatches = dispatches.filter((d) => d.status === args.status);
    }

    return await Promise.all(
      dispatches.map(async (d) => {
        const [volunteer, request, items] = await Promise.all([
          ctx.db.get(d.volunteerId),
          ctx.db.get(d.requestId),
          ctx.db
            .query("dispatchItems")
            .withIndex("by_dispatch", (q) => q.eq("dispatchId", d._id))
            .collect(),
        ]);

        let incident = null;
        if (request?.incidentId) {
          incident = await ctx.db.get(request.incidentId);
        }

        return {
          ...d,
          volunteer: volunteer
            ? { _id: volunteer._id, name: volunteer.name, phone: volunteer.phone }
            : null,
          request,
          incident,
          items,
        };
      }),
    );
  },
});


