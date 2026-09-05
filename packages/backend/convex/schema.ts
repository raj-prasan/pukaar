import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // USERS
  users: defineTable({
    clerkId: v.string(),

    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    phone: v.optional(v.string()),

    role: v.union(
      v.literal("user"),
      v.literal("volunteer"),
      v.literal("coordinator"),
      v.literal("admin"),
    ),

    // Optional camp/base the user belongs to.
    campId: v.optional(v.id("camps")),

    // Optional so existing user documents remain valid during rollout.
    onboardingCompleted: v.optional(v.boolean()),

    isActive: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_camp", ["campId"])
    .index("by_camp_and_role", ["campId", "role"]),

  // VOLUNTEERS
  volunteers: defineTable({
    userId: v.id("users"),
    campId: v.optional(v.id("camps")),

    phone: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("assigned"),
        v.literal("offline"),
        v.literal("on_duty"),
      ),
    ),

    isActive: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_camp", ["campId"])
    .index("by_status", ["status"]),

  volunteerRoleRequests: defineTable({
    requesterId: v.id("users"),

    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),

    reviewedBy: v.optional(v.id("users")),
    note: v.optional(v.string()),
    campId: v.id("camps"),
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_status_and_camp", ["status", "campId"])
    .index("by_requester_and_status", ["requesterId", "status"]),

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
    uniqueCode: v.optional(v.number())
  }).index("by_status", ["status"]).index("by_code", ["uniqueCode"]),

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
      v.literal("other"),
    ),

    title: v.string(),
    description: v.string(),

    // Optional severity as observed by the reporter. Coordinators set incident priority later.
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),

    latitude: v.number(),
    longitude: v.number(),
    locationAccuracy: v.optional(v.number()),

    address: v.optional(v.string()),

    // Optional photo evidence.
    imageStorageId: v.optional(v.id("_storage")),

    // Raw report verification state.
    verificationStatus: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
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
      v.literal("other"),
    ),

    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    // Operational priority.
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),

    // Incident lifecycle.
    status: v.union(
      v.literal("reported"),
      v.literal("under_review"),
      v.literal("verified"),
      v.literal("active"),
      v.literal("contained"),
      v.literal("resolved"),
      v.literal("false_alarm"),
    ),

    // How reliable the incident currently is.
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("outdated"),
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

  incidentVerifications: defineTable({
    incidentId: v.id("incidents"),

    status: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("outdated"),
    ),

    note: v.optional(v.string()),

    verifiedBy: v.id("users"),

    createdAt: v.number(),
  }).index("by_incident", ["incidentId"]),
  assistanceRequests: defineTable({
    requesterId: v.id("users"),

    incidentId: v.optional(v.id("incidents")),

    // SOS vs normal assistance.
    requestType: v.union(v.literal("assistance"), v.literal("sos")),

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

    // Request location.
    latitude: v.number(),
    longitude: v.number(),

    address: v.optional(v.string()),

    // Number of people requiring assistance.
    peopleCount: v.optional(v.number()),

    // Priority assigned by coordinator.
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),

    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("assigned"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("arrived"),
      v.literal("resolved"),
      v.literal("cancelled"),
    ),

    assignedCampId: v.optional(v.id("camps")),

    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_incident", ["incidentId"])
    .index("by_status", ["status"])
    .index("by_priority", ["priority"])
    .index("by_camp", ["assignedCampId"])
    .index("by_type", ["requestType"])
    .index("by_created_at", ["createdAt"]),
  sosEvents: defineTable({
    requestId: v.id("assistanceRequests"),

    situation: v.union(
      v.literal("trapped"),
      v.literal("injured"),
      v.literal("evacuation"),
      v.literal("medicine"),
      v.literal("danger"),
      v.literal("other"),
    ),

    latitude: v.number(),
    longitude: v.number(),

    createdAt: v.number(),
  }).index("by_request", ["requestId"]),

  dispatches: defineTable({
    requestId: v.id("assistanceRequests"),

    volunteerId: v.id("users"),

    campId: v.optional(v.id("camps")),

    status: v.union(
      v.literal("created"),
      v.literal("dispatched"),
      v.literal("accepted"),
      v.literal("en_route"),
      v.literal("arrived"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),

    // Optional coordinator instructions.
    instructions: v.optional(v.string()),

    dispatchedBy: v.id("users"),

    dispatchedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    arrivedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_volunteer", ["volunteerId"])
    .index("by_camp", ["campId"])
    .index("by_status", ["status"]),
  volunteerLocations: defineTable({
    volunteerId: v.id("users"),

    dispatchId: v.id("dispatches"),

    latitude: v.number(),
    longitude: v.number(),

    // Accuracy reported by device, in meters.
    accuracy: v.optional(v.number()),

    timestamp: v.number(),
  })
    .index("by_volunteer", ["volunteerId"])
    .index("by_dispatch", ["dispatchId"])
    .index("by_timestamp", ["timestamp"]),
  resources: defineTable({
    name: v.string(),

    type: v.union(
      v.literal("shelter"),
      v.literal("food"),
      v.literal("water"),
      v.literal("medicine"),
      v.literal("medical"),
      v.literal("volunteer"),
      v.literal("road"),
      v.literal("other"),
    ),

    description: v.optional(v.string()),

    latitude: v.number(),
    longitude: v.number(),

    address: v.string(),

    // Resource quantity/capacity.
    quantity: v.optional(v.number()),
    capacity: v.optional(v.number()),
    availableQuantity: v.optional(v.number()),

    // Useful for shelters.
    occupiedCapacity: v.optional(v.number()),

    // Useful for roads.
    roadStatus: v.optional(
      v.union(
        v.literal("open"),
        v.literal("partially_blocked"),
        v.literal("blocked"),
      ),
    ),

    contactMethod: v.optional(
      v.union(
        v.literal("phone"),
        v.literal("email"),
        v.literal("in_person"),
        v.literal("none"),
      ),
    ),

    contactValue: v.optional(v.string()),

    // Verification is explicitly visible to users.
    verificationStatus: v.union(
      v.literal("unverified"),
      v.literal("verified"),
      v.literal("unavailable"),
      v.literal("outdated"),
    ),

    providerId: v.optional(v.id("users")),

    campId: v.optional(v.id("camps")),

    verifiedBy: v.optional(v.id("users")),
    verifiedAt: v.optional(v.number()),

    // Used to determine whether information is stale.
    lastUpdatedAt: v.number(),

    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_status", ["verificationStatus"])
    .index("by_provider", ["providerId"])
    .index("by_camp", ["campId"])
    .index("by_last_updated", ["lastUpdatedAt"]),

  // ============================================================
  // INVENTORY
  //
  // Current stock at a relief camp/base.
  // ============================================================

  inventory: defineTable({
    campId: v.id("camps"),

    itemName: v.string(),

    category: v.union(
      v.literal("food"),
      v.literal("water"),
      v.literal("medicine"),
      v.literal("first_aid"),
      v.literal("blanket"),
      v.literal("equipment"),
      v.literal("other"),
    ),

    quantity: v.number(),

    unit: v.string(),

    minimumStock: v.optional(v.number()),

    updatedBy: v.id("users"),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_camp", ["campId"])
    .index("by_category", ["category"]),

  // ============================================================
  // INVENTORY TRANSACTIONS
  //
  // Provides an audit trail for resource movement.
  // ============================================================

  inventoryTransactions: defineTable({
    inventoryId: v.id("inventory"),

    campId: v.id("camps"),

    type: v.union(v.literal("in"), v.literal("out"), v.literal("adjustment")),

    quantity: v.number(),

    // Optional connection to a dispatch.
    dispatchId: v.optional(v.id("dispatches")),

    note: v.optional(v.string()),

    performedBy: v.id("users"),

    createdAt: v.number(),
  })
    .index("by_inventory", ["inventoryId"])
    .index("by_camp", ["campId"])
    .index("by_dispatch", ["dispatchId"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================
  // DISPATCH ITEMS
  //
  // What exactly is being sent with a volunteer.
  // ============================================================

  dispatchItems: defineTable({
    dispatchId: v.id("dispatches"),

    inventoryId: v.id("inventory"),

    itemName: v.string(),

    quantity: v.number(),

    unit: v.string(),

    createdAt: v.number(),
  })
    .index("by_dispatch", ["dispatchId"])
    .index("by_inventory", ["inventoryId"]),

  // ============================================================
  // ASSISTANCE / DISPATCH STATUS HISTORY
  // ============================================================

  requestUpdates: defineTable({
    requestId: v.id("assistanceRequests"),

    status: v.union(
      v.literal("submitted"),
      v.literal("under_review"),
      v.literal("assigned"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("arrived"),
      v.literal("resolved"),
      v.literal("cancelled"),
    ),

    note: v.optional(v.string()),

    updatedBy: v.id("users"),

    createdAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_created_at", ["createdAt"]),
});
