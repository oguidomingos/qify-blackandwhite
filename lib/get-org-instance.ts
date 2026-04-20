/**
 * Server-side helper: get the Evolution API instance name saved for this org.
 * Used by all /api/evolution/* data routes.
 */
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function getOrgInstance(): Promise<{
  instanceName: string | null;
  error?: string;
}> {
  try {
    const { orgId: clerkOrgId, userId } = auth();
    if (!clerkOrgId && !userId) return { instanceName: null, error: "Unauthorized" };

    const account = await fetchQuery(api.wa.getByViewer, {
      clerkOrgId: clerkOrgId || undefined,
      userId: userId || undefined,
    });

    return { instanceName: account?.instanceName || null };
  } catch (e) {
    return { instanceName: null, error: String(e) };
  }
}
