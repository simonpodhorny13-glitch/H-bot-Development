const db = require("../database");
const { addWarning } = require("../moderation/warnings");
const { recordModerationCase } = require("../moderation/logs");

function getStrikeTtlSeconds() {
  const minutes = Number(process.env.AUTOMOD_STRIKE_TTL_MINUTES || 30);
  return Math.max(1, minutes) * 60;
}

function getCurrentStrikes(guildId, userId) {
  const row = db.prepare(`
    SELECT strikes, updated_at
    FROM automod_strikes
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);

  if (!row) return 0;

  const age = Math.floor(Date.now() / 1000) - row.updated_at;
  if (age > getStrikeTtlSeconds()) return 0;

  return Number(row.strikes);
}

function setStrikes(guildId, userId, strikes) {
  db.prepare(`
    INSERT INTO automod_strikes (guild_id, user_id, strikes, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(guild_id, user_id)
    DO UPDATE SET strikes = excluded.strikes, updated_at = excluded.updated_at
  `).run(guildId, userId, strikes);
}

async function safeDm(user, content) {
  try {
    await user.send(content);
  } catch {
    console.log(`Could not DM AutoMod user ${user.tag}.`);
  }
}

async function addAutoModStrike(message, detector, reason) {
  const current = getCurrentStrikes(message.guild.id, message.author.id);
  const next = current + 1;

  if (next >= 2) {
    setStrikes(message.guild.id, message.author.id, 0);

    const result = await addWarning({
      guild: message.guild,
      target: message.member,
      moderatorId: message.client.user.id,
      moderatorTag: "H-Automod",
      reason: `${detector}: ${reason}`,
      source: `H-Automod • ${detector}`,
      channelId: message.channel.id,
      messageId: message.id
    });

    return {
      strikes: 0,
      warningAdded: true,
      warningCount: result.count,
      punishment: result.punishment
    };
  }

  setStrikes(message.guild.id, message.author.id, next);

  await safeDm(
    message.author,
    `🛡️ H-Automod removed one of your messages in **${message.guild.name}**.\n` +
    `Reason: ${detector} — ${reason}\nAutoMod strikes: ${next}/2\n` +
    `Two AutoMod strikes result in one warning.`
  );

  await recordModerationCase({
    guild: message.guild,
    userId: message.author.id,
    moderatorId: message.client.user.id,
    action: "Message deleted + AutoMod strike",
    detector,
    reason: `${reason} | AutoMod strikes: ${next}/2`,
    channelId: message.channel.id,
    messageId: message.id
  });

  return {
    strikes: next,
    warningAdded: false,
    warningCount: null,
    punishment: "None"
  };
}

module.exports = {
  addAutoModStrike,
  getCurrentStrikes
};
