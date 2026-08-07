const { PermissionFlagsBits } = require("discord.js");
const db = require("../database");

module.exports = {
  name: "warn",

  async execute(message, args) {
    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.reply("❌ You don't have permission to warn members.");
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("Usage: `!warn @user <reason>`");
    }

    if (target.user.bot) {
      return message.reply("❌ You can't warn a bot.");
    }

    if (target.id === message.author.id) {
      return message.reply("❌ You can't warn yourself 😭");
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided";

    db.prepare(`
      INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
      VALUES (?, ?, ?, ?)
    `).run(message.guild.id, target.id, message.author.id, reason);

    const { count } = db.prepare(`
      SELECT COUNT(*) AS count
      FROM warnings
      WHERE guild_id = ? AND user_id = ?
    `).get(message.guild.id, target.id);

    let punishment = "None";

    try {
      if (count === 2) {
        if (!target.moderatable) {
          punishment = "10-minute timeout failed (check bot role/permissions)";
        } else {
          await target.timeout(10 * 60 * 1000, `Reached 2 warnings: ${reason}`);
          punishment = "10-minute timeout 🔇";
        }
      } else if (count === 4) {
        if (!target.kickable) {
          punishment = "Kick failed (check bot role/permissions)";
        } else {
          await target.kick(`Reached 4 warnings: ${reason}`);
          punishment = "Kicked 🥾";
        }
      } else if (count === 6) {
        if (!target.bannable) {
          punishment = "Ban failed (check bot role/permissions)";
        } else {
          await target.ban({ reason: `Reached 6 warnings: ${reason}` });
          punishment = "Banned 🔨";
        }
      }
    } catch (error) {
      console.error("Auto-punishment failed:", error);
      punishment = "Automatic punishment failed";
    }

    await message.channel.send(
      `⚠️ ${target.user.tag} was warned by ${message.author.tag}.\n` +
      `Reason: ${reason}\n` +
      `Warnings: **${count}/6**\n` +
      `Punishment: **${punishment}**`
    );
  }
};
