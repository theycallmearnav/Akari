const { REST, Routes, PermissionsBitField } = require("discord.js");
const { getPublicCommandMode, isPublicCommand } = require("../../utils/publicCommands");
const { startNodeHealthMonitor, ensureNodeConnection } = require("../../utils/nodeUtils");

function startEventLoopMonitor(client) {
  if (client.eventLoopMonitor) {
    return;
  }

  const intervalMs = 1000;
  let expected = Date.now() + intervalMs;

  client.eventLoopMonitor = setInterval(() => {
    const now = Date.now();
    const delay = now - expected;
    expected = now + intervalMs;

    if (delay > 250) {
      client.logger.log(`[Perf] Event loop delayed by ${delay}ms`, "warn");
    }
  }, intervalMs);
}

module.exports = {
  name: "clientReady",
  run: async (client) => {
    client.logger.log(`${client.user.username} is now online.`, "ready");

    const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
    const rebootData = client.db.reboot.getAll()[0];
    if (rebootData) {
      client.db.reboot.delete(rebootData.id);
      const channel = client.channels.cache.get(rebootData.channelId);
      if (channel) {
        try {
          const msg = await channel.messages.fetch(rebootData.messageId);
          if (msg) {
            const restartedContainer = new ContainerBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${client.emoji.check} Bot has been successfully restarted.**`));

            await msg.edit({
              components: [restartedContainer],
              flags: MessageFlags.IsComponentsV2
            });
          }
        } catch (e) { }
      }
    }

    client.logger.log(
      `Ready on ${client.guilds.cache.size} servers, for a total of ${client.users.cache.size} users`,
      "ready",
    );

    if (client.slashCommands.size > 0) {
      const rest = new REST({ version: "10" }).setToken(client.token);
      try {
        const publicCommandMode = getPublicCommandMode(client);
        const commands = Array.from(client.slashCommands.values())
          .filter((cmd) => isPublicCommand(cmd, publicCommandMode))
          .map((cmd) => {
            const commandData = {
              name: cmd.name,
              description: cmd.description,
              options: cmd.options || [],
            };

            if (cmd.userPerms && cmd.userPerms.length > 0) {
              try {
                commandData.default_member_permissions = PermissionsBitField.resolve(cmd.userPerms).toString();
              } catch (e) {
                console.error(`Error resolving perms for ${cmd.name}:`, e);
              }
            }

            return commandData;
          });

        client.logger.log(`Deploying ${commands.length} public slash commands...`, "cmd");

        await rest.put(Routes.applicationCommands(client.user.id), {
          body: commands,
        });

        client.logger.log(`Successfully deployed ${commands.length} public slash commands.`, "cmd");
      } catch (error) {
        console.error("Error deploying slash commands:", error);
      }
    } else {
      console.log("\nWARNING: No slash commands to deploy! client.slashCommands.size = 0\n");
    }

    client.user.setPresence({
      activities: [],
      status: "dnd",
    });

    startEventLoopMonitor(client);
    startNodeHealthMonitor(client);
    ensureNodeConnection(client, { maxWaitTime: 10_000 }).catch((error) => {
      client.logger.log(`[Lavalink] Initial recovery check failed: ${error.message}`, "error");
    });
  },
};
