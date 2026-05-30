import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guildConfigsTable = pgTable("guild_configs", {
  guildId: text("guild_id").primaryKey(),
  roleId: text("role_id"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGuildConfigSchema = createInsertSchema(guildConfigsTable).omit({ createdAt: true, updatedAt: true });
export type InsertGuildConfig = z.infer<typeof insertGuildConfigSchema>;
export type GuildConfig = typeof guildConfigsTable.$inferSelect;
