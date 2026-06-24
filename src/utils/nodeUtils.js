
const CONNECTING = 0;
const CONNECTED = 1;
const DISCONNECTED = 3;
const RECOVERY_COOLDOWN_MS = 30_000;
const HEALTH_INTERVAL_MS = 60_000;
const CONNECTING_STALE_MS = 45_000;

const recoveryState = new WeakMap();

function getManager(target) {
    if (target?.shoukaku) return target;
    if (target?.manager?.shoukaku) return target.manager;
    return null;
}

function getClient(target) {
    return target?.manager?.shoukaku ? target : null;
}

function getShoukaku(target) {
    return getManager(target)?.shoukaku || null;
}

function getNodeConfigs(target) {
    const client = getClient(target);
    const nodes = client?.config?.nodes;

    if (!Array.isArray(nodes)) {
        return [];
    }

    return nodes
        .filter((node) => node?.name && node?.url && typeof node.auth === "string")
        .map((node) => ({
            name: node.name,
            url: node.url,
            auth: node.auth,
            secure: Boolean(node.secure),
            group: node.group,
        }));
}

function log(target, message, level = "warn") {
    const client = getClient(target);
    if (client?.logger?.log) {
        client.logger.log(message, level);
        return;
    }
    console.log(message);
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNodeConnection(manager, maxWaitTime = 5000) {
    const resolvedManager = getManager(manager);
    if (!resolvedManager?.shoukaku) return false;

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        if (hasAvailableNodes(resolvedManager)) {
            return true;
        }

        await wait(250);
    }

    return hasAvailableNodes(resolvedManager);
}

function hasAvailableNodes(manager) {
    const shoukaku = getShoukaku(manager);
    if (!shoukaku?.nodes) return false;

    return [...shoukaku.nodes.values()].some((node) => node.state === CONNECTED);
}

function getAvailableNode(manager) {
    const resolvedManager = getManager(manager);
    const shoukaku = resolvedManager?.shoukaku;
    if (!shoukaku?.nodes) return null;

    const idealNode = shoukaku.getIdealNode?.();
    if (idealNode?.state === CONNECTED) {
        return idealNode;
    }

    const nodes = [...shoukaku.nodes.values()].filter((node) => node.state === CONNECTED);
    return nodes.length > 0 ? nodes[0] : null;
}

function hasFreshConnectingNode(manager) {
    const shoukaku = getShoukaku(manager);
    if (!shoukaku?.nodes) return false;
    const state = recoveryState.get(getManager(manager)) || {};
    const connectingSince = state.connectingSince || new Map();
    state.connectingSince = connectingSince;
    recoveryState.set(getManager(manager), state);
    const now = Date.now();

    let hasFreshNode = false;
    for (const node of shoukaku.nodes.values()) {
        if (node.state === CONNECTING) {
            if (!connectingSince.has(node.name)) {
                connectingSince.set(node.name, now);
            }
            if (now - connectingSince.get(node.name) < CONNECTING_STALE_MS) {
                hasFreshNode = true;
            }
        } else {
            connectingSince.delete(node.name);
        }
    }

    return hasFreshNode;
}

function resetStaleConnectingNodes(target, state) {
    const shoukaku = getShoukaku(target);
    if (!shoukaku?.nodes) return;

    const connectingSince = state.connectingSince || new Map();
    state.connectingSince = connectingSince;
    const now = Date.now();

    for (const node of [...shoukaku.nodes.values()]) {
        if (node.state !== CONNECTING) {
            connectingSince.delete(node.name);
            continue;
        }

        const since = connectingSince.get(node.name) || now;
        connectingSince.set(node.name, since);
        if (now - since < CONNECTING_STALE_MS) {
            continue;
        }

        log(target, `[Lavalink] Resetting stale connecting node "${node.name}".`, "warn");
        try {
            node.disconnect(1000, "Stale Lavalink reconnect");
        } catch {
        }
        shoukaku.nodes.delete(node.name);
        connectingSince.delete(node.name);
    }
}

