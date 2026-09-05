import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser, requireCoordinator } from "./auth";

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Create a new incident directly
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

// Step 2 & 3: Find potential duplicate incidents by category and location proximity
export const findNearbyIncidents = query({
  args: {
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
    maxDistanceKm: v.optional(v.number()),
    reportId: v.optional(v.id("reports"))
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    if (!coordinator) {
      throw new Error("UNAUTHORIZED");
    }

    const maxDistance = args.maxDistanceKm ?? 10; // Default 10 km radius

    // Indexed query by category
    const categoryIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Filter to active/unresolved incidents within proximity threshold
    const duplicates = categoryIncidents
      .filter((inc) => inc.status !== "resolved" && inc.status !== "false_alarm")
      .map((inc) => {
        const distanceKm = getDistanceKm(
          args.latitude,
          args.longitude,
          inc.latitude,
          inc.longitude,
        );
        return { ...inc, distanceKm };
      })
      .filter((inc) => inc.distanceKm <= maxDistance)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return duplicates;
  },
});

// Step 3: Promote report to a brand new Incident
export const createIncidentFromReport = mutation({
  args: {
    reportId: v.id("reports"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
  },

  handler: async (ctx, args) => {
    const user = await requireCoordinator(ctx);
    const report = await ctx.db.get(args.reportId);

    if (!report) {
      throw new Error("Report not found");
    }

    const incidentTitle = args.title?.trim() || report.title;
    const incidentDescription = args.description?.trim() || report.description;

    const now = Date.now();
    const incidentId = await ctx.db.insert("incidents", {
      title: incidentTitle,
      description: incidentDescription,
      category: report.category,

      latitude: report.latitude,
      longitude: report.longitude,
      address: report.address,

      priority: args.priority,

      status: "verified",
      verificationStatus: "verified",

      reportCount: 1,

      assignedCoordinatorId: user.role === "coordinator" ? user._id : undefined,

      verifiedBy: user._id,
      verifiedAt: now,

      createdAt: now,
      updatedAt: now,
      resolvedAt: undefined,
    });

    // Link report to new incident and mark verified
    await ctx.db.patch(args.reportId, {
      incidentId,
      verificationStatus: "verified",
      updatedAt: now,
    });

    // Save initial audit history entry
    await ctx.db.insert("incidentVerifications", {
      incidentId,
      status: "verified",
      note: "Incident created and verified from field report",
      verifiedBy: user._id,
      createdAt: now,
    });

    return incidentId;
  },
});

// Step 4: Attach additional report to an existing Incident (crowdsourced corroboration)
export const attachReportToIncident = mutation({
  args: {
    reportId: v.id("reports"),
    incidentId: v.id("incidents"),
  },

  handler: async (ctx, args) => {
    await requireCoordinator(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    // Attach report to incident
    await ctx.db.patch(args.reportId, {
      incidentId: args.incidentId,
      verificationStatus: "verified",
      updatedAt: Date.now(),
    });

    // Increment incident reportCount and update timestamp
    await ctx.db.patch(args.incidentId, {
      reportCount: incident.reportCount + 1,
      updatedAt: Date.now(),
    });

    return args.incidentId;
  },
});

// Step 5 & 6: Verify or Mark Outdated Incident with Audit History Timeline
export const verifyIncident = mutation({
  args: {
    incidentId: v.id("incidents"),
    status: v.union(
      v.literal("verified"),
      v.literal("outdated"),
      v.literal("unverified"),
    ),
    note: v.optional(v.string()),
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);

    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      throw new Error("Incident not found");
    }

    const now = Date.now();
    const newIncidentStatus =
      args.status === "verified"
        ? "verified"
        : args.status === "outdated"
          ? "contained"
          : incident.status;

    await ctx.db.patch(args.incidentId, {
      verificationStatus: args.status,
      status: newIncidentStatus,
      verifiedBy: coordinator._id,
      verifiedAt: now,
      updatedAt: now,
      ...(args.priority ? { priority: args.priority } : {}),
    });

    // Save historical verification audit log
    await ctx.db.insert("incidentVerifications", {
      incidentId: args.incidentId,
      status: args.status,
      note: args.note ?? (args.status === "verified" ? "Incident verified by coordinator" : "Incident marked outdated"),
      verifiedBy: coordinator._id,
      createdAt: now,
    });

    return args.incidentId;
  },
});

// Get full incident details: Incident + Linked Reports + Verification History Timeline
export const getIncidentDetails = query({
  args: {
    incidentId: v.id("incidents"),
  },

  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    if (!incident) {
      return null;
    }

    // Fetch reports linked to this incident using index
    const rawReports = await ctx.db
      .query("reports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();

    // Enrich reports with resolved storage image URLs
    const reports = await Promise.all(
      rawReports.map(async (rep) => {
        const imageUrl = rep.imageStorageId
          ? await ctx.storage.getUrl(rep.imageStorageId)
          : null;
        return {
          ...rep,
          imageUrl,
        };
      }),
    );

    // Fetch verification audit history using index
    const rawVerifications = await ctx.db
      .query("incidentVerifications")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();

    // Enrich verification records with coordinator names
    const verifications = await Promise.all(
      rawVerifications.map(async (vRecord) => {
        const coordinator = await ctx.db.get(vRecord.verifiedBy);
        return {
          ...vRecord,
          verifierName: coordinator?.name ?? "Coordinator",
        };
      }),
    );

    // Fetch assistance requests / tasks linked to this incident using index
    const rawTasks = await ctx.db
      .query("assistanceRequests")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();

    const tasks = await Promise.all(
      rawTasks.map(async (task) => {
        const dispatches = await ctx.db
          .query("dispatches")
          .withIndex("by_request", (q) => q.eq("requestId", task._id))
          .order("desc")
          .collect();

        const activeDispatch = dispatches[0] ?? null;
        let volunteer = null;
        if (activeDispatch) {
          volunteer = await ctx.db.get(activeDispatch.volunteerId);
        }

        return {
          ...task,
          dispatch: activeDispatch,
          volunteer: volunteer
            ? {
                _id: volunteer._id,
                name: volunteer.name,
                email: volunteer.email,
                phone: volunteer.phone,
              }
            : null,
        };
      }),
    );

    return {
      incident,
      reports,
      verifications,
      tasks,
    };
  },
});
