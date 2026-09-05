import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireCoordinator } from "./auth";

export const verifyReport = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(
      v.literal("verified"),
      v.literal("rejected")
    ), 
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    if(!coordinator){
      throw new Error("UNAUTORIZED")
    }
    const report = await ctx.db.get(args.reportId);

    if (!report) {
      throw new Error("Report not found");
    }

    await ctx.db.patch(args.reportId, {
      verificationStatus: args.status,
      updatedAt: Date.now(),
    });

    

    return args.reportId;
  },
});

// Get reports waiting for verification
export const getPendingReports = query({
  args: {},

  handler: async (ctx) => {
    const coordinator = await requireCoordinator(ctx);
    if(!coordinator){
      throw new Error("UNAUTORIZED")
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_verification_status", (q) =>
        q.eq("verificationStatus", "pending")
      )
      .order("desc")
      .collect();
  },
});

export const getReportsByIncident = query({
  args: {
    incidentId: v.id("incidents"),
  },

  handler: async (ctx, args) => {
    const coordinator = await requireCoordinator(ctx);
    if (!coordinator) {
      throw new Error("UNAUTHORIZED");
    }

    return await ctx.db
      .query("reports")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .order("desc")
      .collect();
  },
});