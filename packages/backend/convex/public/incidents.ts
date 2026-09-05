import { mutation, query } from "../_generated/server";
import { v } from "convex/values";


// Get currently active incidents
export const getActiveIncidents = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db
      .query("incidents")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "reported"),
          q.eq(q.field("status"), "under_review"),
          q.eq(q.field("status"), "verified"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .order("desc")
      .collect();
  },
});


