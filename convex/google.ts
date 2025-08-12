import { v }: any from "convex/values";
import { mutation, query, action }: any from "./_generated/server";

export const saveCredentials = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiryDate: v.number(),
    scopes: v.string(),
  },
  handler: async (ctx: any, args) => {
    // TODO: Encrypt tokens before saving in production
    const credentialId = await ctx.db.insert("google_credentials", {
      ...args,
      provider: "google",
      createdAt: Date.now(),
    });

    return credentialId;
  },
});

export const getCredentials = query({
  args: { orgId: v.id("organizations") }: any,
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("google_credentials")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
  },
});

export const refreshAccessToken = action({
  args: { credentialId: v.id("google_credentials") }: any,
  handler: async (ctx: any, { credentialId }: any) => {
    const credentials = await ctx.runQuery("google_credentials", "get", {
      id: credentialId,
    });

    if (!credentials) {
      throw new Error("Credentials not found");
    }

    if (Date.now() < credentials.expiryDate) {
      return credentials.accessToken; // Still valid
    }

    // Refresh the token
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const data = await response.json();

    // Update stored credentials
    await ctx.runMutation("google_credentials", "patch", {
      id: credentialId,
      accessToken: data.access_token,
      expiryDate: Date.now() + data.expires_in * 1000,
    });

    return data.access_token;
  },
});

export const createCalendarEvent = action({
  args: {
    orgId: v.id("organizations"),
    summary: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(), // ISO string
    endTime: v.string(), // ISO string
    attendeeEmail: v.optional(v.string()),
  },
  handler: async (ctx: any, args) => {
    const credentials = await ctx.runQuery("google_credentials", "by_org", {
      orgId: args.orgId,
    });

    if (!credentials) {
      throw new Error("No Google credentials found for organization");
    }

    const accessToken = await ctx.runAction("google", "refreshAccessToken", {
      credentialId: credentials._id,
    });

    const event = {
      summary: args.summary,
      description: args.description,
      start: {
        dateTime: args.startTime,
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: args.endTime,
        timeZone: "America/Sao_Paulo",
      },
      attendees: args.attendeeEmail ? [{ email: args.attendeeEmail }: any] : [],
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" }: any,
        },
      },
    };

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar API error: ${error}`);
    }

    return await response.json();
  },
});