require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { handleMessage } = require("./automod");
const { registerJoin } = require("./automod/raid");

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
];

const joinRaidDetection = process.env.ENABLE_JOIN_RAID_DETECTION === "true";
if (joinRaidDetection) {
  intents.push(GatewayIntentBits.GuildMembers);
}

const client = new Client({
  intents,
  partials: [Partials.Message, Partials.Channel]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));

    if (command.name && command.execute) {
      client.commands.set(command.name, command);
      console.log(`Loaded command: ${command.name}`);
    }
  }
}

async function handleCommand(message) {
  const prefix = "!";
  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return false;

  const command = client.commands.get(commandName);
  if (!command) return false;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error("Command error:", error);
    try {
      await message.reply("❌ Something went wrong.");
    } catch {}
  }

  return true;
}

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  if (await handleCommand(message)) return;

  try {
    await handleMessage(message);
  } catch (error) {
    console.error("H-Automod error:", error);
  }
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  try {
    if (newMessage.partial) {
      newMessage = await newMessage.fetch();
    }

    if (!newMessage.guild || newMessage.author?.bot) return;
    await handleMessage(newMessage, { edited: true });
  } catch (error) {
    console.error("H-Automod edit scan error:", error);
  }
});

if (joinRaidDetection) {
  client.on("guildMemberAdd", async member => {
    try {
      await registerJoin(member);
    } catch (error) {
      console.error("Raid join detector error:", error);
    }
  });
}

client.once("clientReady", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log("🛡️ H-Automod is active");
  console.log(`🚨 Join-based raid detection: ${joinRaidDetection ? "ON" : "OFF"}`);
});

client.login(process.env.TOKEN);
