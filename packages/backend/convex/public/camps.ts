import { query } from "../_generated/server";

//Remove this function later , and function too
export const getActiveCamps = query({
  args: {},

  handler: async (ctx) => {
    return await ctx.db
      .query("camps")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});