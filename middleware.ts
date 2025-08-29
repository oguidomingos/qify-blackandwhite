import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  // Temporarily disable protection for testing
  // "/dashboard(.*)",
  "/inbox(.*)",
  "/sessions(.*)",
  "/settings(.*)",
  "/ai-settings",
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

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};