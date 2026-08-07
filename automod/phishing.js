const { domainToASCII } = require("url");

let confirmedDomains = [];

try {
  confirmedDomains = require("./phishingDomains");
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
  console.warn("H-Automod: automod/phishingDomains.js not found; confirmed phishing blocklist is empty.");
}

const TRUSTED_DOMAINS = new Set([
  "discord.com",
  "discord.gg",
  "discordapp.com",
  "discord.gift",
  "discordstatus.com"
]);

function isSameOrSubdomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function normalizeHostname(hostname) {
  const ascii = domainToASCII(hostname.toLowerCase().replace(/\.$/, ""));
  return ascii || hostname.toLowerCase();
}

function extractHostnames(content) {
  if (!content) return [];

  const matches = content.match(
    /(?:https?:\/\/[^\s<>()]+|(?:www\.)?[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s<>()]*)?)/gi
  ) || [];

  const hosts = [];

  for (let raw of matches) {
    raw = raw.replace(/[),.!?;:'"\]}]+$/g, "");

    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      hosts.push(normalizeHostname(url.hostname));
    } catch {
      // Ignore malformed URLs.
    }
  }

  return [...new Set(hosts)];
}

function isTrusted(hostname) {
  return [...TRUSTED_DOMAINS].some(domain => isSameOrSubdomain(hostname, domain));
}

function isConfirmed(hostname) {
  return confirmedDomains
    .filter(domain => typeof domain === "string" && domain.trim())
    .map(domain => normalizeHostname(domain.trim()))
    .some(domain => isSameOrSubdomain(hostname, domain));
}

function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => []);

  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return rows[a.length][b.length];
}

function looksLikeDiscordImpersonation(hostname) {
  if (isTrusted(hostname)) return false;

  const labels = hostname.split(".").filter(Boolean);
  const brandLabels = labels.slice(0, -1);

  for (const label of brandLabels) {
    const compact = label.replace(/[^a-z0-9]/g, "");

    if (compact === "discord") return true;
    if (compact.length >= 5 && compact.length <= 9 && editDistance(compact, "discord") <= 2) {
      return true;
    }

    if (compact.includes("nitro") && compact.includes("gift")) {
      return true;
    }
  }

  return false;
}

function detectPhishing(content) {
  const hostnames = extractHostnames(content);

  for (const hostname of hostnames) {
    if (isTrusted(hostname)) continue;

    if (isConfirmed(hostname)) {
      return { type: "confirmed", hostname };
    }

    if (looksLikeDiscordImpersonation(hostname)) {
      return { type: "suspicious", hostname };
    }
  }

  return null;
}

module.exports = {
  detectPhishing,
  extractHostnames,
  isTrusted
};
