const { PermissionFlagsBits } = require("discord.js");
const { addWarning } = require("../moderation/warnings");

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

    if (
      message.guild.ownerId !== message.author.id &&
      message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0
    ) {
      return message.reply("❌ You can't warn a member with an equal or higher role.");
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided";

    const result = await addWarning({
      guild: message.guild,
      target,
      moderatorId: message.author.id,
      moderatorTag: message.author.tag,
      reason,
      source: "Manual warning",
      channelId: message.channel.id,
      messageId: message.id
    });

    await message.channel.send(
      `⚠️ ${target.user.tag} was warned by ${message.author.tag}.\n` +
      `Reason: ${reason}\n` +
      `Warnings: **${result.count}/6**\n` +
      `Punishment: **${result.punishment}**\n` +
      `Case: **#${result.caseId}**`
    );
  }
};
