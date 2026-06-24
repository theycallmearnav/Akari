const fs = require("fs");
const path = require("path");

const musicCommandFolders = new Set(["Music", "Favourite", "Filters", "Utility"]);
const musicCommandCategories = new Set(["Music", "Favourite", "Filters", "Utility"]);

const legacyPermissionNames = {
  ADD_REACTIONS: "AddReactions",
  ATTACH_FILES: "AttachFiles",
  CONNECT: "Connect",
  EMBED_LINKS: "EmbedLinks",
  READ_MESSAGE_HISTORY: "ReadMessageHistory",
  SEND_MESSAGES: "SendMessages",
  SPEAK: "Speak",
  VIEW_CHANNEL: "ViewChannel",
};

function normalizePerms(perms) {
  if (!perms) return perms;
  const list = Array.isArray(perms) ? perms : [perms];
  return list.map((perm) => typeof perm === "string" ? (legacyPermissionNames[perm] || perm) : perm);
}

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");
  let totalCommands = 0;

  fs.readdirSync(commandsPath).forEach((dir) => {
    if (!musicCommandFolders.has(dir)) return;

    const commandFiles = fs
      .readdirSync(path.join(commandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, dir, file));

      if (!musicCommandCategories.has(command.category)) continue;

      command.botPerms = normalizePerms(command.botPerms || command.botPrams);
      command.userPerms = normalizePerms(command.userPerms || command.userPrams);

      client.commands.set(command.name, command);
      if (command.aliases && Array.isArray(command.aliases)) {
        command.aliases.forEach((alias) => client.aliases.set(alias, command.name));
      } else if (command.aliases) {
        client.aliases.set(command.aliases, command.name);
      }

      if (command.slashExecute || command.slashOptions) {
        const slashData = {
          name: command.name,
          description: command.description || "No description provided",
          options: command.slashOptions || [],
          category: command.category,
          execute: command.execute,
          slashExecute: command.slashExecute,
          autocomplete: command.autocomplete,
          run: command.run,
          player: command.player,
          inVoiceChannel: command.inVoiceChannel,
          sameVoiceChannel: command.sameVoiceChannel,
          botPerms: command.botPerms,
          userPerms: command.userPerms,
          rank: command.rank,
          owner: command.owner || false,
        };

        client.slashCommands.set(command.name, slashData);
      }

      totalCommands++;
    }
  });

  client.logger.log(`Prefix Commands Loaded: ${totalCommands}`, "cmd");
  client.logger.log(`Slash Commands Loaded: ${client.slashCommands.size}`, "cmd");
};
