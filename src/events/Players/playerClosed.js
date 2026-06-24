const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playerClosed",
  run: async (client, player, data) => {
    try {
      client.logger.log(
        `Voice websocket closed in ${player.guildId}: code=${data?.code || "unknown"} reason=${data?.reason || "none"}`,
        "error"
      );

      const channel = client.channels.cache.get(player.textId);
      if (!channel) return;

      const display = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Voice connection closed.**\n` +
          `**${client.emoji.info} Run \`${client.prefix}play <song>\` again if playback does not recover.**`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(display);

      await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    } catch (error) {
      console.error("Error in playerClosed handler:", error);
    }
  },
};
