import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireRole(ctx: QueryCtx | MutationCtx, allowedRoles: string[]) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .unique();

  if (!profile || !allowedRoles.includes(profile.role)) {
    throw new Error("Insufficient permissions");
  }

  return profile;
}

export const createMatches = mutation({
  args: {
    eventId: v.id("events"),
    courtId: v.id("courts"),
    matchNumber: v.number(),
    playerIds: v.array(v.id("userProfiles")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "matchmaker"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "confirmed") {
      throw new Error("Event not found or not confirmed");
    }

    const court = await ctx.db.get(args.courtId);
    if (!court || court.eventId !== args.eventId) {
      throw new Error("Court not found or not part of this event");
    }

    if (args.playerIds.length !== court.capacity) {
      throw new Error(`Court requires exactly ${court.capacity} players`);
    }

    // Verify all players are confirmed for this event
    const acceptedInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const acceptedPlayerIds = acceptedInvitations.map(inv => inv.playerId);
    
    for (const playerId of args.playerIds) {
      if (!acceptedPlayerIds.includes(playerId)) {
        throw new Error("All players must be confirmed for this event");
      }
    }

    return await ctx.db.insert("matches", {
      eventId: args.eventId,
      courtId: args.courtId,
      matchNumber: args.matchNumber,
      playerIds: args.playerIds,
      status: "scheduled",
    });
  },
});

export const getMatchesByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "matchmaker", "organizer"]);

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get player and court details
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const players = await Promise.all(
          match.playerIds.map(id => ctx.db.get(id))
        );
        const court = await ctx.db.get(match.courtId);
        
        return {
          ...match,
          players,
          court,
        };
      })
    );

    return matchesWithDetails;
  },
});

export const recordMatchScore = mutation({
  args: {
    matchId: v.id("matches"),
    scores: v.array(v.object({
      set: v.number(),
      player1Score: v.number(),
      player2Score: v.number(),
    })),
    winnerId: v.id("userProfiles"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "matchmaker"]);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (!match.playerIds.includes(args.winnerId)) {
      throw new Error("Winner must be one of the match players");
    }

    await ctx.db.patch(args.matchId, {
      scores: args.scores,
      winnerId: args.winnerId,
      status: "completed",
      completedAt: Date.now(),
    });

    // Check if all matches for the event are completed
    const eventMatches = await ctx.db
      .query("matches")
      .withIndex("by_event", (q) => q.eq("eventId", match.eventId))
      .collect();

    const allCompleted = eventMatches.every(m => m.status === "completed");
    
    if (allCompleted) {
      await ctx.db.patch(match.eventId, { status: "completed" });
    }
  },
});

export const getPlayerMatches = query({
  args: {},
  handler: async (ctx) => {
    // Any authenticated user can view their matches
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const allMatches = await ctx.db.query("matches").collect();
    const matches = allMatches.filter(match => match.playerIds.includes(profile._id));

    // Get event and court details
    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const event = await ctx.db.get(match.eventId);
        const court = await ctx.db.get(match.courtId);
        const players = await Promise.all(
          match.playerIds.map(id => ctx.db.get(id))
        );
        
        return {
          ...match,
          event,
          court,
          players,
        };
      })
    );

    return matchesWithDetails;
  },
});
