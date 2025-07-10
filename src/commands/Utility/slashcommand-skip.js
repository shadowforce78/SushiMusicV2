const { ChatInputCommandInteraction } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const musicQueue = require('../../utils/MusicQueue');

module.exports = new ApplicationCommand({
    command: {
        name: 'skip',
        description: 'Skips the current song and plays the next one in queue.',
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

        if (!queue.isPlaying) {
            return interaction.reply({
                content: 'No song is currently playing to skip.',
                ephemeral: true
            });
        }

        try {
            const currentSong = queue.currentSong;
            const hasNextSong = queue.songs.length > 0;

            if (hasNextSong) {
                await interaction.reply({
                    content: `⏭️ Skipped: **${currentSong ? currentSong.title : 'Current song'}**\nPlaying next song...`,
                    ephemeral: false
                });
                
                await musicQueue.skip(interaction.guild.id);
            } else {
                await interaction.reply({
                    content: `⏭️ Skipped: **${currentSong ? currentSong.title : 'Current song'}**\nNo more songs in queue. Stopping playback.`,
                    ephemeral: false
                });
                
                musicQueue.cleanup(interaction.guild.id);
            }

        } catch (error) {
            console.error('Error skipping song:', error);
            
            // Vérifier si on a déjà répondu à l'interaction
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while trying to skip the song.',
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: 'An error occurred while trying to skip the song.',
                    ephemeral: true
                });
            }
        }
    }
}).toJSON();