async function recoverNodes(target, options = {}) {
    const manager = getManager(target);
    const shoukaku = manager?.shoukaku;
    if (!manager || !shoukaku?.nodes) return false;

    if (hasAvailableNodes(manager)) {
        return true;
    }

    const state = recoveryState.get(manager) || {};
    const now = Date.now();
    const cooldownMs = options.cooldownMs ?? RECOVERY_COOLDOWN_MS;

    if (state.promise) {
        return state.promise;
    }

    if (!options.force && state.lastAttempt && now - state.lastAttempt < cooldownMs) {
        return false;
    }

    const promise = (async () => {
        const nodeConfigs = getNodeConfigs(target);
        state.lastAttempt = Date.now();
        resetStaleConnectingNodes(target, state);

        if (nodeConfigs.length === 0 && shoukaku.nodes.size === 0) {
            log(target, "[Lavalink] No configured nodes found for recovery.", "error");
            return false;
        }

        for (const nodeConfig of nodeConfigs) {
            if (!shoukaku.nodes.has(nodeConfig.name)) {
                log(target, `[Lavalink] Re-adding missing node "${nodeConfig.name}" from config.`, "warn");
                try {
                    shoukaku.addNode(nodeConfig);
                } catch (error) {
                    log(target, `[Lavalink] Failed to re-add node "${nodeConfig.name}": ${error.message}`, "error");
                }
            }
        }

        for (const node of shoukaku.nodes.values()) {
            if (node.state === CONNECTED || node.state === CONNECTING) {
                continue;
            }

            if (node.state === DISCONNECTED) {
                log(target, `[Lavalink] Attempting reconnect for node "${node.name}".`, "warn");
            }

            node.connect().catch((error) => {
                log(target, `[Lavalink] Reconnect failed for node "${node.name}": ${error.message}`, "error");
            });
        }

        return waitForNodeConnection(manager, options.maxWaitTime ?? 10_000);
    })();

    state.promise = promise;
    recoveryState.set(manager, state);

    promise.finally(() => {
        const current = recoveryState.get(manager);
        if (current?.promise === promise) {
            current.promise = null;
            recoveryState.set(manager, current);
        }
    });

    return promise;
}

async function ensureNodeConnection(target, options = {}) {
    const manager = getManager(target);
    if (!manager?.shoukaku) return false;

    if (hasAvailableNodes(manager)) {
        return true;
    }

    if (!hasFreshConnectingNode(manager)) {
        recoverNodes(target, options).catch((error) => {
            log(target, `[Lavalink] Node recovery error: ${error.message}`, "error");
        });
    }

    if (options.wait === false) {
        return hasAvailableNodes(manager);
    }

    return waitForNodeConnection(manager, options.maxWaitTime ?? 10_000);
}

function scheduleNodeRecovery(target, delayMs = 5000) {
    setTimeout(() => {
        ensureNodeConnection(target, {
            force: true,
            wait: false,
            maxWaitTime: 1000,
        }).catch((error) => {
            log(target, `[Lavalink] Scheduled recovery failed: ${error.message}`, "error");
        });
    }, delayMs).unref?.();
}

function startNodeHealthMonitor(client) {
    if (!client || client.nodeHealthMonitor) {
        return;
    }

    client.nodeHealthMonitor = setInterval(() => {
        ensureNodeConnection(client, {
            wait: false,
            maxWaitTime: 1000,
        }).catch((error) => {
            log(client, `[Lavalink] Health monitor recovery failed: ${error.message}`, "error");
        });
    }, HEALTH_INTERVAL_MS);

    client.nodeHealthMonitor.unref?.();
}

module.exports = {
    waitForNodeConnection,
    hasAvailableNodes,
    getAvailableNode,
    ensureNodeConnection,
    scheduleNodeRecovery,
    startNodeHealthMonitor,
};
