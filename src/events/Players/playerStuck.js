const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const { stopPlaytimeSession } = require("../../utils/playtimeTracker");

module.exports = {
  name: "playerStuck",
  run: async (client, player, data) => {
    try {
      stopPlaytimeSession(client, player);

      const track = player.queue?.current;
      client.logger.log(
        `Player stuck in ${player.guildId}: ${track?.title || "Unknown track"} (${data?.thresholdMs || "unknown"}ms)`,
        "error"
      );

      const channel = client.channels.cache.get(player.textId);
      if (channel) {
        const display = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.warn} Playback got stuck.**\n` +
            `**${client.emoji.info} Skipping to the next track...**`
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(display);

        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => null);
      }

      if (player.queue?.length > 0) {
        await player.skip();
      } else {
        await player.destroy().catch(() => null);
      }
    } catch (error) {
      console.error("Error in playerStuck handler:", error);
    }
  },
};
