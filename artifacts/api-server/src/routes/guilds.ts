import { Router, type IRouter } from "express";
import { eq, count, and, gte, sql } from "drizzle-orm";
import { db, guildConfigsTable, verifiedMembersTable } from "@workspace/db";
import {
  GetGuildConfigParams,
  GetGuildConfigResponse,
  UpsertGuildConfigParams,
  UpsertGuildConfigBody,
  UpsertGuildConfigResponse,
  ListGuildMembersParams,
  ListGuildMembersResponse,
  GetGuildStatsParams,
  GetGuildStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/guilds/:guildId/config", async (req, res): Promise<void> => {
  const params = GetGuildConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [config] = await db
    .select()
    .from(guildConfigsTable)
    .where(eq(guildConfigsTable.guildId, params.data.guildId))
    .limit(1);

  if (!config) {
    res.status(404).json({ error: "Guild config not found" });
    return;
  }

  res.json(GetGuildConfigResponse.parse({
    guildId: config.guildId,
    roleId: config.roleId ?? null,
    webhookUrl: config.webhookUrl ?? null,
    createdAt: config.createdAt.toISOString(),
  }));
});

router.put("/guilds/:guildId/config", async (req, res): Promise<void> => {
  const params = UpsertGuildConfigParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpsertGuildConfigBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [config] = await db
    .insert(guildConfigsTable)
    .values({
      guildId: params.data.guildId,
      roleId: body.data.roleId ?? null,
      webhookUrl: body.data.webhookUrl ?? null,
    })
    .onConflictDoUpdate({
      target: guildConfigsTable.guildId,
      set: {
        roleId: body.data.roleId ?? null,
        webhookUrl: body.data.webhookUrl ?? null,
      },
    })
    .returning();

  res.json(UpsertGuildConfigResponse.parse({
    guildId: config.guildId,
    roleId: config.roleId ?? null,
    webhookUrl: config.webhookUrl ?? null,
    createdAt: config.createdAt.toISOString(),
  }));
});

router.get("/guilds/:guildId/members", async (req, res): Promise<void> => {
  const params = ListGuildMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const members = await db
    .select()
    .from(verifiedMembersTable)
    .where(eq(verifiedMembersTable.guildId, params.data.guildId))
    .orderBy(sql`${verifiedMembersTable.verifiedAt} DESC`);

  const [totalRow] = await db
    .select({ total: count() })
    .from(verifiedMembersTable)
    .where(eq(verifiedMembersTable.guildId, params.data.guildId));

  res.json(
    ListGuildMembersResponse.parse({
      members: members.map((m) => ({
        id: m.id,
        discordId: m.discordId,
        username: m.username,
        avatar: m.avatar ?? null,
        guildId: m.guildId,
        verifiedAt: m.verifiedAt.toISOString(),
      })),
      total: totalRow?.total ?? 0,
    }),
  );
});

router.get("/guilds/:guildId/stats", async (req, res): Promise<void> => {
  const params = GetGuildStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const guildId = params.data.guildId;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [totalRow] = await db
    .select({ total: count() })
    .from(verifiedMembersTable)
    .where(eq(verifiedMembersTable.guildId, guildId));

  const [todayRow] = await db
    .select({ total: count() })
    .from(verifiedMembersTable)
    .where(and(eq(verifiedMembersTable.guildId, guildId), gte(verifiedMembersTable.verifiedAt, todayStart)));

  const [weekRow] = await db
    .select({ total: count() })
    .from(verifiedMembersTable)
    .where(and(eq(verifiedMembersTable.guildId, guildId), gte(verifiedMembersTable.verifiedAt, weekStart)));

  res.json(
    GetGuildStatsResponse.parse({
      totalVerified: totalRow?.total ?? 0,
      todayVerified: todayRow?.total ?? 0,
      thisWeekVerified: weekRow?.total ?? 0,
    }),
  );
});

export default router;
