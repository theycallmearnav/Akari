const LISTENER_SESSION_KEY = "playtimeSession";

function getHumanListenerIds(client, player) {
    const guild = client.guilds.cache.get(player.guildId);
    const voiceChannel = guild?.channels.cache.get(player.voiceId);

    if (!voiceChannel?.members) {
        return [];
    }

    return voiceChannel.members
        .filter((member) => !member.user.bot)
        .map((member) => member.id);
}

function isPlayerActivelyAudible(player) {
    if (!player) return false;
    if (!player.queue?.current) return false;
    if (player.paused || player.shoukaku?.paused) return false;
    return Boolean(player.playing);
}

function getSession(player) {
    return player.data?.get(LISTENER_SESSION_KEY) || null;
}

function setSession(player, session) {
    player.data?.set(LISTENER_SESSION_KEY, session);
}

function clearSession(player) {
    player.data?.delete(LISTENER_SESSION_KEY);
}

function commitSession(client, player, now = Date.now()) {
    const session = getSession(player);
    if (!session) {
        return;
    }

    const elapsedMs = now - session.startedAt;
    if (elapsedMs >= 1000 && session.userIds.length > 0) {
        try {
            client.db.playtime.addSession(player.guildId, session.userIds, elapsedMs);
        } catch (error) {
            client.logger?.log(`[Playtime] Failed to save session in ${player.guildId}: ${error.message}`, "error");
        }
    }

    clearSession(player);
}

function syncPlaytimeSession(client, player, options = {}) {
    if (!player?.data) {
        return;
    }

    const now = options.now || Date.now();
    const active = options.active ?? isPlayerActivelyAudible(player);
    const listenerIds = active ? getHumanListenerIds(client, player).sort() : [];
    const session = getSession(player);
    const sessionUserKey = session?.userIds.join(",");
    const listenerKey = listenerIds.join(",");

    if (session && (!active || listenerIds.length === 0 || sessionUserKey !== listenerKey)) {
        commitSession(client, player, now);
    }

    if (active && listenerIds.length > 0 && !getSession(player)) {
        setSession(player, {
            startedAt: now,
            userIds: listenerIds
        });
    }
}

function stopPlaytimeSession(client, player) {
    if (!player?.data) {
        return;
    }

    commitSession(client, player, Date.now());
}

module.exports = {
    syncPlaytimeSession,
    stopPlaytimeSession,
};
