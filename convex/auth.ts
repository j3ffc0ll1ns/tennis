import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const getUserProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.query("userProfiles").withIndex("by_user_id", (q: any) => q.eq("userId", userId)).unique();
  },
});

export const createUserProfile = mutation({
  args: {
    firstName: v.string(), lastName: v.string(),
    role: v.union(v.literal("admin"), v.literal("organizer"), v.literal("matchmaker"), v.literal("player")),
    phone: v.optional(v.string()), skillLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if there are any existing admins
    const existingAdmins = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q: any) => q.eq("role", "admin"))
      .collect();

    // Only allow admin role if this is the first user, otherwise restrict to player
    if (args.role !== "player") {
      if (args.role === "admin" && existingAdmins.length === 0) {
        // Allow first admin
      } else {
        throw new Error("Only admins can assign organizer and matchmaker roles");
      }
    }

    return await ctx.db.insert("userProfiles", { userId, ...args, isActive: true });
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Only admins can view all users");
    }

    const profiles = await ctx.db.query("userProfiles").collect();
    const users = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return { ...profile, user };
      })
    );

    return users;
  },
});

export const assignUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("organizer"), v.literal("matchmaker"), v.literal("player")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Only admins can assign roles");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", args.targetUserId))
      .unique();

    if (!targetProfile) {
      throw new Error("Target user profile not found");
    }

    await ctx.db.patch(targetProfile._id, { role: args.newRole });
  },
});

// Migration function to add skillLevel to existing users
export const migrateUsersSkillLevel = mutation({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q: any) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile || currentProfile.role !== "admin") {
      throw new Error("Only admins can run migrations");
    }

    const profiles = await ctx.db.query("userProfiles").collect();
    let updated = 0;

    for (const profile of profiles) {
      if (!profile.skillLevel) {
        await ctx.db.patch(profile._id, { skillLevel: "intermediate" });
        updated++;
      }
    }

    return { message: `Updated ${updated} user profiles with default skill level` };
  },
});
