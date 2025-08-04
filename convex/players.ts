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

// Get all users who can play (everyone now, since all roles can be players)
export const getAllPlayers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "organizer"]);

    return await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getAllMatchmakers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "organizer"]);

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "matchmaker"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getPlayerInvitations = query({
  args: {},
  handler: async (ctx) => {
    // Any authenticated user can check their invitations
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

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_player", (q) => q.eq("playerId", profile._id))
      .collect();

    // Get event details for each invitation
    const events = await Promise.all(
      invitations.map(inv => ctx.db.get(inv.eventId))
    );

    return invitations.map((inv, index) => ({
      ...inv,
      event: events[index],
    }));
  },
});

export const respondToInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
    response: v.union(v.literal("accepted"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    // Any authenticated user can respond to their invitations
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

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.playerId !== profile._id) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation already responded to");
    }

    const event = await ctx.db.get(invitation.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if deadline has passed
    if (new Date() > new Date(event.inviteDeadline)) {
      await ctx.db.patch(args.invitationId, { 
        status: "expired",
        respondedAt: Date.now(),
      });
      throw new Error("Invitation deadline has passed");
    }

    // If accepting, check if event is full
    if (args.response === "accepted") {
      const acceptedInvitations = await ctx.db
        .query("invitations")
        .withIndex("by_event", (q) => q.eq("eventId", invitation.eventId))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .collect();

      if (acceptedInvitations.length >= event.totalCapacity) {
        throw new Error("Event is full");
      }
    }

    await ctx.db.patch(args.invitationId, {
      status: args.response,
      respondedAt: Date.now(),
    });

    // Check if event is now full and should be confirmed
    if (args.response === "accepted") {
      const acceptedInvitations = await ctx.db
        .query("invitations")
        .withIndex("by_event", (q) => q.eq("eventId", invitation.eventId))
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .collect();

      if (acceptedInvitations.length === event.totalCapacity) {
        await ctx.db.patch(invitation.eventId, { status: "confirmed" });
      }
    }
  },
});

export const toggleUserActiveStatus = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "organizer"]);

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.targetUserId))
      .unique();

    if (!targetProfile) {
      throw new Error("Target user profile not found");
    }

    if (targetProfile.role === "admin") {
      throw new Error("Cannot deactivate admin users");
    }

    await ctx.db.patch(targetProfile._id, { isActive: !targetProfile.isActive });
    
    return { 
      message: `User ${targetProfile.isActive ? "deactivated" : "activated"} successfully`,
      newStatus: !targetProfile.isActive
    };
  },
});
