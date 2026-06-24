const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const jsonConfig = path.join(__dirname, 'config.json');

let config;
try {
  config = require(jsonConfig);
} catch (err) {
  console.error("❌ config.json not found or is invalid!", err.message);
  process.exit(1);
}

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }
  switch (value) {
    case true:
    case "true":
      return true;
    default:
      return false;
  }
}

config.token = process.env.BOT_TOKEN || config.token;
config.SpotifyID = process.env.SPOTIFY_ID || config.SpotifyID;
config.SpotifySecret = process.env.SPOTIFY_SECRET || config.SpotifySecret;
config.LastFmKey = process.env.LASTFM_KEY || config.LastFmKey;
config.LastFmSecret = process.env.LASTFM_SECRET || config.LastFmSecret;

function validateToken(token) {
  if (!token || token === 'YOUR_BOT_TOKEN' || token === 'YOUR_RESET_BOT_TOKEN') {
    console.error('BOT_TOKEN is missing. Put your reset Discord bot token in a .env file at the project root.');
    process.exit(1);
  }

  if (/\s/.test(token)) {
    console.error('BOT_TOKEN contains whitespace. Copy only the token value, with no spaces or line breaks.');
    process.exit(1);
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    console.error('BOT_TOKEN is not in Discord bot token format. Reset the token in the Discord Developer Portal and update .env.');
    process.exit(1);
  }
}

validateToken(config.token);

if (process.env.OWNER_IDS) {
  config.ownerID = process.env.OWNER_IDS.split(',').map((id) => id.trim()).filter(Boolean);
}

if (process.env.SUPPORT_URL) {
  config.links = config.links || {};
  config.links.support = process.env.SUPPORT_URL;
}

const lavalinkHost = process.env.LAVALINK_HOST;
const lavalinkPort = process.env.LAVALINK_PORT;
const lavalinkUrl = process.env.LAVALINK_URL
  || (lavalinkHost ? `${lavalinkHost}${lavalinkPort ? `:${lavalinkPort}` : ''}` : null);
const lavalinkAuth = process.env.LAVALINK_AUTH || process.env.LAVALINK_PASSWORD;

config.nodes = [];

if (lavalinkUrl) {
  config.nodes = [
    {
      name: process.env.LAVALINK_NAME || 'AKARI',
      url: lavalinkUrl,
      auth: lavalinkAuth || '',
      secure: parseBoolean(process.env.LAVALINK_SECURE),
    }
  ];
}

config.parseBoolean = parseBoolean;

module.exports = config;
