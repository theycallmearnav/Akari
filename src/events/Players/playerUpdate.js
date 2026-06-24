const { syncPlaytimeSession } = require("../../utils/playtimeTracker");

const lastPingWarning = new Map();
const PING_WARNING_INTERVAL_MS = 60_000;
const HIGH_PING_MS = 500;

module.exports = {
  name: "playerUpdate",
  run: async (client, player, data) => {
    if (client.voiceHealthMonitor && player.playing) {
      client.voiceHealthMonitor.updateActivity(player.guildId);
    }

    const ping = Number(data?.state?.ping ?? player.shoukaku?.ping ?? 0);
    if (ping > HIGH_PING_MS) {
      const now = Date.now();
      const lastWarning = lastPingWarning.get(player.guildId) || 0;
      if (now - lastWarning > PING_WARNING_INTERVAL_MS) {
        lastPingWarning.set(player.guildId, now);
        client.logger.log(
          `[VoicePing] Guild ${player.guildId} Lavalink voice ping is ${ping}ms`,
          "warn"
        );
      }
    }

    syncPlaytimeSession(client, player);
  },
};
