const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const musicQueue = require('../../utils/MusicQueue');

module.exports = new ApplicationCommand({
    command: {
        name: 'queue',
        description: 'Shows the current music queue.',
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
        // Vérifier s'il y a une queue active
        const queue = musicQueue.getQueue(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                content: 'There is no music queue active.',
                ephemeral: true
            });
        }

        try {
            const embed = new EmbedBuilder()
                .setTitle('🎵 Music Queue')
                .setColor('#0099ff')
                .setTimestamp();

            // Chanson actuelle
            if (queue.currentSong) {
                embed.addFields({
                    name: '🎵 Currently Playing',
                    value: `**${queue.currentSong.title}**\nRequested by: ${queue.currentSong.requestedBy}`,
                    inline: false
                });
            }

            // Queue
            if (queue.songs.length > 0) {
                let queueList = '';
                const maxSongs = 10; // Limiter à 10 chansons pour éviter les messages trop longs

                for (let i = 0; i < Math.min(queue.songs.length, maxSongs); i++) {
                    const song = queue.songs[i];
                    queueList += `**${i + 1}.** ${song.title}\n*Requested by: ${song.requestedBy}*\n\n`;
                }

                if (queue.songs.length > maxSongs) {
                    queueList += `*... and ${queue.songs.length - maxSongs} more song(s)*`;
                }

                embed.addFields({
                    name: `📝 Up Next (${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''})`,
                    value: queueList || 'No songs in queue',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📝 Up Next',
                    value: 'No songs in queue',
                    inline: false
                });
            }

            // Footer avec des infos utiles
            embed.setFooter({
                text: `Use /play to add songs • /skip to skip • /stop to stop`
            });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error showing queue:', error);
            await interaction.reply({
                content: 'An error occurred while showing the queue.',
                ephemeral: true
            });
        }
    }
}).toJSON();
