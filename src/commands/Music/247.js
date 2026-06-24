const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "247",
  aliases: ["24/7", "twentyfourseven"],
  category: "Music",
  cooldown: 3,
  description: "Enable, disable, or check 24/7 voice mode",
  botPerms: ["EmbedLinks", "Connect", "Speak"],
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [
    {
      name: "mode",
      description: "Choose whether 24/7 mode should be enabled or disabled",
      type: 3,
      required: false,
      choices: [
        { name: "on", value: "on" },
        { name: "off", value: "off" },
        { name: "status", value: "status" }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    const mode = interaction.options.getString("mode");
    const wrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      reply: async (options) => {
        if (interaction.deferred) return interaction.editReply(options);
        if (interaction.replied) return interaction.followUp(options);
        return interaction.reply(options);
      }
    };

    return this.execute(wrapper, mode ? [mode] : [], client, client.prefix);
  },

  async execute(message, args, client, prefix) {
    const mode = (args[0] || "status").toLowerCase();
    const guildId = message.guild.id;
    const current = client.db.twofourseven.get(guildId);

    if (["off", "disable", "disabled", "false"].includes(mode)) {
      if (!current) {
        return reply(message, client, `**${client.emoji.info} 24/7 mode is already disabled.**`);
      }

      client.db.twofourseven.delete(guildId);
      return reply(message, client, `**${client.emoji.check} 24/7 mode has been disabled.**`);
    }

    if (["on", "enable", "enabled", "true"].includes(mode)) {
      const voiceChannel = message.member?.voice?.channel;
      if (!voiceChannel) {
        return reply(message, client, `**${client.emoji.warn} Join a voice channel first, then run \`${prefix}247 on\`.**`);
      }

      client.db.twofourseven.set(guildId, {
        voiceId: voiceChannel.id,
        textId: message.channel.id
      });

      const player = client.manager.players.get(guildId);
      if (player && player.voiceId !== voiceChannel.id) {
        await player.setVoiceChannel(voiceChannel.id);
      }

      return reply(
        message,
        client,
        `**${client.emoji.check} 24/7 mode is now enabled in <#${voiceChannel.id}>.**`
      );
    }

    if (current) {
      return reply(
        message,
        client,
        `**${client.emoji.info} 24/7 mode is enabled in <#${current.voiceId}>.**\n` +
        `**${client.emoji.info} Use \`${prefix}247 off\` or \`${prefix}leave\` to disable it.**`
      );
    }

    return reply(
      message,
      client,
      `**${client.emoji.info} 24/7 mode is disabled.**\n` +
      `**${client.emoji.info} Use \`${prefix}247 on\` to enable it.**`
    );
  },
};

function reply(message, client, content) {
  const display = new TextDisplayBuilder().setContent(content);
  const container = new ContainerBuilder().addTextDisplayComponents(display);

  return message.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  }).catch(() =>
    message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    })
  );
}
