const userHistory = new Map();

function getKey(message) {
  return `${message.guild.id}:${message.author.id}`;
}

function normalize(content) {
  return content.trim().toLowerCase().replace(/\s+/g, " ");
}

function detectSpam(message, raidMode = false) {
  const now = Date.now();
  const key = getKey(message);
  const previous = userHistory.get(key) || [];
  const history = previous.filter(entry => now - entry.time <= 15000);

  history.push({
    time: now,
    content: normalize(message.content || "")
  });

  userHistory.set(key, history);

  const rapidWindowMs = 5000;
  const rapidLimit = raidMode ? 5 : 7;
  const rapidCount = history.filter(entry => now - entry.time <= rapidWindowMs).length;

  if (rapidCount >= rapidLimit) {
    return { reason: `Message flood (${rapidCount} messages in ${rapidWindowMs / 1000}s)` };
  }

  const current = normalize(message.content || "");
  if (current.length >= 2) {
    const duplicateLimit = raidMode ? 2 : 3;
    const duplicates = history.filter(entry => entry.content === current).length;

    if (duplicates >= duplicateLimit) {
      return { reason: `Repeated message spam (${duplicates} duplicates)` };
    }
  }

  return null;
}

module.exports = { detectSpam };
