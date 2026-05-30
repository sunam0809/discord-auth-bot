import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "./lib/logger";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;

const BASE_URL = (() => {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  return process.env.BOT_BASE_URL || "https://your-app.replit.app";
})();

const commands = [
  new SlashCommandBuilder()
    .setName("인증창")
    .setDescription("인증 버튼이 포함된 임베드를 이 채널에 전송합니다")
    .addStringOption((opt) =>
      opt.setName("제목").setDescription("인증 임베드 제목").setRequired(false),
    )
    .addStringOption((opt) =>
      opt.setName("설명").setDescription("인증 임베드 설명").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("복구키생성")
    .setDescription("현재 서버의 복구 키를 생성합니다 (인증된 유저 목록 저장)"),

  new SlashCommandBuilder()
    .setName("복구키사용")
    .setDescription("복구 키를 사용하여 이전 서버의 인증된 유저를 초대합니다")
    .addStringOption((opt) =>
      opt.setName("키").setDescription("복구 키 (예: A1B2C3D4E5F6G7H8)").setRequired(true),
    ),
].map((cmd) => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
  try {
    logger.info("Discord 슬래시 커맨드 등록 중...");
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    logger.info("슬래시 커맨드 등록 완료");
  } catch (err) {
    logger.error({ err }, "슬래시 커맨드 등록 실패");
  }
}

async function handleVerificationPanel(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const title = interaction.options.getString("제목") || "Discord 인증";
  const description =
    interaction.options.getString("설명") ||
    "아래 버튼을 클릭하여 인증을 완료하세요.\n인증 후 서버 멤버 역할이 부여됩니다.";

  const authUrl = `${BASE_URL}/?guildId=${guildId}`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .setDescription(description)
    .addFields(
      { name: "인증 방법", value: "아래 버튼을 클릭 → Discord 로그인 → 인증 완료", inline: false },
    )
    .setFooter({ text: "Discord 인증 시스템" })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Discord로 인증하기")
      .setStyle(ButtonStyle.Link)
      .setURL(authUrl)
      .setEmoji("✅"),
  );

  await interaction.reply({ content: "인증 패널을 생성했습니다!", ephemeral: true });

  const channel = interaction.channel as TextChannel;
  await channel.send({ embeds: [embed], components: [row] });
}

async function handleCreateRecoveryKey(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guildId = interaction.guildId!;

  try {
    const res = await fetch(`${BASE_URL}/api/recovery-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guildId }),
    });

    if (!res.ok) {
      await interaction.editReply("복구 키 생성에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    const data = await res.json() as { key: string; guildId: string; createdAt: string };

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("복구 키 생성 완료")
      .setDescription("아래 키를 안전한 곳에 보관하세요.\n서버가 초기화되거나 다른 서버로 이동할 때 사용할 수 있습니다.")
      .addFields(
        { name: "복구 키", value: `\`\`\`${data.key}\`\`\``, inline: false },
        { name: "서버 ID", value: data.guildId, inline: true },
        { name: "생성 시각", value: new Date(data.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }), inline: true },
      )
      .addFields({
        name: "사용 방법",
        value: "`/복구키사용 키:[복구키]` 를 새 서버에서 실행하세요",
        inline: false,
      })
      .setFooter({ text: "이 키는 한 번만 사용 가능합니다. 안전하게 보관하세요!" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "복구 키 생성 오류");
    await interaction.editReply("오류가 발생했습니다. 서버 관리자에게 문의하세요.");
  }
}

async function handleUseRecoveryKey(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const key = interaction.options.getString("키", true).trim().toUpperCase();
  const targetGuildId = interaction.guildId!;

  try {
    const res = await fetch(`${BASE_URL}/api/recovery-keys/${key}/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetGuildId }),
    });

    if (res.status === 404) {
      await interaction.editReply("유효하지 않은 복구 키이거나 이미 사용된 키입니다.");
      return;
    }

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      await interaction.editReply(`복구 실패: ${err.error || "알 수 없는 오류"}`);
      return;
    }

    const data = await res.json() as { invited: number; failed: number; total: number };

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("복구 완료!")
      .setDescription("이전 서버에서 인증된 유저들을 현재 서버에 초대했습니다.")
      .addFields(
        { name: "총 인증 유저", value: `${data.total}명`, inline: true },
        { name: "초대 성공", value: `${data.invited}명`, inline: true },
        { name: "초대 실패", value: `${data.failed}명`, inline: true },
      )
      .addFields({
        name: "안내",
        value: "초대 실패한 유저는 토큰이 만료되었거나 이미 서버에 있는 유저일 수 있습니다.",
        inline: false,
      })
      .setFooter({ text: "Discord 복구 시스템" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "복구 키 사용 오류");
    await interaction.editReply("오류가 발생했습니다. 서버 관리자에게 문의하세요.");
  }
}

export async function startBot() {
  await registerCommands();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.on("ready", () => {
    logger.info({ tag: client.user?.tag }, "Discord 봇 온라인");
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      if (commandName === "인증창") {
        await handleVerificationPanel(interaction as ChatInputCommandInteraction);
      } else if (commandName === "복구키생성") {
        await handleCreateRecoveryKey(interaction as ChatInputCommandInteraction);
      } else if (commandName === "복구키사용") {
        await handleUseRecoveryKey(interaction as ChatInputCommandInteraction);
      }
    } catch (err) {
      logger.error({ err, commandName }, "Command handler error");
      try {
        const reply = interaction.replied || interaction.deferred
          ? interaction.editReply("오류가 발생했습니다.")
          : (interaction as ChatInputCommandInteraction).reply({ content: "오류가 발생했습니다.", ephemeral: true });
        await reply;
      } catch {}
    }
  });

  await client.login(DISCORD_BOT_TOKEN);
}
