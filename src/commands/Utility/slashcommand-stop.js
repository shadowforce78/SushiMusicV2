const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const musicQueue = require('../../utils/MusicQueue');

module.exports = new ApplicationCommand({
    command: {
        name: 'stop',
        description: 'Stops the current song and disconnects from voice channel.',
        type: 1,
        options: []
    },
    options: {
        cooldown: 3000
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply({
                content: 'You need to be in a voice channel to use this command.',
                ephemeral: true
            });
        }

        // Vérifier s'il y a une queue active
        const queue = musicQueue.getQueue(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                content: 'There is no music currently playing.',
                ephemeral: true
            });
        }

        try {
            const currentSong = queue.currentSong;
            const queueLength = queue.songs.length;

            // Nettoyer tout et arrêter la musique
            musicQueue.cleanup(interaction.guild.id);

            await interaction.reply({
                content: `⏹️ Music stopped and disconnected from voice channel.\n${currentSong ? `Stopped: **${currentSong.title}**\n` : ''}${queueLength > 0 ? `Cleared **${queueLength}** song(s) from queue.` : ''}`,
                ephemeral: false
            });

        } catch (error) {
            console.error('Error stopping music:', error);
            // Vérifier si on a déjà répondu à l'interaction
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while trying to stop the music.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: 'An error occurred while trying to stop the music.',
                    ephemeral: true
                });
            }
        }
    }
}).toJSON();
