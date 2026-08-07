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

function looksLikeDiscordImpersonation(hostname) {
  if (isTrusted(hostname)) return false;

  const compact = hostname.replace(/[^a-z0-9]/g, "");
  return (
    compact.includes("discord") ||
    compact.includes("nitro") ||
    compact.includes("discordgift")
  );
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
