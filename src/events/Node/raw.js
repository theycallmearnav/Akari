const lastStatsLog = new Map();
const STATS_LOG_INTERVAL_MS = 60_000;

module.exports = {
  name: "raw",
  run: async (client, name, payload) => {
    if (!payload || payload.op !== "stats") {
      return;
    }

    const frameStats = payload.frameStats || {};
    const cpu = payload.cpu || {};
    const deficit = Number(frameStats.deficit) || 0;
    const nulled = Number(frameStats.nulled) || 0;
    const systemLoad = Number(cpu.systemLoad) || 0;
    const lavalinkLoad = Number(cpu.lavalinkLoad) || 0;

    const unhealthy =
      deficit > 0 ||
      nulled > 0 ||
      systemLoad >= 0.85 ||
      lavalinkLoad >= 0.75;

    if (!unhealthy) {
      return;
    }

    const now = Date.now();
    const lastLog = lastStatsLog.get(name) || 0;
    if (now - lastLog < STATS_LOG_INTERVAL_MS) {
      return;
    }

    lastStatsLog.set(name, now);
    client.logger.log(
      `[LavalinkStats] ${name}: players=${payload.playingPlayers}/${payload.players}, ` +
      `systemLoad=${(systemLoad * 100).toFixed(1)}%, ` +
      `lavalinkLoad=${(lavalinkLoad * 100).toFixed(1)}%, ` +
      `frames deficit=${deficit}, nulled=${nulled}`,
      "warn"
    );
  },
};
