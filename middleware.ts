import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/inbox(.*)",
  "/sessions(.*)",
  "/settings(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/health",
  "/api/webhook/whatsapp",
]);

export default clerkMiddleware((auth, req) => {
  // Allow public API routes
  if (isPublicApiRoute(req)) {
    return;
  }

  // Protect all other routes
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};