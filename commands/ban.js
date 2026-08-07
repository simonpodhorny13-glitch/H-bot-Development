const { PermissionFlagsBits } = require("discord.js");
const { recordModerationCase } = require("../moderation/logs");

module.exports = {
  name: "ban",

  async execute(message, args) {
    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply("❌ You don't have permission to ban members.");
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("Usage: `!ban @user <reason>`");
    }

    if (target.user.bot) {
      return message.reply("❌ You can't ban a bot.");
    }

    if (target.id === message.author.id) {
      return message.reply("❌ You can't ban yourself 😭");
    }

    if (
      message.guild.ownerId !== message.author.id &&
      message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0
    ) {
      return message.reply("❌ You can't ban a member with an equal or higher role.");
    }

    if (!target.bannable) {
      return message.reply("❌ I can't ban that member. Check my role position and permissions.");
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided";

    try {
      await target.user.send(
        `🔨 You were banned from **${message.guild.name}**.\n` +
        `Reason: ${reason}\n` +
        `Moderator: ${message.author.tag}`
      );
    } catch {
      console.log(`Could not DM banned user ${target.user.tag}.`);
    }

    await target.ban({ reason: `${reason} | Moderator: ${message.author.tag}` });

    const caseId = await recordModerationCase({
      guild: message.guild,
      userId: target.id,
      moderatorId: message.author.id,
      action: "Ban",
      detector: "Manual moderation",
      reason,
      channelId: message.channel.id,
      messageId: message.id
    });

    await message.channel.send(
      `🔨 **${target.user.tag}** was banned by **${message.author.tag}**.\n` +
      `Reason: ${reason}\nCase: **#${caseId}**`
    );
  }
};
