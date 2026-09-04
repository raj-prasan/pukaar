import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const { isAuthenticated } = await auth();

  const isPublicRoute =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (!isPublicRoute && !isAuthenticated) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
