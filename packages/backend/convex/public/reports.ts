import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "../private/auth";
import type { Id } from "../_generated/dataModel";

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
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

const incidentCategories = v.union(
  v.literal("flood"),
  v.literal("fire"),
  v.literal("landslide"),
  v.literal("earthquake"),
  v.literal("medical"),
  v.literal("road_blocked"),
  v.literal("building_damage"),
  v.literal("missing_person"),
  v.literal("other")
);

export const createReport = mutation({
  args: {
    category: incidentCategories,
    title: v.string(),
    description: v.string(),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    latitude: v.number(),
    longitude: v.number(),
    locationAccuracy: v.optional(v.number()),
    address: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    incidentId: v.optional(v.id("incidents")),
  },

  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      throw new Error("Unauthenticated");
    }

    const now = Date.now();
    const reportId = await ctx.db.insert("reports", {
      reporterId: user._id,

      category: args.category,
      title: args.title,
      description: args.description,
      severity: args.severity,

      latitude: args.latitude,
      longitude: args.longitude,
      locationAccuracy: args.locationAccuracy,
      address: args.address,

      imageStorageId: args.imageStorageId,

      verificationStatus: "pending",

      incidentId: args.incidentId,

      createdAt: now,
      updatedAt: now,
    });

    if (args.incidentId) {
      const incident = await ctx.db.get(args.incidentId);
      if (incident) {
        await ctx.db.patch(args.incidentId, {
          reportCount: (incident.reportCount ?? 0) + 1,
          updatedAt: now,
        });
      }
    }

    return reportId;
  },
});

export const checkSimilarReportsAndIncidents = query({
  args: {
    category: incidentCategories,
    latitude: v.number(),
    longitude: v.number(),
    maxDistanceKm: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const maxDistance = args.maxDistanceKm ?? 5; // Default 5 km proximity radius

    // 1. Identify current authenticated user (if available)
    let currentUserId: Id<"users"> | null = null;
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
      if (user) {
        currentUserId = user._id;
      }
    }

    // 2. Active incidents in the same category within proximity
    const categoryIncidents = await ctx.db
      .query("incidents")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const similarIncidents = categoryIncidents
      .filter((inc) => inc.status !== "resolved" && inc.status !== "false_alarm")
      .map((inc) => {
        const distanceKm = getDistanceKm(
          args.latitude,
          args.longitude,
          inc.latitude,
          inc.longitude
        );
        return {
          _id: inc._id,
          title: inc.title,
          description: inc.description,
          category: inc.category,
          address: inc.address,
          status: inc.status,
          priority: inc.priority,
          verificationStatus: inc.verificationStatus,
          reportCount: inc.reportCount,
          createdAt: inc.createdAt,
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
      .filter((inc) => inc.distanceKm <= maxDistance)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // 3. Check reports filed by the SAME user for this category in proximity
    let userReports: Array<{
      _id: Id<"reports">;
      title: string;
      description: string;
      category: string;
      address?: string;
      verificationStatus: string;
      distanceKm: number;
      createdAt: number;
    }> = [];

    if (currentUserId) {
      const myReports = await ctx.db
        .query("reports")
        .withIndex("by_reporter", (q) => q.eq("reporterId", currentUserId))
        .collect();

      userReports = myReports
        .filter(
          (rep) =>
            rep.category === args.category &&
            rep.verificationStatus !== "rejected"
        )
        .map((rep) => {
          const distanceKm = getDistanceKm(
            args.latitude,
            args.longitude,
            rep.latitude,
            rep.longitude
          );
          return {
            _id: rep._id,
            title: rep.title,
            description: rep.description,
            category: rep.category,
            address: rep.address,
            verificationStatus: rep.verificationStatus,
            distanceKm: Math.round(distanceKm * 10) / 10,
            createdAt: rep.createdAt,
          };
        })
        .filter((rep) => rep.distanceKm <= maxDistance)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    // 4. Check recent similar reports by other users within the last 48 hours
    const recentCutoff = Date.now() - 48 * 60 * 60 * 1000;
    const categoryReports = await ctx.db
      .query("reports")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const similarReports = categoryReports
      .filter(
        (rep) =>
          rep.verificationStatus !== "rejected" &&
          rep.createdAt >= recentCutoff &&
          (!currentUserId || rep.reporterId !== currentUserId)
      )
      .map((rep) => {
        const distanceKm = getDistanceKm(
          args.latitude,
          args.longitude,
          rep.latitude,
          rep.longitude
        );
        return {
          _id: rep._id,
          title: rep.title,
          description: rep.description,
          category: rep.category,
          address: rep.address,
          verificationStatus: rep.verificationStatus,
          distanceKm: Math.round(distanceKm * 10) / 10,
          createdAt: rep.createdAt,
        };
      })
      .filter((rep) => rep.distanceKm <= maxDistance)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return {
      hasSimilarIncident: similarIncidents.length > 0,
      hasUserDuplicate: userReports.length > 0,
      hasSimilarReport: similarReports.length > 0,
      similarIncidents,
      userReports,
      similarReports,
    };
  },
});

/**
 * Get all reports submitted by the current authenticated citizen.
 */
export const getMyReports = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", user._id))
      .collect();

    reports.sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      reports.map(async (rep) => {
        let incident = null;
        if (rep.incidentId) {
          incident = await ctx.db.get(rep.incidentId);
        }
        const imageUrl = rep.imageStorageId
          ? await ctx.storage.getUrl(rep.imageStorageId)
          : null;

        return {
          ...rep,
          imageUrl,
          incident: incident
            ? {
                _id: incident._id,
                title: incident.title,
                description: incident.description,
                status: incident.status,
                priority: incident.priority,
                verificationStatus: incident.verificationStatus,
                reportCount: incident.reportCount,
              }
            : null,
        };
      })
    );
  },
});








