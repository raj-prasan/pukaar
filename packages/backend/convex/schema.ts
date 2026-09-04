import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // USERS
  users: defineTable({
    clerkId: v.string(),

    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),

    role: v.union(
      v.literal("user"),
      v.literal("volunteer"),
      v.literal("coordinator"),
      v.literal("admin"),
    ),

    // Optional camp/base the user belongs to.
    campId: v.optional(v.id("camps")),

    isActive: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_camp", ["campId"])
    .index("by_camp_and_role", ["campId", "role"]),

  camps: defineTable({
    name: v.string(),

    address: v.string(),
    city: v.optional(v.string()),

    latitude: v.number(),
    longitude: v.number(),

    contactPhone: v.optional(v.string()),

    status: v.union(v.literal("active"), v.literal("inactive")),

    createdBy: v.id("users"),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  reports: defineTable({
    reporterId: v.id("users"),

    category: v.union(
      v.literal("flood"),
      v.literal("fire"),
      v.literal("landslide"),
      v.literal("earthquake"),
      v.literal("medical"),
      v.literal("road_blocked"),
      v.literal("building_damage"),
      v.literal("missing_person"),
      v.literal("other")
    ),

    title: v.string(),
    description: v.string(),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    // Optional photo evidence.
    imageStorageId: v.optional(v.id("_storage")),

    // Raw report verification state.
    verificationStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected")
    ),

    // If this report is associated with an incident.
    incidentId: v.optional(v.id("incidents")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reporter", ["reporterId"])
    .index("by_incident", ["incidentId"])
    .index("by_verification_status", ["verificationStatus"])
    .index("by_category", ["category"])
    .index("by_created_at", ["createdAt"]),

    incidents: defineTable({
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
      v.literal("other")
    ),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    // Operational priority.
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical")
    ),

    // Incident lifecycle.
    status: v.union(
      v.literal("reported"),
      v.literal("under_review"),
      v.literal("verified"),
      v.literal("active"),
      v.literal("contained"),
      v.literal("resolved"),
      v.literal("false_alarm")
    ),

    // How reliable the incident currently is.
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("outdated")
    ),

    // Number of reports consolidated into this incident.
    reportCount: v.number(),

    // Coordinator/admin responsible for the incident.
    assignedCoordinatorId: v.optional(v.id("users")),

    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_category", ["category"])
    .index("by_coordinator", ["assignedCoordinatorId"])
    .index("by_updated_at", ["updatedAt"]),
});
