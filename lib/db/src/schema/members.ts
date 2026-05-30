import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const verifiedMembersTable = pgTable("verified_members", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  username: text("username").notNull(),
  avatar: text("avatar"),
  guildId: text("guild_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVerifiedMemberSchema = createInsertSchema(verifiedMembersTable).omit({ id: true, verifiedAt: true });
export type InsertVerifiedMember = z.infer<typeof insertVerifiedMemberSchema>;
export type VerifiedMember = typeof verifiedMembersTable.$inferSelect;
