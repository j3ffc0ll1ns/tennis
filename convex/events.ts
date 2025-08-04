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

export const createEvent = mutation({
  args: {
    name: v.string(),
    date: v.string(),
    location: v.string(),
    startTime: v.string(),
    courtsReserved: v.number(),
    matchesPerCourt: v.number(),
    matchmakerId: v.id("userProfiles"),
    inviteDeadline: v.string(),
  },
  handler: async (ctx, args) => {
    const organizer = await requireRole(ctx, ["admin", "organizer"]);

    // Verify matchmaker exists and has correct role
    const matchmaker = await ctx.db.get(args.matchmakerId);
    if (!matchmaker || matchmaker.role !== "matchmaker") {
      throw new Error("Invalid matchmaker");
    }

    const eventId = await ctx.db.insert("events", {
      name: args.name,
      date: args.date,
      location: args.location,
      startTime: args.startTime,
      courtsReserved: args.courtsReserved,
      matchesPerCourt: args.matchesPerCourt,
      matchmakerId: args.matchmakerId,
      organizerId: organizer._id,
      status: "setup",
      inviteDeadline: args.inviteDeadline,
      totalCapacity: 0, // Will be calculated after courts are added
    });

    return eventId;
  },
});

export const addCourt = mutation({
  args: {
    eventId: v.id("events"),
    courtNumber: v.number(),
    label: v.string(),
    surfaceType: v.union(v.literal("grass"), v.literal("clay"), v.literal("hard")),
    capacity: v.union(v.literal(2), v.literal(4)),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "setup") {
      throw new Error("Event not found or not in setup phase");
    }

    const courtId = await ctx.db.insert("courts", {
      eventId: args.eventId,
      courtNumber: args.courtNumber,
      label: args.label,
      surfaceType: args.surfaceType,
      capacity: args.capacity,
    });

    // Update total capacity
    const courts = await ctx.db
      .query("courts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalCapacity = courts.reduce((sum, court) => sum + court.capacity, 0);

    await ctx.db.patch(args.eventId, { totalCapacity });

    return courtId;
  },
});

export const getEventsByOrganizer = query({
  args: {},
  handler: async (ctx) => {
    const organizer = await requireRole(ctx, ["admin", "organizer"]);

    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", organizer._id))
      .collect();

    // Get invitation statistics for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const invitations = await ctx.db
          .query("invitations")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const stats = {
          totalInvited: invitations.length,
          accepted: invitations.filter(inv => inv.status === "accepted").length,
          declined: invitations.filter(inv => inv.status === "declined").length,
          pending: invitations.filter(inv => inv.status === "pending").length,
        };

        return { ...event, invitationStats: stats };
      })
    );

    return eventsWithStats;
  },
});

export const getEventsByMatchmaker = query({
  args: {},
  handler: async (ctx) => {
    const matchmaker = await requireRole(ctx, ["admin", "matchmaker"]);

    return await ctx.db
      .query("events")
      .withIndex("by_matchmaker", (q) => q.eq("matchmakerId", matchmaker._id))
      .collect();
  },
});

export const getEventDetails = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer", "matchmaker"]);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const courts = await ctx.db
      .query("courts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Get player details for invitations
    const playerIds = invitations.map(inv => inv.playerId);
    const players = await Promise.all(
      playerIds.map(id => ctx.db.get(id))
    );

    const invitationsWithPlayers = invitations.map((inv, index) => ({
      ...inv,
      player: players[index],
    }));

    return {
      event,
      courts,
      invitations: invitationsWithPlayers,
    };
  },
});

export const invitePlayer = mutation({
  args: {
    eventId: v.id("events"),
    playerId: v.id("userProfiles"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "setup") {
      throw new Error("Event not found or not in setup phase");
    }

    // Check if player is already invited
    const existingInvite = await ctx.db
      .query("invitations")
      .withIndex("by_event_and_player", (q) => 
        q.eq("eventId", args.eventId).eq("playerId", args.playerId)
      )
      .unique();

    if (existingInvite) {
      throw new Error("Player already invited");
    }

    return await ctx.db.insert("invitations", {
      eventId: args.eventId,
      playerId: args.playerId,
      status: "pending",
      invitedAt: Date.now(),
    });
  },
});

export const startInviting = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer"]);

    const event = await ctx.db.get(args.eventId);
    if (!event || event.status !== "setup") {
      throw new Error("Event not found or not in setup phase");
    }

    // Verify courts are set up
    const courts = await ctx.db
      .query("courts")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    if (courts.length !== event.courtsReserved) {
      throw new Error("All courts must be configured before starting invitations");
    }

    await ctx.db.patch(args.eventId, { status: "inviting" });
  },
});
