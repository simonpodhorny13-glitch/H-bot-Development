let bannedWords = [];

try {
  bannedWords = require("./bannedwords");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  console.warn("H-Automod: automod/bannedwords.js not found; profanity filter is disabled.");
}

function normalizeToken(token) {
  return token
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(?<=[a-z0-9])[._-](?=[a-z0-9])/g, "")
    .replace(/(?<=[a-z])!(?=[a-z])/g, "i")
    .replace(/@/g, "a")
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/[1|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function normalizedBannedWords() {
  return new Set(
    bannedWords
      .filter(word => typeof word === "string" && word.trim())
      .map(word => normalizeToken(word.trim()))
      .filter(Boolean)
  );
}

function detectProfanity(content) {
  if (!content || bannedWords.length === 0) return null;

  const list = normalizedBannedWords();
  const tokens = content.split(/\s+/).map(normalizeToken).filter(Boolean);
  const match = tokens.find(token => list.has(token));

  return match ? { matched: true } : null;
}

module.exports = {
  detectProfanity,
  normalizeToken
};
