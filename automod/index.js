const { detectProfanity } = require("./profanity");
const { detectPhishing } = require("./phishing");
const { detectZalgo } = require("./zalgo");
const { detectSpam } = require("./spam");
const { detectMentionSpam } = require("./mentions");
const { addAutoModStrike } = require("./strikes");
const { registerMessage, isRaidMode } = require("./raid");
const { recordModerationCase } = require("../moderation/logs");

const processedContent = new Map();

function rememberMessage(message) {
  const content = message.content || "";
  if (processedContent.get(message.id) === content) return false;

  processedContent.set(message.id, content);

  if (processedContent.size > 5000) {
    const oldest = processedContent.keys().next().value;
    processedContent.delete(oldest);
  }

  return true;
}

async function safeDelete(message) {
  try {
    if (message.deletable) {
      await message.delete();
      return true;
    }
  } catch (error) {
    console.error("AutoMod could not delete message:", error.message);
  }

  return false;
}

async function safeDm(user, content) {
  try {
    await user.send(content);
    return true;
  } catch {
    return false;
  }
}

async function handlePhishing(message, result) {
  await safeDelete(message);

  if (result.type === "confirmed") {
    await safeDm(
      message.author,
      `🚨 H-Automod detected a confirmed phishing domain in a message you posted in **${message.guild.name}**.\n` +
      `The message was removed and you are being banned.`
    );

    let action = "Confirmed phishing deleted; ban failed";
    let reason = `Confirmed phishing hostname: ${result.hostname}`;

    if (message.member?.bannable) {
      try {
        await message.member.ban({ reason: `H-Automod confirmed phishing: ${result.hostname}` });
        action = "Confirmed phishing deleted + user banned";
      } catch (error) {
        reason += ` | Ban error: ${error.message}`;
      }
    } else {
      reason += " | User was not bannable (role hierarchy/permissions).";
    }

    await recordModerationCase({
      guild: message.guild,
      userId: message.author.id,
      moderatorId: message.client.user.id,
      action,
      detector: "Phishing protection",
      reason,
      channelId: message.channel.id,
      messageId: message.id
    });

    return true;
  }

  await safeDm(
    message.author,
    `🛡️ H-Automod removed a suspicious link you posted in **${message.guild.name}**.\n` +
    `The domain looked like a Discord/Nitro impersonation and was sent to moderators for review.`
  );

  await recordModerationCase({
    guild: message.guild,
    userId: message.author.id,
    moderatorId: message.client.user.id,
    action: "Suspicious link removed for review",
    detector: "Phishing protection",
    reason: `Suspicious hostname: ${result.hostname}`,
    channelId: message.channel.id,
    messageId: message.id
  });

  return true;
}

async function punishFilteredMessage(message, detector, reason) {
  await safeDelete(message);
  await addAutoModStrike(message, detector, reason);
  return true;
}

async function handleMessage(message, { edited = false } = {}) {
  if (!message.guild || !message.author || message.author.bot) return false;
  if (!message.content?.trim()) return false;
  if (!rememberMessage(message)) return false;

  await registerMessage(message);
  const raidMode = isRaidMode(message.guild.id);

  const phishing = detectPhishing(message.content);
  if (phishing) {
    return handlePhishing(message, phishing);
  }

  const profanity = detectProfanity(message.content);
  if (profanity) {
    return punishFilteredMessage(
      message,
      "Profanity filter",
      edited ? "Filtered profanity detected after message edit" : "Filtered profanity detected"
    );
  }

  const zalgo = detectZalgo(message.content);
  if (zalgo) {
    return punishFilteredMessage(
      message,
      "Zalgo text",
      `Excessive Unicode combining marks (${zalgo.combiningMarks})`
    );
  }

  const mentions = detectMentionSpam(message, raidMode);
  if (mentions) {
    return punishFilteredMessage(message, "Mention spam", mentions.reason);
  }

  const spam = detectSpam(message, raidMode);
  if (spam) {
    return punishFilteredMessage(message, "Spam", spam.reason);
  }

  return false;
}

module.exports = {
  handleMessage
};
