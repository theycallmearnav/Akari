const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "playerResolveError",
  run: async (client, player, track, message) => {
    try {
      client.logger.log(
        `Player resolve error in ${player.guildId}: ${track?.title || "Unknown track"}${message ? ` - ${message}` : ""}`,
        "error"
      );

      const channel = client.channels.cache.get(player.textId);
      if (!channel) return;

      const display = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} I couldn't load \`${track?.title || "this track"}\`.**\n` +
          `**${client.emoji.info} Try another source or a direct song link.**`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(display);

      await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    } catch (error) {
      console.error("Error in playerResolveError handler:", error);
    }
  },
};
