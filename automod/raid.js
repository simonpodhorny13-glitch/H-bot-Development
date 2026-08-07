const { recordModerationCase } = require("../moderation/logs");

const messageBursts = new Map();
const joinBursts = new Map();
const raidUntil = new Map();

const MESSAGE_WINDOW_MS = 10000;
const MESSAGE_UNIQUE_USERS = 10;
const JOIN_WINDOW_MS = 10000;
const JOIN_LIMIT = 6;
const RAID_DURATION_MS = 5 * 60 * 1000;

function isRaidMode(guildId) {
  const until = raidUntil.get(guildId) || 0;
  if (until <= Date.now()) {
    raidUntil.delete(guildId);
    return false;
  }
  return true;
}

async function activateRaidMode(guild, reason) {
  const alreadyActive = isRaidMode(guild.id);
  raidUntil.set(guild.id, Date.now() + RAID_DURATION_MS);

  if (!alreadyActive) {
    await recordModerationCase({
      guild,
      userId: null,
      moderatorId: "AUTOMOD",
      action: "Raid mode activated",
      detector: "Raid protection",
      reason
    });
  }
}

async function registerMessage(message) {
  const now = Date.now();
  const guildId = message.guild.id;
  const previous = messageBursts.get(guildId) || [];
  const recent = previous.filter(entry => now - entry.time <= MESSAGE_WINDOW_MS);

  recent.push({ time: now, userId: message.author.id });
  messageBursts.set(guildId, recent);

  const uniqueUsers = new Set(recent.map(entry => entry.userId)).size;

  if (uniqueUsers >= MESSAGE_UNIQUE_USERS) {
    await activateRaidMode(
      message.guild,
      `${uniqueUsers} unique users sent messages within ${MESSAGE_WINDOW_MS / 1000} seconds.`
    );
  }

  return isRaidMode(guildId);
}

async function registerJoin(member) {
  const now = Date.now();
  const guildId = member.guild.id;
  const previous = joinBursts.get(guildId) || [];
  const recent = previous.filter(time => now - time <= JOIN_WINDOW_MS);
  recent.push(now);
  joinBursts.set(guildId, recent);

  if (recent.length >= JOIN_LIMIT) {
    await activateRaidMode(
      member.guild,
      `${recent.length} members joined within ${JOIN_WINDOW_MS / 1000} seconds.`
    );
  }
}

module.exports = {
  isRaidMode,
  registerMessage,
  registerJoin
};
