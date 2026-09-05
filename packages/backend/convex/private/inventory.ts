import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireCoordinator } from "./auth";
import type { Doc, Id } from "../_generated/dataModel";

const categoryValidator = v.union(
  v.literal("food"),
  v.literal("water"),
  v.literal("medicine"),
  v.literal("first_aid"),
  v.literal("blanket"),
  v.literal("equipment"),
  v.literal("other"),
);

/**
 * Get comprehensive camp inventory with live availability, reserved quantities,
 * dispatched totals, category breakdown, and low-stock alerts.
 */
export const getCampInventory = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;

    if (!campId) {
      if (coordinator.role === "admin") {
        const firstCamp = await ctx.db.query("camps").first();
        if (!firstCamp) {
          return {
            camp: null,
            items: [],
            stats: {
              totalItems: 0,
              totalAvailable: 0,
              totalReserved: 0,
              totalDispatched: 0,
              healthyCount: 0,
              lowCount: 0,
              criticalCount: 0,
              categoryBreakdown: {},
            },
            lowStockAlerts: [],
          };
        }
      } else {
        return {
          camp: null,
          items: [],
          stats: {
            totalItems: 0,
            totalAvailable: 0,
            totalReserved: 0,
            totalDispatched: 0,
            healthyCount: 0,
            lowCount: 0,
            criticalCount: 0,
            categoryBreakdown: {},
          },
          lowStockAlerts: [],
        };
      }
    }

    const activeCampId = campId ?? (await ctx.db.query("camps").first())?._id;
    if (!activeCampId) {
      return {
        camp: null,
        items: [],
        stats: {
          totalItems: 0,
          totalAvailable: 0,
          totalReserved: 0,
          totalDispatched: 0,
          healthyCount: 0,
          lowCount: 0,
          criticalCount: 0,
          categoryBreakdown: {},
        },
        lowStockAlerts: [],
      };
    }

    const camp = await ctx.db.get(activeCampId);

    // Fetch raw inventory items for this camp
    const rawItems = await ctx.db
      .query("inventory")
      .withIndex("by_camp", (q) => q.eq("campId", activeCampId))
      .collect();

    // Fetch dispatch items linked to this camp's dispatches to compute reserved & dispatched quantities
    const campDispatches = await ctx.db
      .query("dispatches")
      .withIndex("by_camp", (q) => q.eq("campId", activeCampId))
      .collect();

    const dispatchMap = new Map<string, Doc<"dispatches">>();
    campDispatches.forEach((d) => dispatchMap.set(d._id, d));

    // Enrich inventory items with reserved & dispatched quantities
    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        const dispatchRecords = await ctx.db
          .query("dispatchItems")
          .withIndex("by_inventory", (q) => q.eq("inventoryId", item._id))
          .collect();

        let reserved = 0;
        let dispatched = 0;

        for (const record of dispatchRecords) {
          const dispatch = dispatchMap.get(record.dispatchId) ?? (await ctx.db.get(record.dispatchId));
          if (!dispatch) continue;

          if (
            dispatch.status === "dispatched" ||
            dispatch.status === "accepted" ||
            dispatch.status === "en_route" ||
            dispatch.status === "arrived"
          ) {
            reserved += record.quantity;
          } else if (dispatch.status === "completed") {
            dispatched += record.quantity;
          }
        }

        const minStock = item.minimumStock ?? 10;
        const available = Math.max(0, item.quantity - reserved);

        let status: "healthy" | "low" | "critical";
        if (item.quantity === 0 || available === 0) {
          status = "critical";
        } else if (available <= minStock) {
          status = "low";
        } else {
          status = "healthy";
        }

        return {
          ...item,
          available,
          reserved,
          dispatched,
          status,
          minimumStock: minStock,
        };
      }),
    );

    // Filter by category or search query if provided
    let filteredItems = enrichedItems;
    if (args.category && args.category !== "all") {
      filteredItems = filteredItems.filter((i) => i.category === args.category);
    }
    if (args.search && args.search.trim()) {
      const q = args.search.trim().toLowerCase();
      filteredItems = filteredItems.filter(
        (i) => i.itemName.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
      );
    }

    // Sort: critical first, then low, then alphabetical
    filteredItems.sort((a, b) => {
      const rank = { critical: 0, low: 1, healthy: 2 };
      if (rank[a.status] !== rank[b.status]) {
        return rank[a.status] - rank[b.status];
      }
      return a.itemName.localeCompare(b.itemName);
    });

    // Compute stats
    let totalAvailable = 0;
    let totalReserved = 0;
    let totalDispatched = 0;
    let healthyCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    const categoryBreakdown: Record<string, number> = {};

    enrichedItems.forEach((i) => {
      totalAvailable += i.available;
      totalReserved += i.reserved;
      totalDispatched += i.dispatched;
      if (i.status === "critical") criticalCount++;
      else if (i.status === "low") lowCount++;
      else healthyCount++;

      categoryBreakdown[i.category] = (categoryBreakdown[i.category] ?? 0) + i.available;
    });

    const lowStockAlerts = enrichedItems.filter((i) => i.status === "critical" || i.status === "low");

    return {
      camp,
      items: filteredItems,
      stats: {
        totalItems: enrichedItems.length,
        totalAvailable,
        totalReserved,
        totalDispatched,
        healthyCount,
        lowCount,
        criticalCount,
        categoryBreakdown,
      },
      lowStockAlerts,
    };
  },
});

