const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

const commandGroups = [
  {
    title: "Start",
    commands: [
      ["play", "play a song or playlist"],
      ["search", "search and choose tracks"],
      ["join", "join your voice channel"],
      ["leave", "leave voice"],
      ["247", "toggle 24/7 voice mode"],
    ],
  },
  {
    title: "Playback",
    commands: [
      ["pause", "pause music"],
      ["resume", "resume music"],
      ["skip", "skip current track"],
      ["forceskip", "force skip"],
      ["previous", "play previous track"],
      ["replay", "restart current track"],
      ["stop", "stop and clear player"],
    ],
  },
  {
    title: "Queue",
    commands: [
      ["queue", "show queue"],
      ["clearqueue", "clear queue"],
      ["remove", "remove tracks"],
      ["move", "move bot to you"],
      ["shuffle", "shuffle queue"],
      ["loop", "toggle loop"],
      ["skipto", "jump to queue track"],
      ["leavecleanup", "remove absent users' songs"],
    ],
  },
  {
    title: "Controls",
    commands: [
      ["volume", "change volume"],
      ["seek", "seek to time"],
      ["forward", "fast-forward"],
      ["rewind", "rewind"],
      ["speed", "change playback speed"],
      ["filter", "audio filters"],
      ["sleep", "sleep timer"],
    ],
  },
  {
    title: "Discovery",
    commands: [
      ["autoplay", "toggle autoplay"],
      ["artistradio", "artist radio"],
      ["similar", "similar songs"],
      ["mood", "mood or genre music"],
      ["lyrics", "show lyrics"],
      ["history", "recent tracks"],
      ["nowplaying", "current track"],
      ["grab", "DM current track"],
    ],
  },
  {
    title: "Favourites",
    commands: [
      ["like", "save current track"],
      ["unlike", "remove saved tracks"],
      ["likeall", "save queue"],
      ["showliked", "show saved tracks"],
      ["playliked", "play saved tracks"],
    ],
  },
  {
    title: "Support",
    commands: [
      ["help", "this command summary"],
      ["support", "bot info and links"],
      ["forcefix", "repair stuck player"],
    ],
  },
];

module.exports = {
  name: "help",
  aliases: ["h", "commands"],
  category: "Utility",
  cooldown: 3,
  description: "Show a short summary of all bot commands",
  args: false,
  usage: "",
  userPerms: [],
  botPerms: [],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) {
          return await interaction.editReply(options);
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        }
        await interaction.reply(options);
        return await interaction.fetchReply();
      },
    };

    return this.execute(interactionWrapper, [], client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const commandPrefix = prefix || client.prefix || "!";
    const headerDisplay = new TextDisplayBuilder()
      .setContent(`### AKARI Music Console`);

    const quickStartDisplay = new TextDisplayBuilder()
      .setContent(
        `**Quick startup**\n` +
        `01. Join a voice channel\n` +
        `02. Run \`${commandPrefix}play <song name or link>\` or \`/play\`\n` +
        `03. Use \`${commandPrefix}queue\` to see what is next\n` +
        `04. Control playback with \`${commandPrefix}skip\`, \`${commandPrefix}pause\`, \`${commandPrefix}resume\`, and \`${commandPrefix}stop\``
      );

    const summary = commandGroups.map((group) => {
      const commands = group.commands
        .map(([name, description]) => `\`${name}\` - ${description}`)
        .join("\n");

      return `**${group.title} Deck**\n${commands}`;
    }).join("\n\n");

    const commandsDisplay = new TextDisplayBuilder()
      .setContent(summary);

    const footerDisplay = new TextDisplayBuilder()
      .setContent(`Tip: use \`${commandPrefix}support\` or \`/support\` for bot stats, invite link, and support contact.`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(quickStartDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(commandsDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(footerDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
