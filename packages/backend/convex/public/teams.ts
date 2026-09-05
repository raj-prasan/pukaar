import { query } from "../_generated/server";
import { requireCoordinator } from "../private/auth";
import type { Id } from "../_generated/dataModel";

const ACTIVE_DISPATCH_STATUSES = new Set([
  "created",
  "dispatched",
  "accepted",
  "en_route",
  "arrived",
]);

export const getCoordinatorTeams = query({
  args: {},
  handler: async (ctx) => {
    const coordinator = await requireCoordinator(ctx);
    const campId = coordinator.campId;

    let camps = campId
      ? await ctx.db
          .query("camps")
          .filter((q) => q.eq(q.field("_id"), campId))
          .collect()
      : await ctx.db
          .query("camps")
          .filter((q) => q.eq(q.field("createdBy"), coordinator._id))
          .collect();

    if (camps.length === 0) {
      camps = await ctx.db
        .query("camps")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();
    }

    if (camps.length === 0) {
      camps = await ctx.db.query("camps").collect();
    }

    const volunteerDocs = await ctx.db.query("volunteers").collect();
    const volunteerUsers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "volunteer"))
      .collect();

    const allVolunteersMap = new Map<
      Id<"users">,
      { userId: Id<"users">; campId?: Id<"camps">; phone?: string; isActive: boolean }
    >();

    for (const user of volunteerUsers) {
      allVolunteersMap.set(user._id, {
        userId: user._id,
        campId: user.campId,
        phone: user.phone,
        isActive: user.isActive,
      });
    }

    for (const vDoc of volunteerDocs) {
      const existing = allVolunteersMap.get(vDoc.userId);
      allVolunteersMap.set(vDoc.userId, {
        userId: vDoc.userId,
        campId: vDoc.campId ?? existing?.campId,
        phone: vDoc.phone ?? existing?.phone,
        isActive: vDoc.isActive ?? existing?.isActive ?? true,
      });
    }

    const scopedVolunteers = Array.from(allVolunteersMap.values()).filter((vol) =>
      campId ? vol.campId === campId : coordinator.role === "admin"
    );

    const enrichedVolunteers = await Promise.all(
      scopedVolunteers.map(async (vol) => {
        const user = await ctx.db.get(vol.userId);
        if (!user) return null;

        const dispatches = await ctx.db
          .query("dispatches")
          .withIndex("by_volunteer", (q) => q.eq("volunteerId", user._id))
          .collect();

        const activeDispatch =
          dispatches.find((d) => ACTIVE_DISPATCH_STATUSES.has(d.status)) ??
          dispatches.sort((a, b) => b.updatedAt - a.updatedAt)[0];

        const request = activeDispatch ? await ctx.db.get(activeDispatch.requestId) : null;

        const locations = await ctx.db
          .query("volunteerLocations")
          .withIndex("by_volunteer", (q) => q.eq("volunteerId", user._id))
          .collect();
        const latestLocation = locations.sort((a, b) => b.timestamp - a.timestamp)[0];

        return {
          _id: user._id,
          userId: user._id,
          name: user.name,
          phone: vol.phone ?? user.phone,
          campId: vol.campId ?? user.campId,
          isActive: vol.isActive && user.isActive,
          dispatch: activeDispatch
            ? {
                _id: activeDispatch._id,
                status: activeDispatch.status,
                instructions: activeDispatch.instructions,
                updatedAt: activeDispatch.updatedAt,
                dispatchedAt: activeDispatch.dispatchedAt,
              }
            : null,
          request: request
            ? {
                _id: request._id,
                category: request.category,
                description: request.description,
                address: request.address,
                priority: request.priority,
                status: request.status,
              }
            : null,
          latestLocation: latestLocation
            ? {
                latitude: latestLocation.latitude,
                longitude: latestLocation.longitude,
                accuracy: latestLocation.accuracy,
                timestamp: latestLocation.timestamp,
              }
            : null,
        };
      })
    );

    const validVolunteers = enrichedVolunteers.filter(
      (v): v is NonNullable<typeof v> => v !== null
    );

    return camps.map((camp) => ({
      ...camp,
      volunteers: validVolunteers.filter((v) => v.campId === camp._id),
    }));
  },
});
