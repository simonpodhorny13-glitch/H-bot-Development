function detectMentionSpam(message, raidMode = false) {
  const userMentions = message.mentions.users.size;
  const roleMentions = message.mentions.roles.size;
  const everyoneWeight = message.mentions.everyone ? 3 : 0;
  const total = userMentions + roleMentions + everyoneWeight;
  const limit = raidMode ? 4 : 6;

  if (total >= limit) {
    return {
      reason: `Mention spam (${userMentions} users, ${roleMentions} roles${message.mentions.everyone ? ", plus @everyone/@here" : ""})`
    };
  }

  return null;
}

module.exports = { detectMentionSpam };
