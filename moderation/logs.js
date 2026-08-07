const { EmbedBuilder } = require("discord.js");
const db = require("../database");

function trim(text, max = 900) {
  const value = String(text ?? "Unknown");
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

async function sendModLog(guild, data) {
  const configuredId = process.env.MOD_LOG_CHANNEL_ID;
  const channel =
    (configuredId && guild.channels.cache.get(configuredId)) ||
    guild.channels.cache.find(ch => ch.name === "mod-logs" && ch.isTextBased());

  if (!channel?.isTextBased()) {
    console.log(
      `[MOD LOG] ${data.action} | user=${data.userId || "SYSTEM"} | ${data.reason}`
    );
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🛡️ H-Automod • Case #${data.caseId}`)
    .addFields(
      { name: "Action", value: trim(data.action, 200), inline: true },
      { name: "User", value: data.userId ? `<@${data.userId}>` : "System", inline: true },
      { name: "Detector", value: trim(data.detector || "Manual moderation", 200), inline: true },
      { name: "Reason", value: trim(data.reason) }
    )
    .setTimestamp();

  if (data.channelId) {
    embed.addFields({ name: "Channel", value: `<#${data.channelId}>`, inline: true });
  }

  if (data.messageId) {
    embed.addFields({ name: "Message ID", value: data.messageId, inline: true });
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Failed to send mod log:", error.message);
  }
}

async function recordModerationCase({
  guild,
  userId = null,
  moderatorId = "AUTOMOD",
  action,
  detector = null,
  reason,
  channelId = null,
  messageId = null
}) {
  const result = db.prepare(`
    INSERT INTO moderation_cases (
      guild_id, user_id, moderator_id, action, detector, reason, channel_id, message_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    guild.id,
    userId,
    moderatorId,
    action,
    detector,
    reason,
    channelId,
    messageId
  );

  const caseId = Number(result.lastInsertRowid);

  await sendModLog(guild, {
    caseId,
    userId,
    action,
    detector,
    reason,
    channelId,
    messageId
  });

  return caseId;
}

module.exports = {
  recordModerationCase,
  sendModLog
};
