const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const { getInviteUrl, getSupportUrl } = require("../../utils/publicLinks");

const FALLBACK_SUPPORT_URL = "https://discord.com/invite/K4R8dUBEB4";

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

async function getBotStats(client) {
  return {
    guilds: client.guilds.cache.size,
    members: client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0),
  };
}

module.exports = {
  name: "support",
  aliases: ["sup", "invite"],
  category: "Utility",
  cooldown: 5,
  description: "Show bot stats, support details, invite, and support links",
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
    const stats = await getBotStats(client);
    const commandPrefix = prefix || client.prefix || "!";
    const inviteUrl = getInviteUrl(client.user.id);
    const supportUrl = getSupportUrl(client.config) || FALLBACK_SUPPORT_URL;

    const headerDisplay = new TextDisplayBuilder()
      .setContent(`### AKARI Support Desk`);

    const statsDisplay = new TextDisplayBuilder()
      .setContent(
        `**Live Coverage:** \`${formatNumber(stats.guilds)} servers\`\n` +
        `**Total Members:** \`${formatNumber(stats.members)}\`\n` +
        `**Prefix:** \`${commandPrefix}\`\n` +
        `**Playback Core:** \`Lavalink / Kazagumo\`\n` +
        `**Command Mode:** \`Music only\``
      );

    const quickStartDisplay = new TextDisplayBuilder()
      .setContent(
        `**Quick startup**\n` +
        `01. Join a voice channel\n` +
        `02. Run \`${commandPrefix}play <song>\` or \`/play\`\n` +
        `03. Use \`${commandPrefix}help\` for the command map\n` +
        `04. If playback gets stuck, run \`${commandPrefix}forcefix\``
      );

    const supportDisplay = new TextDisplayBuilder()
      .setContent(
        `**Support brief**\n` +
        `For faster help, send your server name, the command you used, what you expected, and the exact error text if one appeared.\n\n` +
        `Common fixes: check Connect/Speak permissions, use a normal voice channel, retry with a direct song link, or run \`${commandPrefix}forcefix\` for a stuck player.`
      );

    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Invite")
          .setStyle(ButtonStyle.Link)
          .setURL(inviteUrl),
        new ButtonBuilder()
          .setLabel("Support")
          .setStyle(ButtonStyle.Link)
          .setURL(supportUrl)
      );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(headerDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(statsDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(quickStartDisplay)
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(supportDisplay)
      .addActionRowComponents(buttonRow);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
