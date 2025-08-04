import { query, QueryCtx, MutationCtx } from "./_generated/server";
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

export const getPlayerParticipationReport = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "organizer"]);

    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const allProfiles = await ctx.db.query("userProfiles").collect();
    const playerStats = new Map();

    // Initialize stats for all players
    for (const profile of allProfiles) {
      playerStats.set(profile._id, {
        profile,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        events: new Set(),
      });
    }

    // Process each completed match
    for (const match of allMatches) {
      const event = await ctx.db.get(match.eventId);
      
      for (const playerId of match.playerIds) {
        const stats = playerStats.get(playerId);
        if (stats) {
          stats.totalMatches++;
          stats.events.add(event?.name || "Unknown Event");
          
          if (match.winnerId === playerId) {
            stats.wins++;
          } else {
            stats.losses++;
          }
        }
      }
    }

    return Array.from(playerStats.values())
      .map(stats => ({
        ...stats,
        winRate: stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0,
        events: Array.from(stats.events),
      }))
      .filter(stats => stats.totalMatches > 0)
      .sort((a, b) => b.totalMatches - a.totalMatches);
  },
});

export const getEventParticipationReport = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer", "matchmaker"]);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const playerStats = new Map();

    // Initialize stats for all invited players
    for (const invitation of invitations) {
      const player = await ctx.db.get(invitation.playerId);
      if (player) {
        playerStats.set(invitation.playerId, {
          profile: player,
          invitationStatus: invitation.status,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        });
      }
    }

    // Process matches
    for (const match of matches) {
      if (match.status === "completed") {
        for (const playerId of match.playerIds) {
          const stats = playerStats.get(playerId);
          if (stats) {
            stats.totalMatches++;
            if (match.winnerId === playerId) {
              stats.wins++;
            } else {
              stats.losses++;
            }
          }
        }
      }
    }

    const reportData = Array.from(playerStats.values())
      .map(stats => ({
        ...stats,
        winRate: stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0,
      }))
      .sort((a, b) => {
        if (a.invitationStatus === "accepted" && b.invitationStatus !== "accepted") return -1;
        if (b.invitationStatus === "accepted" && a.invitationStatus !== "accepted") return 1;
        return b.totalMatches - a.totalMatches;
      });

    return {
      event,
      playerStats: reportData,
      summary: {
        totalInvited: invitations.length,
        totalAccepted: invitations.filter(inv => inv.status === "accepted").length,
        totalMatches: matches.length,
        completedMatches: matches.filter(m => m.status === "completed").length,
      }
    };
  },
});
