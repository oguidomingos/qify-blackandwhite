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

  // Temporary: Allow dashboard access for demo purposes
  // In production, uncomment the lines below to protect routes
  if (isProtectedRoute(req)) {
    // auth().protect(); // Commented out for demo
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};