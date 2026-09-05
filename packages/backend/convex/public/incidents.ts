import { mutation, query } from "../_generated/server";
import { v } from "convex/values";


export const getActiveIncidents = query({
  args: {},

  handler: async (ctx) => {
    const statuses = ["reported", "under_review", "verified", "active"] as const;
    const results = await Promise.all(
      statuses.map((status) =>
        ctx.db
          .query("incidents")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      )
    );

    return results
      .flat()
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});



