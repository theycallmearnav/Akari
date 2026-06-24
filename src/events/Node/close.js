const { scheduleNodeRecovery } = require("../../utils/nodeUtils");

module.exports = {
  name: "close",
  run: async (client, name, code, reason) => {
    if (code && code.toString().includes('ETIMEDOUT')) {
      scheduleNodeRecovery(client, 5000);
      return;
    }

    client.logger.log(
      `Lavalink ${name}: Closed, Code ${code}, Reason ${reason || "No reason"}`,
      "warn",
    );
    scheduleNodeRecovery(client, 5000);
  },
};
