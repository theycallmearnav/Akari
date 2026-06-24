module.exports = {
  name: "playerResumed",
  run: async (client, player) => {
    client.logger.log(`Player Resume in @ ${player.guildId}`, "log");

    if (!player.playing && !player.paused) {
      await client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `use **${client.prefix}play** to add songs` },
        })
        .catch(() => null);
    }

    if (client.voiceHealthMonitor) {
      client.voiceHealthMonitor.updateActivity(player.guildId);
    }
  },
};
