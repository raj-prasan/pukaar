import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();

    // Clerk webhook event
    const eventType = payload.type;

    if (eventType === "user.created") {
      const user = payload.data;

      await ctx.runMutation(internal.private.users.createFromClerk, {
        clerkId: user.id,
        name:
          `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
          "User",
        email: user.email_addresses?.[0]?.email_address,
        phone: user.phone_numbers?.[0]?.phone_number,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;