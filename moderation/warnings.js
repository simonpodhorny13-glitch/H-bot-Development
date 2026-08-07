const db = require("../database");
const { recordModerationCase } = require("./logs");

function getWarningCount(guildId, userId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM warnings
    WHERE guild_id = ? AND user_id = ?
  `).get(guildId, userId);

  return Number(row.count);
}

async function safeDm(user, content) {
  try {
    await user.send(content);
    return true;
  } catch {
    return false;
  }
}

async function addWarning({
  guild,
  target,
  moderatorId,
  moderatorTag = "H-Automod",
  reason,
  source = "Manual warning",
  channelId = null,
  messageId = null
}) {
  db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
    VALUES (?, ?, ?, ?)
  `).run(guild.id, target.id, moderatorId, reason);

  const count = getWarningCount(guild.id, target.id);
  let punishment = "None";
  let action = "Warning";

  if (count === 2) {
    if (target.moderatable) {
      await safeDm(
        target.user,
        `⚠️ You were warned in **${guild.name}**.\n` +
        `Reason: ${reason}\nWarnings: ${count}/6\n` +
        `Automatic action: 10-minute timeout 🔇`
      );

      try {
        await target.timeout(10 * 60 * 1000, `Reached 2 warnings: ${reason}`);
        punishment = "10-minute timeout 🔇";
        action = "Warning + timeout";
      } catch (error) {
        console.error("Timeout failed:", error.message);
        punishment = "Timeout failed";
      }
    } else {
      punishment = "Timeout failed (role hierarchy/permissions)";
    }
  } else if (count === 4) {
    if (target.kickable) {
      await safeDm(
        target.user,
        `⚠️ You reached **${count}/6 warnings** in **${guild.name}**.\n` +
        `Reason: ${reason}\nAutomatic action: You are being kicked 🥾`
      );

      try {
        await target.kick(`Reached 4 warnings: ${reason}`);
        punishment = "Kicked 🥾";
        action = "Warning + kick";
      } catch (error) {
        console.error("Kick failed:", error.message);
        punishment = "Kick failed";
      }
    } else {
      punishment = "Kick failed (role hierarchy/permissions)";
    }
  } else if (count === 6) {
    if (target.bannable) {
      await safeDm(
        target.user,
        `⚠️ You reached **${count}/6 warnings** in **${guild.name}**.\n` +
        `Reason: ${reason}\nAutomatic action: You are being banned 🔨`
      );

      try {
        await target.ban({ reason: `Reached 6 warnings: ${reason}` });
        punishment = "Banned 🔨";
        action = "Warning + ban";
      } catch (error) {
        console.error("Ban failed:", error.message);
        punishment = "Ban failed";
      }
    } else {
      punishment = "Ban failed (role hierarchy/permissions)";
    }
  } else {
    await safeDm(
      target.user,
      `⚠️ You were warned in **${guild.name}**.\n` +
      `Reason: ${reason}\nWarnings: ${count}/6\nNo automatic punishment.`
    );
  }

  const caseId = await recordModerationCase({
    guild,
    userId: target.id,
    moderatorId,
    action,
    detector: source,
    reason: `${reason} | Warnings: ${count}/6 | Punishment: ${punishment}`,
    channelId,
    messageId
  });

  return { count, punishment, caseId, moderatorTag };
}

module.exports = {
  addWarning,
  getWarningCount
};
