const { scheduleNodeRecovery } = require("../../utils/nodeUtils");

module.exports = {
  name: "disconnect",
  run: async (client, name, reconnectsLeft) => {
    client.logger.log(
      `Lavalink ${name}: Disconnected. Reconnect attempts left: ${reconnectsLeft}`,
      "warn"
    );
    scheduleNodeRecovery(client, 5000);
  },
};