/**
 * Get recent inventory transactions (stock movements, restocks, dispatches, damages).
 */
export const getInventoryTransactions = query({
  args: {
    limit: v.optional(v.number()),
    inventoryId: v.optional(v.id("inventory")),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;
    if (!campId) return [];

    let transactionsQuery = ctx.db
      .query("inventoryTransactions")
      .withIndex("by_camp", (q) => q.eq("campId", campId));

    const raw = await transactionsQuery.order("desc").take(args.limit ?? 50);

    let filtered = raw;
    if (args.inventoryId) {
      filtered = filtered.filter((t) => t.inventoryId === args.inventoryId);
    }

    return await Promise.all(
      filtered.map(async (tx) => {
        const [item, performer, dispatch] = await Promise.all([
          ctx.db.get(tx.inventoryId),
          ctx.db.get(tx.performedBy),
          tx.dispatchId ? ctx.db.get(tx.dispatchId) : null,
        ]);

        return {
          ...tx,
          itemName: item?.itemName ?? "Unknown Item",
          category: item?.category ?? "other",
          unit: item?.unit ?? "units",
          performerName: performer?.name ?? "Coordinator",
          dispatchStatus: dispatch?.status ?? null,
        };
      }),
    );
  },
});

/**
 * Add a new inventory item or increment stock for an existing item at the camp.
 */
