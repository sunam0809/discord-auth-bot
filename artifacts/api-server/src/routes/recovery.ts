import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, recoveryKeysTable, verifiedMembersTable } from "@workspace/db";
import {
  CreateRecoveryKeyBody,
  UseRecoveryKeyParams,
  UseRecoveryKeyBody,
  UseRecoveryKeyResponse,
} from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

router.post("/recovery-keys", async (req, res): Promise<void> => {
  const body = CreateRecoveryKeyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const key = crypto.randomBytes(16).toString("hex").toUpperCase();

  const [recoveryKey] = await db
    .insert(recoveryKeysTable)
    .values({
      key,
      guildId: body.data.guildId,
    })
    .returning();

  res.status(201).json({
    key: recoveryKey.key,
    guildId: recoveryKey.guildId,
    usedAt: recoveryKey.usedAt?.toISOString() ?? null,
    createdAt: recoveryKey.createdAt.toISOString(),
  });
});

router.post("/recovery-keys/:key/use", async (req, res): Promise<void> => {
  const params = UseRecoveryKeyParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UseRecoveryKeyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [recoveryKey] = await db
    .select()
    .from(recoveryKeysTable)
    .where(eq(recoveryKeysTable.key, params.data.key))
    .limit(1);

  if (!recoveryKey) {
    res.status(404).json({ error: "Recovery key not found" });
    return;
  }

  if (recoveryKey.usedAt) {
    res.status(400).json({ error: "Recovery key already used" });
    return;
  }

  // Mark as used
  await db
    .update(recoveryKeysTable)
    .set({ usedAt: new Date() })
    .where(eq(recoveryKeysTable.key, params.data.key));

  // Get all verified members from original guild
  const members = await db
    .select()
    .from(verifiedMembersTable)
    .where(eq(verifiedMembersTable.guildId, recoveryKey.guildId));

  const targetGuildId = body.data.targetGuildId;
  let invited = 0;
  let failed = 0;

  for (const member of members) {
    if (!member.accessToken) {
      failed++;
      continue;
    }

    try {
      const addRes = await fetch(`https://discord.com/api/guilds/${targetGuildId}/members/${member.discordId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ access_token: member.accessToken }),
      });

      if (addRes.ok || addRes.status === 204) {
        invited++;
        // Register member in the new guild
        const existing = await db
          .select()
          .from(verifiedMembersTable)
          .where(eq(verifiedMembersTable.discordId, member.discordId))
          .limit(1);

        if (!existing.find((m) => m.guildId === targetGuildId)) {
          await db.insert(verifiedMembersTable).values({
            discordId: member.discordId,
            username: member.username,
            avatar: member.avatar,
            guildId: targetGuildId,
            accessToken: member.accessToken,
            refreshToken: member.refreshToken,
          });
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  res.json(
    UseRecoveryKeyResponse.parse({
      invited,
      failed,
      total: members.length,
    }),
  );
});

export default router;
