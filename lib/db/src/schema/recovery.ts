import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recoveryKeysTable = pgTable("recovery_keys", {
  key: text("key").primaryKey(),
  guildId: text("guild_id").notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRecoveryKeySchema = createInsertSchema(recoveryKeysTable).omit({ createdAt: true });
export type InsertRecoveryKey = z.infer<typeof insertRecoveryKeySchema>;
export type RecoveryKey = typeof recoveryKeysTable.$inferSelect;
