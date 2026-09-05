import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import {
  getCurrentUser,
  requireCoordinator,
  requireVolunteerOrCoordinator,
} from "./auth";

// Create a new incident
export const createIncidentByCoordinator = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("flood"),
      v.literal("fire"),
      v.literal("landslide"),
      v.literal("earthquake"),
      v.literal("medical"),
      v.literal("road_blocked"),
      v.literal("building_damage"),
      v.literal("missing_person"),
      v.literal("other"),
    ),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
  },

  handler: async (ctx, args) => {
    const user = await requireCoordinator(ctx);

    const incidentId = await ctx.db.insert("incidents", {
      title: args.title,
      description: args.description,
      category: args.category,

      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,

      priority: args.priority,

      status: "reported",
      verificationStatus: "unverified",

      reportCount: 0,

      assignedCoordinatorId: user.role === "coordinator" ? user._id : undefined,

      verifiedBy: undefined,
      verifiedAt: undefined,

      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolvedAt: undefined,
    });

    return incidentId;
  },
});

export const updateIncident = mutation({
  args: {
    incidentId: v.id("incidents"),

    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),

    status: v.optional(
      v.union(
        v.literal("reported"),
        v.literal("under_review"),
        v.literal("verified"),
        v.literal("active"),
        v.literal("contained"),
        v.literal("resolved"),
        v.literal("false_alarm"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (user.role !== "coordinator" && user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const incident = await ctx.db.get(args.incidentId);

    if (!incident) {
      throw new Error("Incident not found");
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    if (args.status !== undefined) {
      updates.status = args.status;

      if (args.status === "resolved") {
        updates.resolvedAt = Date.now();
      }
    }

    await ctx.db.patch(args.incidentId, updates);

    return args.incidentId;
  },
});

export const createIncidentFromReport = internalMutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("flood"),
      v.literal("fire"),
      v.literal("landslide"),
      v.literal("earthquake"),
      v.literal("medical"),
      v.literal("road_blocked"),
      v.literal("building_damage"),
      v.literal("missing_person"),
      v.literal("other"),
    ),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    status: v.union(
      v.literal("reported"),
      v.literal("under_review"),
      v.literal("verified"),
      v.literal("active"),
      v.literal("contained"),
      v.literal("resolved"),
      v.literal("false_alarm"),
    ),
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("outdated"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCoordinator(ctx);
    await ctx.db.insert("incidents", {
      title: args.title,
      description: args.description,
      category: args.category,

      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,

      priority: args.priority,

      status: "verified",
      verificationStatus: "unverified",

      reportCount: 0,

      assignedCoordinatorId: user.role === "coordinator" ? user._id : undefined,

      verifiedBy: undefined,
      verifiedAt: undefined,

      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolvedAt: undefined,
    });
  },
});
