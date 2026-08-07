const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const OWNER_ID = "1535282595963600926";
const INVITE_URL = "https://discord.com/oauth2/authorize?client_id=1522251057302995004&permissions=2147699728&integration_type=0&scope=applications.commands+bot";

module.exports = {
  name: "invite",

  async execute(message) {
    if (message.author.id !== OWNER_ID) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite H bot")
        .setStyle(ButtonStyle.Link)
        .setURL(INVITE_URL)
    );

    await message.channel.send({
      content: "Want H bot in your server? Click the button below to invite it!",
      components: [row]
    });
  }
};
