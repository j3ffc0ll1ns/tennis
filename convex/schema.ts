import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Users with roles - now all users have skill levels since they can all play
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("organizer"), v.literal("matchmaker"), v.literal("player")),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    skillLevel: v.optional(v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced"))), // Optional for migration
    isActive: v.boolean(),
  }).index("by_user_id", ["userId"])
    .index("by_role", ["role"]),

  // Events created by organizers
  events: defineTable({
    name: v.string(),
    date: v.string(), // ISO date string
    location: v.string(),
    startTime: v.string(), // HH:MM format
    courtsReserved: v.number(),
    matchesPerCourt: v.number(),
    matchmakerId: v.id("userProfiles"),
    organizerId: v.id("userProfiles"),
    status: v.union(v.literal("setup"), v.literal("inviting"), v.literal("confirmed"), v.literal("in_progress"), v.literal("completed")),
    inviteDeadline: v.string(), // ISO date string
    totalCapacity: v.number(), // calculated field
  }).index("by_organizer", ["organizerId"])
    .index("by_matchmaker", ["matchmakerId"])
    .index("by_status", ["status"]),

  // Courts for each event
  courts: defineTable({
    eventId: v.id("events"),
    courtNumber: v.number(),
    label: v.string(),
    surfaceType: v.union(v.literal("grass"), v.literal("clay"), v.literal("hard")),
    capacity: v.union(v.literal(2), v.literal(4)), // 2 for singles, 4 for doubles
  }).index("by_event", ["eventId"]),

  // Player invitations
  invitations: defineTable({
    eventId: v.id("events"),
    playerId: v.id("userProfiles"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("expired")),
    invitedAt: v.number(),
    respondedAt: v.optional(v.number()),
  }).index("by_event", ["eventId"])
    .index("by_player", ["playerId"])
    .index("by_event_and_player", ["eventId", "playerId"]),

  // Matches within events
  matches: defineTable({
    eventId: v.id("events"),
    courtId: v.id("courts"),
    matchNumber: v.number(), // 1, 2, 3... for multiple matches per court
    playerIds: v.array(v.id("userProfiles")), // 2 or 4 players depending on court capacity
    status: v.union(v.literal("scheduled"), v.literal("in_progress"), v.literal("completed")),
    scores: v.optional(v.array(v.object({
      set: v.number(),
      player1Score: v.number(),
      player2Score: v.number(),
    }))),
    winnerId: v.optional(v.id("userProfiles")),
    completedAt: v.optional(v.number()),
  }).index("by_event", ["eventId"])
    .index("by_court", ["courtId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
