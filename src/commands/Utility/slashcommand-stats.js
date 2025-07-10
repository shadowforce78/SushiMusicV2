const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const musicDatabase = require('../../utils/MusicDatabase');

module.exports = new ApplicationCommand({
    command: {
        name: 'stats',
        description: 'Shows music statistics for this server.',
        type: 1,
        options: []
    },
    options: {
        cooldown: 5000
    },
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        try {
            const stats = await musicDatabase.getGuildStats(interaction.guild.id);
            
            if (!stats || stats.totalRequests === 0) {
                return interaction.reply({
                    content: 'No music statistics available for this server yet.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('📊 Music Statistics')
                .setColor('#9932cc')
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            // Statistiques générales
            embed.addFields({
                name: '🎵 General Stats',
                value: `**Songs Played:** ${stats.totalSongsPlayed}\n**Total Requests:** ${stats.totalRequests}\n**Last Activity:** ${stats.lastActivity ? new Date(stats.lastActivity).toLocaleString() : 'Never'}`,
                inline: false
            });

            // Top requesters
            if (stats.topRequesters && Object.keys(stats.topRequesters).length > 0) {
                const sortedRequesters = Object.entries(stats.topRequesters)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);

                let topRequestersText = '';
                sortedRequesters.forEach(([user, count], index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                    topRequestersText += `${medal} **${user}** - ${count} request${count !== 1 ? 's' : ''}\n`;
                });

                embed.addFields({
                    name: '🏆 Top Requesters',
                    value: topRequestersText || 'No data available',
                    inline: false
                });
            }

            // Footer
            embed.setFooter({
                text: `Server: ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL()
            });

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error showing stats:', error);
            await interaction.reply({
                content: 'An error occurred while retrieving statistics.',
                ephemeral: true
            });
        }
    }
}).toJSON();