export const addStockItem = mutation({
  args: {
    itemName: v.string(),
    category: categoryValidator,
    quantity: v.number(),
    unit: v.string(),
    minimumStock: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;
    if (!campId) {
      throw new Error("You must belong to an active relief camp to manage inventory");
    }

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    const trimmedName = args.itemName.trim();
    const now = Date.now();

    // Check if item already exists in this camp with same name & category
    const existingItems = await ctx.db
      .query("inventory")
      .withIndex("by_camp", (q) => q.eq("campId", campId))
      .collect();

    const existing = existingItems.find(
      (item) => item.itemName.toLowerCase() === trimmedName.toLowerCase() && item.category === args.category,
    );

    let inventoryId: Id<"inventory">;

    if (existing) {
      const newQty = existing.quantity + args.quantity;
      await ctx.db.patch(existing._id, {
        quantity: newQty,
        unit: args.unit.trim() || existing.unit,
        minimumStock: args.minimumStock ?? existing.minimumStock,
        updatedBy: coordinator._id,
        updatedAt: now,
      });
      inventoryId = existing._id;
    } else {
      inventoryId = await ctx.db.insert("inventory", {
        campId,
        itemName: trimmedName,
        category: args.category,
        quantity: args.quantity,
        unit: args.unit.trim() || "units",
        minimumStock: args.minimumStock ?? 10,
        updatedBy: coordinator._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Record stock addition in audit trail
    await ctx.db.insert("inventoryTransactions", {
      inventoryId,
      campId,
      type: "in",
      quantity: args.quantity,
      note: args.note?.trim() || `Received stock: +${args.quantity} ${args.unit}`,
      performedBy: coordinator._id,
      createdAt: now,
    });

    return inventoryId;
  },
});

/**
 * Adjust stock: Restock (in), Consume / Damaged / Expired (out), or Direct Correction.
 */
export const adjustStock = mutation({
  args: {
    inventoryId: v.id("inventory"),
    actionType: v.union(
      v.literal("restock"),
      v.literal("consume"),
      v.literal("damaged"),
      v.literal("expired"),
      v.literal("correction"),
    ),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const item = await ctx.db.get(args.inventoryId);

    if (!item) {
      throw new Error("Inventory item not found");
    }

    if (coordinator.role !== "admin" && item.campId !== coordinator.campId) {
      throw new Error("Unauthorized: Item does not belong to your camp");
    }

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    const now = Date.now();
    let newQuantity = item.quantity;
    let txType: "in" | "out" | "adjustment";
    let defaultNote = "";

    switch (args.actionType) {
      case "restock":
        newQuantity = item.quantity + args.quantity;
        txType = "in";
        defaultNote = `Restocked +${args.quantity} ${item.unit}`;
        break;
      case "consume":
        if (item.quantity < args.quantity) {
          throw new Error(`Insufficient stock. Current stock is ${item.quantity} ${item.unit}`);
        }
        newQuantity = item.quantity - args.quantity;
        txType = "out";
        defaultNote = `Field consumed/distributed -${args.quantity} ${item.unit}`;
        break;
      case "damaged":
        if (item.quantity < args.quantity) {
          throw new Error(`Cannot write off more than available stock (${item.quantity} ${item.unit})`);
        }
        newQuantity = item.quantity - args.quantity;
        txType = "out";
        defaultNote = `Damaged/spoiled write-off: -${args.quantity} ${item.unit}`;
        break;
      case "expired":
        if (item.quantity < args.quantity) {
          throw new Error(`Cannot write off more than available stock (${item.quantity} ${item.unit})`);
        }
        newQuantity = item.quantity - args.quantity;
        txType = "out";
        defaultNote = `Expired write-off: -${args.quantity} ${item.unit}`;
        break;
      case "correction":
        newQuantity = Math.max(0, args.quantity);
        txType = "adjustment";
        defaultNote = `Physical inventory audit adjustment set to ${args.quantity} ${item.unit}`;
        break;
      default:
        throw new Error("Invalid action type");
    }

    await ctx.db.patch(item._id, {
      quantity: newQuantity,
      updatedBy: coordinator._id,
      updatedAt: now,
    });

    await ctx.db.insert("inventoryTransactions", {
      inventoryId: item._id,
      campId: item.campId,
      type: txType,
      quantity: args.quantity,
      note: args.note?.trim() || defaultNote,
      performedBy: coordinator._id,
      createdAt: now,
    });

    return item._id;
  },
});

/**
 * Request restock for an item (creates a high-priority audit flag for HQ and nearby bases).
 */
export const requestRestock = mutation({
  args: {
    inventoryId: v.id("inventory"),
    requestedQuantity: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const item = await ctx.db.get(args.inventoryId);

    if (!item) {
      throw new Error("Inventory item not found");
    }

    const now = Date.now();
    const noteText = `RESTOCK REQUEST [${args.priority.toUpperCase()}]: ${args.requestedQuantity} ${item.unit}. ${args.note?.trim() ?? ""}`;

    await ctx.db.insert("inventoryTransactions", {
      inventoryId: item._id,
      campId: item.campId,
      type: "adjustment",
      quantity: args.requestedQuantity,
      note: noteText,
      performedBy: coordinator._id,
      createdAt: now,
    });

    return item._id;
  },
});

/**
 * Seed standard disaster relief inventory for a newly created or empty relief base.
 */
export const seedStandardCampInventory = mutation({
  args: {},
  handler: async (ctx) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;

    if (!campId) {
      throw new Error("You must belong to an active relief camp to initialize stock");
    }

    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_camp", (q) => q.eq("campId", campId))
      .first();

    if (existing) {
      throw new Error("Camp already has inventory items. Use '+ Add Stock' to add more items.");
    }

    const now = Date.now();

    const standardSupplies = [
      {
        itemName: "Clean Drinking Water",
        category: "water" as const,
        quantity: 820,
        unit: "Liters",
        minimumStock: 250,
      },
      {
        itemName: "Emergency Food Rations",
        category: "food" as const,
        quantity: 420,
        unit: "Packs",
        minimumStock: 100,
      },
      {
        itemName: "Trauma & First Aid Kits",
        category: "first_aid" as const,
        quantity: 72,
        unit: "Kits",
        minimumStock: 25,
      },
      {
        itemName: "Thermal Blankets",
        category: "blanket" as const,
        quantity: 18,
        unit: "Units",
        minimumStock: 40, // Trigger low stock indicator
      },
      {
        itemName: "Essential Antibiotics & ORS",
        category: "medicine" as const,
        quantity: 12,
        unit: "Boxes",
        minimumStock: 30, // Trigger critical stock indicator
      },
      {
        itemName: "Rescue Ropes & Carabiners",
        category: "equipment" as const,
        quantity: 45,
        unit: "Sets",
        minimumStock: 15,
      },
      {
        itemName: "All-Weather Emergency Tents",
        category: "equipment" as const,
        quantity: 30,
        unit: "Tents",
        minimumStock: 10,
      },
      {
        itemName: "High-Beam Flashlights & Batteries",
        category: "equipment" as const,
        quantity: 60,
        unit: "Packs",
        minimumStock: 20,
      },
    ];

    for (const supply of standardSupplies) {
      const id = await ctx.db.insert("inventory", {
        campId,
        itemName: supply.itemName,
        category: supply.category,
        quantity: supply.quantity,
        unit: supply.unit,
        minimumStock: supply.minimumStock,
        updatedBy: coordinator._id,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("inventoryTransactions", {
        inventoryId: id,
        campId,
        type: "in",
        quantity: supply.quantity,
        note: `Base Initial Standard Relief Allocation: ${supply.quantity} ${supply.unit}`,
        performedBy: coordinator._id,
        createdAt: now,
      });
    }

    return standardSupplies.length;
  },
});

/**
 * Get field facilities (shelters, community water points, medical points, roads) in the camp area.
 */
export const getFieldResources = query({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;

    let resources = campId
      ? await ctx.db
          .query("resources")
          .withIndex("by_camp", (q) => q.eq("campId", campId))
          .collect()
      : await ctx.db.query("resources").collect();

    if (args.type && args.type !== "all") {
      resources = resources.filter((r) => r.type === args.type);
    }

    return resources.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
  },
});

/**
 * Add an external field resource / facility (shelter, water point, clinic, road block).
 */
export const addFieldResource = mutation({
  args: {
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
    capacity: v.optional(v.number()),
    occupiedCapacity: v.optional(v.number()),
    roadStatus: v.optional(v.union(v.literal("open"), v.literal("partially_blocked"), v.literal("blocked"))),
    contactMethod: v.optional(v.union(v.literal("phone"), v.literal("email"), v.literal("in_person"), v.literal("none"))),
    contactValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const now = Date.now();

    const resourceId = await ctx.db.insert("resources", {
      name: args.name.trim(),
      type: args.type,
      description: args.description?.trim(),
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address.trim(),
      capacity: args.capacity,
      availableQuantity: args.capacity ? Math.max(0, args.capacity - (args.occupiedCapacity ?? 0)) : undefined,
      occupiedCapacity: args.occupiedCapacity,
      roadStatus: args.roadStatus,
      contactMethod: args.contactMethod,
      contactValue: args.contactValue?.trim(),
      verificationStatus: "verified",
      providerId: coordinator._id,
      campId: coordinator.campId,
      verifiedBy: coordinator._id,
      verifiedAt: now,
      lastUpdatedAt: now,
      createdAt: now,
    });

    return resourceId;
  },
});

/**
 * Update field facility status or occupancy.
 */
export const updateFieldResource = mutation({
  args: {
    resourceId: v.id("resources"),
    occupiedCapacity: v.optional(v.number()),
    roadStatus: v.optional(v.union(v.literal("open"), v.literal("partially_blocked"), v.literal("blocked"))),
    verificationStatus: v.optional(
      v.union(v.literal("unverified"), v.literal("verified"), v.literal("unavailable"), v.literal("outdated")),
    ),
  },
  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    const resource = await ctx.db.get(args.resourceId);

    if (!resource) {
      throw new Error("Resource not found");
    }

    const now = Date.now();
    const newOccupied = args.occupiedCapacity !== undefined ? args.occupiedCapacity : resource.occupiedCapacity;
    const availableQty =
      resource.capacity !== undefined && newOccupied !== undefined
        ? Math.max(0, resource.capacity - newOccupied)
        : resource.availableQuantity;

    await ctx.db.patch(resource._id, {
      ...(args.occupiedCapacity !== undefined ? { occupiedCapacity: args.occupiedCapacity } : {}),
      availableQuantity: availableQty,
      ...(args.roadStatus ? { roadStatus: args.roadStatus } : {}),
      ...(args.verificationStatus ? { verificationStatus: args.verificationStatus } : {}),
      verifiedBy: coordinator._id,
      verifiedAt: now,
      lastUpdatedAt: now,
    });

    return resource._id;
  },
});
