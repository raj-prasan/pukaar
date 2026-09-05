import { query } from "../_generated/server";
import { requireCoordinator } from "../private/auth";

export const getCoordinatorMapData = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCoordinator(ctx);

    const [reports, incidents, volunteerLocations, camps] = await Promise.all([
      ctx.db.query("reports").withIndex("by_created_at").order("desc").collect(),
      ctx.db.query("incidents").withIndex("by_updated_at").order("desc").collect(),
      ctx.db.query("volunteerLocations").withIndex("by_timestamp").order("desc").collect(),
      ctx.db.query("camps").collect(),
    ]);

    const volunteers = await Promise.all(
      volunteerLocations.map(async (location) => {
        const [dispatch, volunteer] = await Promise.all([
          ctx.db.get(location.dispatchId),
          ctx.db.get(location.volunteerId),
        ]);

        return {
          ...location,
          dispatchStatus: dispatch?.status ?? "unknown",
          volunteerName: volunteer?.name ?? "Volunteer",
        };
      }),
    );

    const enrichedCamps = camps.map((camp) => {
      const isMyCamp = camp._id === user.campId || camp.createdBy === user._id;
      return {
        ...camp,
        isMyCamp,
      };
    });

    return {
      reports,
      incidents,
      volunteers,
      camps: enrichedCamps,
      currentUserId: user._id,
      userCampId: user.campId,
    };
  },
});
