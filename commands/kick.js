const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "kick",

  async execute(message, args) {
    if (!message.guild || !message.member) return;

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.reply("❌ You don't have permission to kick members.");
    }

    const target = message.mentions.members.first();
    if (!target) {
      return message.reply("Usage: `!kick @user <reason>`");
    }

    if (target.user.bot) {
      return message.reply("❌ You can't kick a bot.");
    }

    if (target.id === message.author.id) {
      return message.reply("❌ You can't kick yourself 😭");
    }

    if (!target.kickable) {
      return message.reply("❌ I can't kick that member. Check my role position and permissions.");
    }

    const reason = args.slice(1).join(" ").trim() || "No reason provided";

    try {
      await target.user.send(
        `🥾 You were kicked from **${message.guild.name}**.\n` +
        `Reason: ${reason}\n` +
        `Moderator: ${message.author.tag}`
      );
    } catch (error) {
      console.log(`Could not DM kicked user ${target.user.tag}.`);
    }

    await target.kick(`${reason} | Moderator: ${message.author.tag}`);

    await message.channel.send(
      `🥾 **${target.user.tag}** was kicked by **${message.author.tag}**.\n` +
      `Reason: ${reason}`
    );
  }
};
