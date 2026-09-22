/**
 * Server-side helper: get the Evolution API instance name saved for this org.
 * Uses a cookie (`wa_instance`) set by /api/evolution/save-instance.
 */
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function getOrgInstance(): Promise<{
  instanceName: string | null;
  error?: string;
}> {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) return { instanceName: null, error: "Unauthorized" };

    const cookieStore = cookies();
    const instanceName = cookieStore.get("wa_instance")?.value || null;
    return { instanceName };
  } catch (e) {
    return { instanceName: null, error: String(e) };
  }
}
