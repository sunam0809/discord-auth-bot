import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

function getRedirectUri(_req?: unknown): string {
  const base =
    process.env.BOT_BASE_URL ||
    (process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "");
  return `${base}/api/auth/callback`;
}

router.get("/auth/url", async (req, res): Promise<void> => {
  const { guildId, returnUrl } = req.query as { guildId?: string; returnUrl?: string };

  if (!guildId) {
    res.status(400).json({ error: "guildId is required" });
    return;
  }

  const redirectUri = getRedirectUri(req);
  const state = Buffer.from(JSON.stringify({ guildId, returnUrl: returnUrl || "/" })).toString("base64url");

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.join",
    state,
  });

  const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  res.json({ url });
});

router.get("/auth/callback", async (req, res): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code || !state) {
    res.redirect("/?error=missing_params");
    return;
  }

  let stateData: { guildId: string; returnUrl: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    res.redirect("/failed?error=invalid_state");
    return;
  }

  const { guildId } = stateData;

  try {
    const redirectUri = getRedirectUri(req);

    // Exchange code for tokens
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      req.log.error({ status: tokenRes.status }, "Failed to exchange code for token");
      res.redirect("/failed?error=token_exchange_failed");
      return;
    }

    const tokens = await tokenRes.json() as { access_token: string; refresh_token: string };

    // Get user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      res.redirect("/failed?error=user_fetch_failed");
      return;
    }

    const user = await userRes.json() as {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };

    const { db, verifiedMembersTable, guildConfigsTable } = await import("@workspace/db");
    const { eq, and } = await import("drizzle-orm");

    // Check if already verified in this guild
    const existing = await db
      .select()
      .from(verifiedMembersTable)
      .where(and(eq(verifiedMembersTable.discordId, user.id), eq(verifiedMembersTable.guildId, guildId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(verifiedMembersTable).values({
        discordId: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar || null,
        guildId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
    } else {
      await db
        .update(verifiedMembersTable)
        .set({
          username: user.global_name || user.username,
          avatar: user.avatar || null,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        })
        .where(and(eq(verifiedMembersTable.discordId, user.id), eq(verifiedMembersTable.guildId, guildId)));
    }

    // Get guild config
    const [config] = await db
      .select()
      .from(guildConfigsTable)
      .where(eq(guildConfigsTable.guildId, guildId))
      .limit(1);

    let roleName: string | undefined;

    // Add member to guild and assign role
    if (config?.roleId) {
      try {
        // Add user to guild
        await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ access_token: tokens.access_token }),
        });

        // Assign role
        await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}/roles/${config.roleId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        });

        // Try to get role name
        const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (rolesRes.ok) {
          const roles = await rolesRes.json() as { id: string; name: string }[];
          roleName = roles.find((r) => r.id === config.roleId)?.name;
        }
      } catch (err) {
        req.log.warn({ err }, "Failed to assign role");
      }
    }

    // Send webhook notification
    if (config?.webhookUrl) {
      try {
        const avatarUrl = user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : `https://cdn.discordapp.com/embed/avatars/0.png`;

        await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "인증 봇",
            embeds: [
              {
                title: "새로운 인증 완료",
                color: 0x5865f2,
                thumbnail: { url: avatarUrl },
                fields: [
                  { name: "유저", value: `${user.global_name || user.username} (<@${user.id}>)`, inline: true },
                  { name: "서버 ID", value: guildId, inline: true },
                  { name: "역할", value: roleName || config.roleId || "없음", inline: true },
                  { name: "인증 시각", value: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), inline: false },
                ],
                footer: { text: "Discord 인증 시스템" },
              },
            ],
          }),
        });
      } catch (err) {
        req.log.warn({ err }, "Failed to send webhook");
      }
    }

    const avatarParam = user.avatar ? encodeURIComponent(user.avatar) : "";
    const usernameParam = encodeURIComponent(user.global_name || user.username);
    const roleParam = roleName ? encodeURIComponent(roleName) : "";

    res.redirect(
      `/success?username=${usernameParam}&userId=${user.id}&avatar=${avatarParam}&guildId=${encodeURIComponent(guildId)}&role=${roleParam}`,
    );
  } catch (err) {
    req.log.error({ err }, "Auth callback error");
    res.redirect("/failed?error=internal_error");
  }
});

export default router;
