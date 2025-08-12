import { auth } from "@clerk/nextjs/server";

export type Role = "owner" | "admin" | "sdr" | "viewer";

export function requireRole(roles: Role[]) {
  const { orgId, orgRole, userId } = auth();
  
  if (!userId || !orgId || !roles.includes(orgRole as Role)) {
    throw new Error("NOT_AUTHORIZED");
  }
  
  return { orgId, userId, role: orgRole as Role };
}

export function requireMember() {
  const { orgId, userId } = auth();
  
  if (!userId || !orgId) {
    throw new Error("NOT_AUTHORIZED");
  }
  
  return { orgId, userId };
}

export function getCurrentUser() {
  return auth();
}