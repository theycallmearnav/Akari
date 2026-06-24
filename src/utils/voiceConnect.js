const { EmbedBuilder } = require('discord.js');

async function updateVoiceChannel() {
    return undefined;
}

module.exports = {
    connectToVoice: async function (player, message, client) {
        try {
            const is247 = client.db.twofourseven.get(message.guild.id);

            if (player.connected && player.voiceId === message.member.voice.channel.id) {
                return true;
            }

            if (player.connected && player.voiceId !== message.member.voice.channel.id) {
                if (is247) {
                    throw new Error('Bot is in 24/7 mode. Please join the bot\'s voice channel');
                }

                await player.setVoiceChannel(message.member.voice.channel.id);
                return true;
            }

            if (!player.connected) {
                try {
                    await player.connect();

                    if (is247) {
                        client.db.twofourseven.set(message.guild.id, {
                            textId: message.channel.id,
                            voiceId: message.member.voice.channel.id
                        });
                    }
                } catch (err) {
                    console.error('Connection error:', err);
                    throw new Error('Failed to establish connection');
                }
            }

            if (!player.connected) {
                throw new Error('Failed to establish connection');
            }

            return true;
        } catch (error) {
            console.error('Voice connection error:', error);

            await message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(client.color)
                        .setDescription(`-# **${client.emoji.cross} ${error.message}**`)
                ]
            });

            throw error;
        }
    },
    updateVoiceChannel
};
